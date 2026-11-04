package repositories

import (
	"errors"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

var ErrBimtekMagangPaymentStateConflict = errors.New("bimtek/magang payment state conflict")

func ValidateBimtekMagangPaymentUpload(applicationID, userID uint) error {
	var application models.BimtekMagangApplication
	if err := db.DB.Where("id = ? AND user_id = ?", applicationID, userID).First(&application).Error; err != nil {
		return err
	}
	if application.RequestType != "magang" || application.Status != "Menunggu Pembayaran" {
		return ErrBimtekMagangPaymentStateConflict
	}
	var billing models.BimtekMagangBilling
	if err := db.DB.Where("application_id = ?", applicationID).First(&billing).Error; err != nil {
		return err
	}
	if billing.PaymentStatus != "unpaid" && billing.PaymentStatus != "rejected" {
		return ErrBimtekMagangPaymentStateConflict
	}
	return nil
}

func CreateBimtekMagangBilling(billing *models.BimtekMagangBilling) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var application models.BimtekMagangApplication
		if err := tx.First(&application, billing.ApplicationID).Error; err != nil {
			return err
		}
		if application.RequestType != "magang" || application.Status != "Menunggu Verifikasi" {
			return ErrBimtekMagangPaymentStateConflict
		}

		if err := tx.Create(billing).Error; err != nil {
			return err
		}
		updated := tx.Model(&models.BimtekMagangApplication{}).
			Where("id = ? AND status = ?", billing.ApplicationID, "Menunggu Verifikasi").
			Update("status", "Menunggu Pembayaran")
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected == 0 {
			return ErrBimtekMagangPaymentStateConflict
		}
		return nil
	})
}

func UploadBimtekMagangPaymentProof(applicationID, userID uint, proofPath string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var application models.BimtekMagangApplication
		if err := tx.Where("id = ? AND user_id = ?", applicationID, userID).First(&application).Error; err != nil {
			return err
		}
		if application.RequestType != "magang" || application.Status != "Menunggu Pembayaran" {
			return ErrBimtekMagangPaymentStateConflict
		}

		result := tx.Model(&models.BimtekMagangBilling{}).
			Where("application_id = ? AND payment_status IN ?", applicationID, []string{"unpaid", "rejected"}).
			Updates(map[string]interface{}{
				"proof_payment":  proofPath,
				"payment_status": "awaiting_verification",
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrBimtekMagangPaymentStateConflict
		}
		return nil
	})
}

func VerifyBimtekMagangPayment(applicationID uint, paidAt time.Time) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&models.BimtekMagangBilling{}).
			Where("application_id = ? AND payment_status = ? AND proof_payment <> ''",
				applicationID, "awaiting_verification").
			Updates(map[string]interface{}{
				"payment_status": "paid",
				"paid_at":        paidAt,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrBimtekMagangPaymentStateConflict
		}

		applicationResult := tx.Model(&models.BimtekMagangApplication{}).
			Where("id = ? AND request_type = ? AND status = ?",
				applicationID, "magang", "Menunggu Pembayaran").
			Update("status", "Berkas Terverifikasi")
		if applicationResult.Error != nil {
			return applicationResult.Error
		}
		if applicationResult.RowsAffected == 0 {
			return ErrBimtekMagangPaymentStateConflict
		}
		return nil
	})
}

func RejectBimtekMagangPayment(applicationID uint) error {
	result := db.DB.Model(&models.BimtekMagangBilling{}).
		Where("application_id = ? AND payment_status = ? AND proof_payment <> ''",
			applicationID, "awaiting_verification").
		Update("payment_status", "rejected")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrBimtekMagangPaymentStateConflict
	}
	return nil
}

func GetBimtekMagangPaymentProof(applicationID uint) (string, error) {
	var billing models.BimtekMagangBilling
	if err := db.DB.Where("application_id = ?", applicationID).First(&billing).Error; err != nil {
		return "", err
	}
	if billing.ProofPayment == "" {
		return "", gorm.ErrRecordNotFound
	}
	return billing.ProofPayment, nil
}

func AttachBimtekMagangBillings(applications []models.BimtekMagangApplication) error {
	if len(applications) == 0 {
		return nil
	}

	applicationIDs := make([]uint, len(applications))
	for i := range applications {
		applicationIDs[i] = applications[i].ID
	}

	var billings []models.BimtekMagangBilling
	if err := db.DB.Where("application_id IN ?", applicationIDs).Find(&billings).Error; err != nil {
		return err
	}
	billingsByApplicationID := make(map[uint]*models.BimtekMagangBilling, len(billings))
	for i := range billings {
		billings[i].ProofAvailable = billings[i].ProofPayment != ""
		billingsByApplicationID[billings[i].ApplicationID] = &billings[i]
	}
	for i := range applications {
		applications[i].ReplyLetterAvailable = applications[i].ReplyLetter != ""
		applications[i].Billing = billingsByApplicationID[applications[i].ID]
	}
	return nil
}
