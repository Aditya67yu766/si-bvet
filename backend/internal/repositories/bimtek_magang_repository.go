package repositories

import (
	"errors"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

var ErrBimtekMagangApplicationStateConflict = errors.New("bimtek/magang application state conflict")

func CreateBimtekMagangApplication(application *models.BimtekMagangApplication) error {
	return db.DB.Create(application).Error
}

func GetBimtekMagangApplicationsByUser(userID uint) ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Where("user_id = ?", userID).
		Order("id DESC").
		Find(&applications).Error
	for i := range applications {
		applications[i].ReplyLetterAvailable = applications[i].ReplyLetter != ""
	}
	return applications, err
}

func GetAllBimtekMagangApplications() ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Preload("User", func(query *gorm.DB) *gorm.DB {
		return query.Select("id", "fullname", "email", "phone", "institution")
	}).Order("id DESC").Find(&applications).Error
	for i := range applications {
		applications[i].ReplyLetterAvailable = applications[i].ReplyLetter != ""
	}
	return applications, err
}

func GetBimtekMagangApplicationByID(id uint) (*models.BimtekMagangApplication, error) {
	var application models.BimtekMagangApplication
	if err := db.DB.First(&application, id).Error; err != nil {
		return nil, err
	}
	return &application, nil
}

func DeleteBimtekMagangApplication(id uint) error {
	result := db.DB.Delete(&models.BimtekMagangApplication{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func ReviewBimtekMagangApplication(id uint, verified bool, note string, reviewedAt time.Time) error {
	status := "Berkas Tidak Terverifikasi"
	if verified {
		status = "Berkas Terverifikasi"
	}
	result := db.DB.Model(&models.BimtekMagangApplication{}).
		Where("id = ? AND status = ?", id, "Menunggu Verifikasi").
		Updates(map[string]interface{}{
			"status":      status,
			"review_note": note,
			"reviewed_at": reviewedAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := db.DB.Model(&models.BimtekMagangApplication{}).Where("id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return gorm.ErrRecordNotFound
		}
		return ErrBimtekMagangApplicationStateConflict
	}
	return nil
}

func VerifyBimtekMagangApplicationWithReplyLetter(id uint, filePath string, reviewedAt time.Time) error {
	result := db.DB.Model(&models.BimtekMagangApplication{}).
		Where("id = ? AND status = ?", id, "Menunggu Verifikasi").
		Updates(map[string]interface{}{
			"status":        "Surat Balasan Terkirim",
			"review_note":   "",
			"reviewed_at":   reviewedAt,
			"reply_letter":  filePath,
			"reply_sent_at": reviewedAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := db.DB.Model(&models.BimtekMagangApplication{}).Where("id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return gorm.ErrRecordNotFound
		}
		return ErrBimtekMagangApplicationStateConflict
	}
	return nil
}

func SendBimtekMagangReplyLetter(id uint, filePath string, sentAt time.Time) error {
	result := db.DB.Model(&models.BimtekMagangApplication{}).
		Where("id = ? AND status = ?", id, "Berkas Terverifikasi").
		Updates(map[string]interface{}{
			"status":        "Surat Balasan Terkirim",
			"reply_letter":  filePath,
			"reply_sent_at": sentAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := db.DB.Model(&models.BimtekMagangApplication{}).Where("id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return gorm.ErrRecordNotFound
		}
		return ErrBimtekMagangApplicationStateConflict
	}
	return nil
}

func GetBimtekMagangReplyLetterByUser(id, userID uint) (*models.BimtekMagangApplication, error) {
	var application models.BimtekMagangApplication
	err := db.DB.Where("id = ? AND user_id = ? AND reply_letter <> ''", id, userID).
		First(&application).Error
	if err != nil {
		return nil, err
	}
	return &application, nil
}
