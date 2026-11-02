package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateBimtekMagangApplication(application *models.BimtekMagangApplication) error {
	return db.DB.Create(application).Error
}

func GetBimtekMagangApplicationsByUser(userID uint) ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Where("user_id = ?", userID).
		Order("id DESC").
		Find(&applications).Error
	return applications, err
}

func GetAllBimtekMagangApplications() ([]models.BimtekMagangApplication, error) {
	var applications []models.BimtekMagangApplication
	err := db.DB.Preload("User", func(query *gorm.DB) *gorm.DB {
		return query.Select("id", "fullname", "email", "phone", "institution")
	}).Order("id DESC").Find(&applications).Error
	return applications, err
}

func GetBimtekMagangApplicationByID(id uint) (*models.BimtekMagangApplication, error) {
	var application models.BimtekMagangApplication
	if err := db.DB.First(&application, id).Error; err != nil {
		return nil, err
	}
	return &application, nil
}
