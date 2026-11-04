package services

import (
	"errors"
	"fmt"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"

	"gorm.io/gorm"
)

func CreateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string, now time.Time) error {
	if now.IsZero() {
		now = time.Now()
	}

	// cek apakah billing sudah ada untuk submission ini
	exists, _ := repositories.IsBillingExists(submissionID)
	if exists {
		return errors.New("billing already exists for this submission")
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		billing := models.Billing{
			SubmissionID:  submissionID,
			EBillingCode:  code,
			TotalAmount:   amount,
			PaymentStatus: "unpaid",
			IssuedAt:      &now,
		}

		if err := tx.Create(&billing).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Submission{}).
			Where("id = ?", submissionID).
			Updates(map[string]interface{}{
				"no_registration": noRegistration,
				"no_epi":          noEpi,
				"process_status":  "awaiting_payment",
			}).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	NotifySubmissionStatusChanged(submissionID, "awaiting_payment")
	LogSystemActivity(fmt.Sprintf("Billing dibuat untuk submission ID %d dengan kode %s", submissionID, code))
	return nil
}

func GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	return repositories.GetBillingBySubmissionID(submissionID)
}

func UpdateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string) error {
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Billing{}).
			Where("submission_id = ?", submissionID).
			Updates(map[string]interface{}{
				"ebilling_code": code,
				"total_amount":  amount,
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Submission{}).
			Where("id = ?", submissionID).
			Updates(map[string]interface{}{
				"no_registration": noRegistration,
				"no_epi":          noEpi,
			}).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}
	LogSystemActivity(fmt.Sprintf("Billing diperbarui untuk submission ID %d dengan kode %s", submissionID, code))
	return nil
}

func UploadBillingProof(submissionID uint, proofPath string) error {
	err := repositories.UploadBillingProof(submissionID, proofPath)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Bukti pembayaran diunggah untuk submission ID %d di path: %s", submissionID, proofPath))
	}
	return err
}

// function untuk memverifikasi pembayaran
func VerifyPayment(submissionID uint) error {

	now := time.Now()

	err := repositories.MarkAsPaid(submissionID, now)
	if err != nil {
		return err
	}

	if err := UpdateSubmissionStatusWithNotification(submissionID, "processed"); err != nil {
		return err
	}

	NotifyPaymentSuccess(submissionID)
	LogSystemActivity(fmt.Sprintf("Pembayaran untuk submission ID %d berhasil diverifikasi", submissionID))
	return nil
}

// function untuk menolak pembayaran
func RejectPayment(submissionID uint) error {
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// Kosongkan bukti pembayaran dan set status kembali ke unpaid
		billingResult := tx.Model(&models.Billing{}).
			Where("submission_id = ?", submissionID).
			Updates(map[string]interface{}{
				"proof_payment":  nil,
				"payment_status": "unpaid",
			})
		if billingResult.Error != nil {
			return billingResult.Error
		}
		if billingResult.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}

		submissionResult := tx.Model(&models.Submission{}).
			Where("id = ?", submissionID).
			Update("process_status", "payment_rejected")
		if submissionResult.Error != nil {
			return submissionResult.Error
		}
		if submissionResult.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if err == nil {
		NotifySubmissionStatusChanged(submissionID, "payment_rejected")
		LogSystemActivity(fmt.Sprintf("Pembayaran untuk submission ID %d ditolak", submissionID))
	}
	return err
}
