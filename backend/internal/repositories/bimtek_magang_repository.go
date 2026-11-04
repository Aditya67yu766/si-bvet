package repositories

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrBimtekMagangApplicationStateConflict = errors.New("bimtek/magang application state conflict")
var ErrBimtekMagangApplicationHasBilling = errors.New("bimtek/magang application has an issued billing")

func CreateBimtekMagangApplication(application *models.BimtekMagangApplication) error {
	return db.DB.Create(application).Error
}

func GetBimtekMagangApplicationsByUser(userID uint) ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Where("user_id = ?", userID).
		Order("id DESC").
		Find(&applications).Error
	if err != nil {
		return nil, err
	}
	return applications, AttachBimtekMagangBillings(applications)
}

func GetAllBimtekMagangApplications() ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Preload("User", func(query *gorm.DB) *gorm.DB {
		return query.Select("id", "fullname", "email", "phone", "institution")
	}).Order("id DESC").Find(&applications).Error
	if err != nil {
		return nil, err
	}
	return applications, AttachBimtekMagangBillings(applications)
}

func GetBimtekMagangApplicationByID(id uint) (*models.BimtekMagangApplication, error) {
	var application models.BimtekMagangApplication
	if err := db.DB.First(&application, id).Error; err != nil {
		return nil, err
	}
	return &application, nil
}

func DeleteBimtekMagangApplication(id uint) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var billingCount int64
		if err := tx.Model(&models.BimtekMagangBilling{}).Where("application_id = ?", id).Count(&billingCount).Error; err != nil {
			return err
		}
		if billingCount > 0 {
			return ErrBimtekMagangApplicationHasBilling
		}
		result := tx.Delete(&models.BimtekMagangApplication{}, id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}

func DeleteBimtekMagangApplicationWithAudit(
	id, actorID uint,
	actorRole, reason, ipAddress, method, endpoint string,
) ([]string, error) {
	var fileLocations []string
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var application models.BimtekMagangApplication
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&application, id).Error; err != nil {
			return err
		}

		var actor models.User
		if err := tx.First(&actor, actorID).Error; err != nil {
			return err
		}
		if actor.Role != actorRole || !actor.IsActive || (actorRole != "admin" && actorRole != "superadmin") {
			return ErrBimtekMagangDeleteActorNotAuthorized
		}

		var billing models.BimtekMagangBilling
		billingErr := tx.Where("application_id = ?", id).First(&billing).Error
		if billingErr != nil && !errors.Is(billingErr, gorm.ErrRecordNotFound) {
			return billingErr
		}

		fileLocations = uniqueBimtekMagangFileLocations(application, billing, billingErr == nil)
		if len(fileLocations) > 0 {
			var otherApplications int64
			if err := tx.Model(&models.BimtekMagangApplication{}).
				Where("id <> ? AND (identity_document IN ? OR request_letter IN ? OR proposal_document IN ? OR reply_letter IN ?)",
					id, fileLocations, fileLocations, fileLocations, fileLocations).
				Count(&otherApplications).Error; err != nil {
				return err
			}
			var otherBillings int64
			if err := tx.Model(&models.BimtekMagangBilling{}).
				Where("application_id <> ? AND proof_payment IN ?", id, fileLocations).
				Count(&otherBillings).Error; err != nil {
				return err
			}
			if otherApplications > 0 || otherBillings > 0 {
				return ErrBimtekMagangApplicationFilesShared
			}
		}

		billingStatus := "none"
		amount := int64(0)
		if billingErr == nil {
			billingStatus = billing.PaymentStatus
			amount = billing.TotalAmount
			result := tx.Where("application_id = ?", id).Delete(&models.BimtekMagangBilling{})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return fmt.Errorf("expected one billing record to be deleted, got %d", result.RowsAffected)
			}
		}

		result := tx.Delete(&application)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}

		cleanReason := strings.Join(strings.Fields(reason), " ")
		activity := fmt.Sprintf(
			"Penghapusan permanen pengajuan BIMTEK/Magang #%d (jenis=%s, status=%s, status_tagihan=%s, nominal_tagihan=%d). Alasan: %s",
			id, application.RequestType, application.Status, billingStatus, amount, cleanReason,
		)
		actorName := strings.TrimSpace(actor.FullName)
		if actorName == "" {
			actorName = actor.Email
		}
		logEntry := models.ActivityLog{
			Timestamp: time.Now(),
			Actor:     actorName,
			ActorID:   &actor.ID,
			Role:      actor.Role,
			Activity:  activity,
			IPAddress: ipAddress,
			Method:    method,
			Endpoint:  endpoint,
		}
		return tx.Create(&logEntry).Error
	})
	if err != nil {
		return nil, err
	}
	return fileLocations, nil
}

var ErrBimtekMagangDeleteActorNotAuthorized = errors.New("admin is not authorized to delete bimtek/magang applications")
var ErrBimtekMagangApplicationFilesShared = errors.New("bimtek/magang application files are referenced by other records")

func uniqueBimtekMagangFileLocations(application models.BimtekMagangApplication, billing models.BimtekMagangBilling, hasBilling bool) []string {
	locations := make([]string, 0, 5)
	seen := make(map[string]struct{}, 5)
	add := func(location string) {
		location = strings.TrimSpace(location)
		if location == "" {
			return
		}
		if _, exists := seen[location]; exists {
			return
		}
		seen[location] = struct{}{}
		locations = append(locations, location)
	}

	add(application.IdentityDocument)
	add(application.RequestLetter)
	add(application.ProposalDocument)
	add(application.ReplyLetter)
	if hasBilling {
		add(billing.ProofPayment)
	}
	return locations
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
