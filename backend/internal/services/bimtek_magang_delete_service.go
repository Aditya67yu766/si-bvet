package services

import (
	"errors"

	"si-bvet/internal/repositories"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var ErrBimtekMagangDeleteReauthenticationFailed = errors.New("admin reauthentication failed")

func ReauthenticateBimtekMagangDeletion(userID uint, claimedRole, password string) error {
	if password == "" || (claimedRole != "admin" && claimedRole != "superadmin") {
		return ErrBimtekMagangDeleteReauthenticationFailed
	}

	user, err := repositories.GetUserByID(userID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrBimtekMagangDeleteReauthenticationFailed
	}
	if err != nil {
		return err
	}
	if user.Role != claimedRole || !user.IsActive {
		return ErrBimtekMagangDeleteReauthenticationFailed
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return ErrBimtekMagangDeleteReauthenticationFailed
	}
	return nil
}

func DeleteBimtekMagangApplicationWithAudit(
	applicationID, actorID uint,
	actorRole, reason, ipAddress, method, endpoint string,
) ([]string, error) {
	return repositories.DeleteBimtekMagangApplicationWithAudit(
		applicationID, actorID, actorRole, reason, ipAddress, method, endpoint,
	)
}
