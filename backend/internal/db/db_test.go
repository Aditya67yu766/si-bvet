package db

import (
	"path/filepath"
	"testing"

	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestDropLegacyBimtekMagangBillingColumns(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "billing-migration.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close migration test database: %v", err)
		}
	})
	if err := testDB.AutoMigrate(&models.BimtekMagangBilling{}, &models.Billing{}); err != nil {
		t.Fatal(err)
	}
	for _, column := range []string{"bank_name", "account_name", "account_number"} {
		if err := testDB.Exec("ALTER TABLE \"BimtekMagangBillings\" ADD COLUMN \"" + column + "\" TEXT NOT NULL DEFAULT ''").Error; err != nil {
			t.Fatal(err)
		}
	}

	if err := dropLegacyBimtekMagangBillingColumns(testDB); err != nil {
		t.Fatal(err)
	}
	if err := dropLegacyBimtekMagangBillingColumns(testDB); err != nil {
		t.Fatalf("migration should be safe to run more than once: %v", err)
	}
	for _, column := range []string{"bank_name", "account_name", "account_number"} {
		if testDB.Migrator().HasColumn("BimtekMagangBillings", column) {
			t.Errorf("legacy column %q remains", column)
		}
	}
	if !testDB.Migrator().HasColumn(models.BimtekMagangBilling{}.TableName(), "e_billing_code") {
		t.Error("e-billing code column was removed")
	}
	if !testDB.Migrator().HasColumn(models.Billing{}.TableName(), "ebilling_code") {
		t.Error("sample testing billing was changed")
	}
}
