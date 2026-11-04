package services_test

import (
	"path/filepath"
	"testing"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestReauthenticateBimtekMagangDeletion(t *testing.T) {
	previousDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "bimtek-magang-delete-auth.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = previousDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	if err := testDB.AutoMigrate(&models.User{}); err != nil {
		t.Fatal(err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("unique-admin-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	admin := models.User{
		FullName:     "Admin Test",
		Email:        "admin-reauth@example.test",
		Phone:        "0800000010",
		PasswordHash: string(hash),
		Role:         "admin",
		IsActive:     true,
	}
	if err := testDB.Create(&admin).Error; err != nil {
		t.Fatal(err)
	}

	if err := services.ReauthenticateBimtekMagangDeletion(admin.ID, "admin", "unique-admin-password"); err != nil {
		t.Fatalf("expected valid admin credentials to pass: %v", err)
	}
	for _, test := range []struct {
		name string
		role string
		pass string
	}{
		{name: "wrong password", role: "admin", pass: "wrong-password"},
		{name: "role mismatch", role: "superadmin", pass: "unique-admin-password"},
		{name: "customer role", role: "customer", pass: "unique-admin-password"},
	} {
		t.Run(test.name, func(t *testing.T) {
			if err := services.ReauthenticateBimtekMagangDeletion(admin.ID, test.role, test.pass); err == nil {
				t.Fatal("expected reauthentication to be rejected")
			}
		})
	}
}
