package db

import (
	"fmt"
	"log"
	"os"
	"si-bvet/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() error {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			return err
		}

		DB = db

		// Auto migrate models
		err = DB.AutoMigrate(
			&models.User{},
			&models.Admin{},
			&models.Customer{},
			&models.Notification{},
			&models.Submission{},
			&models.SubmissionSampleTemplate{},
			&models.Sample{},
			&models.Billing{},
			&models.LhuDocument{},
			&models.Feedback{},
			&models.FeedbackAnswer{},
			&models.FeedbackQuestion{},
			&models.Complaint{},
			&models.TestService{},
			&models.TestRequest{},
			&models.ActivityLog{},
			&models.BimtekMagangApplication{},
		)
		if err != nil {
			return err
		}

		log.Println("Database connected & automigrate success")
		return nil
	}

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	DB = db

	// Auto migrate models
	err = DB.AutoMigrate(
		&models.User{},
		&models.Admin{},
		&models.Customer{},
		&models.Notification{},
		&models.Submission{},
		&models.SubmissionSampleTemplate{},
		&models.Sample{},
		&models.Billing{},
		&models.LhuDocument{},
		&models.Feedback{},
		&models.FeedbackAnswer{},
		&models.FeedbackQuestion{},
		&models.Complaint{},
		&models.TestService{},
		&models.TestRequest{},
		&models.ActivityLog{},
		&models.BimtekMagangApplication{},
	)
	if err != nil {
		return err
	}

	log.Println("Database connected & automigrate success")
	return nil

}
