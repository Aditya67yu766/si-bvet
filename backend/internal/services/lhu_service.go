package services

import (
	"errors"
	"fmt"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateLHu(submissionID uint, noLhu string, filePath string, dateOfPub *time.Time) error {

	// cek apakah LHu sudah ada untuk submission ini
	existingLHu, err := repositories.GetLhuBySubmissionID(submissionID)
	if err == nil && existingLHu.ID != 0 {
		return errors.New("LHu already exists for this submission")
	}

	lhu := models.LhuDocument{
		SubmissionID: submissionID,
		NoLhu:        noLhu,
		FilePath:     filePath,
		DateOfPub:    dateOfPub,
	}

	err = repositories.CreateLhu(&lhu)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("LHU dibuat untuk submission ID %d dengan nomor %s", submissionID, noLhu))
	}
	return err
}

func GetLHuBySubmissionID(submissionID uint) (*models.LhuDocument, error) {
	lhu, err := repositories.GetLhuBySubmissionID(submissionID)
	if err != nil {
		return nil, err
	}
	return &lhu, nil
}

func UpdateLHu(submissionID uint, noLhu string, filePath string, dateOfPub *time.Time) error {
	err := repositories.UpdateLhu(submissionID, noLhu, filePath, dateOfPub)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("LHU untuk submission ID %d diperbarui. Nomor LHU: %s", submissionID, noLhu))
	}
	return err
}

func UploadLHU(submissionID uint, noLHU, filePath string) error {
	now := time.Now()
	if _, err := repositories.GetSubmissionByID(submissionID); err != nil {
		return err
	}

	// Cek apakah LHU sudah ada untuk submission ini (logika upsert)
	existingLHU, err := repositories.GetLhuBySubmissionID(submissionID)
	if err == nil && existingLHU.ID != 0 {
		// Jika sudah ada, perbarui LHU yang ada
		err = repositories.UpdateLhu(submissionID, noLHU, filePath, &now)
	} else {
		// Jika belum ada, buat LHU baru
		lhu := models.LhuDocument{
			SubmissionID: submissionID,
			NoLhu:        noLHU,
			FilePath:     filePath,
			DateOfPub:    &now,
		}
		err = repositories.CreateLhu(&lhu)
	}

	if err != nil {
		return err
	}

	// update status submission jadi selesai
	if err := UpdateSubmissionStatusWithNotification(submissionID, "done"); err != nil {
		return err
	}

	NotifyLHUAvailable(submissionID)
	LogSystemActivity(fmt.Sprintf("LHU diunggah untuk submission ID %d. Nomor LHU: %s", submissionID, noLHU))
	return nil
}

func GetLHU(submissionID uint) (models.LhuDocument, error) {
	return repositories.GetLhuBySubmissionID(submissionID)
}
