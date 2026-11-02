package services

import (
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

type BimtekMagangApplicationInput struct {
	RequestType      string
	Topic            string
	StartDate        *time.Time
	EndDate          *time.Time
	IdentityDocument string
	RequestLetter    string
	ProposalDocument string
}

func CreateBimtekMagangApplication(userID uint, input BimtekMagangApplicationInput) (*models.BimtekMagangApplication, error) {
	application := &models.BimtekMagangApplication{
		UserID:           userID,
		RequestType:      input.RequestType,
		Topic:            input.Topic,
		StartDate:        input.StartDate,
		EndDate:          input.EndDate,
		IdentityDocument: input.IdentityDocument,
		RequestLetter:    input.RequestLetter,
		ProposalDocument: input.ProposalDocument,
		Status:           "Menunggu Verifikasi",
	}
	if err := repositories.CreateBimtekMagangApplication(application); err != nil {
		return nil, err
	}
	return application, nil
}

func GetBimtekMagangApplicationsByUser(userID uint) ([]models.BimtekMagangApplication, error) {
	return repositories.GetBimtekMagangApplicationsByUser(userID)
}

func GetAllBimtekMagangApplications() ([]models.BimtekMagangApplication, error) {
	return repositories.GetAllBimtekMagangApplications()
}

func GetBimtekMagangApplicationByID(id uint) (*models.BimtekMagangApplication, error) {
	return repositories.GetBimtekMagangApplicationByID(id)
}
