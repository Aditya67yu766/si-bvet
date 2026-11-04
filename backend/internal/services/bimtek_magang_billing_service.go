package services

import (
	"errors"
	"strings"
	"time"

	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func BimtekMagangTariff(durationDays int) (int64, error) {
	switch {
	case durationDays >= 1 && durationDays <= 7:
		return 200000, nil
	case durationDays <= 14 && durationDays >= 8:
		return 300000, nil
	case durationDays <= 30 && durationDays >= 15:
		return 500000, nil
	case durationDays <= 90 && durationDays >= 31:
		return 1000000, nil
	default:
		return 0, errors.New("durasi magang/penelitian harus antara 1 dan 90 hari")
	}
}

func CreateBimtekMagangBilling(applicationID uint, ebillingCode string) error {
	ebillingCode = strings.TrimSpace(ebillingCode)
	if ebillingCode == "" {
		return errors.New("kode e-billing wajib diisi")
	}
	if len(ebillingCode) > 100 {
		return errors.New("kode e-billing maksimal 100 karakter")
	}

	application, err := repositories.GetBimtekMagangApplicationByID(applicationID)
	if err != nil {
		return err
	}
	if application.RequestType != "magang" || application.StartDate == nil || application.EndDate == nil {
		return errors.New("tanggal magang/penelitian belum lengkap")
	}

	startDate := time.Date(application.StartDate.Year(), application.StartDate.Month(), application.StartDate.Day(), 0, 0, 0, 0, time.UTC)
	endDate := time.Date(application.EndDate.Year(), application.EndDate.Month(), application.EndDate.Day(), 0, 0, 0, 0, time.UTC)
	durationDays := int(endDate.Sub(startDate).Hours()/24) + 1
	amount, err := BimtekMagangTariff(durationDays)
	if err != nil {
		return err
	}

	return repositories.CreateBimtekMagangBilling(&models.BimtekMagangBilling{
		ApplicationID: applicationID,
		EBillingCode:  ebillingCode,
		DurationDays:  durationDays,
		TotalAmount:   amount,
		PaymentStatus: "unpaid",
		IssuedAt:      time.Now(),
	})
}

func UploadBimtekMagangPaymentProof(applicationID, userID uint, proofPath string) error {
	return repositories.UploadBimtekMagangPaymentProof(applicationID, userID, proofPath)
}

func ValidateBimtekMagangPaymentUpload(applicationID, userID uint) error {
	return repositories.ValidateBimtekMagangPaymentUpload(applicationID, userID)
}

func VerifyBimtekMagangPayment(applicationID uint) error {
	return repositories.VerifyBimtekMagangPayment(applicationID, time.Now())
}

func RejectBimtekMagangPayment(applicationID uint) error {
	return repositories.RejectBimtekMagangPayment(applicationID)
}

func GetBimtekMagangPaymentProof(applicationID uint) (string, error) {
	return repositories.GetBimtekMagangPaymentProof(applicationID)
}
