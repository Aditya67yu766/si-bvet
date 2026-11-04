package repositories

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestBimtekMagangBillingLifecycle(t *testing.T) {
	previousDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "bimtek-magang-payment.db")), &gorm.Config{})
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

	if err := testDB.AutoMigrate(&models.User{}, &models.BimtekMagangApplication{}, &models.BimtekMagangBilling{}); err != nil {
		t.Fatal(err)
	}
	user := models.User{
		FullName:     "Customer Test",
		Email:        "customer@example.test",
		Phone:        "0800000000",
		PasswordHash: "test",
		Role:         "customer",
	}
	if err := testDB.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	application := models.BimtekMagangApplication{
		UserID:      user.ID,
		RequestType: "magang",
		Topic:       "Pengujian alur pembayaran",
		Status:      "Menunggu Verifikasi",
	}
	if err := testDB.Create(&application).Error; err != nil {
		t.Fatal(err)
	}

	billing := models.BimtekMagangBilling{
		ApplicationID: application.ID,
		EBillingCode:  "EB-TEST-001",
		DurationDays:  8,
		TotalAmount:   300000,
		PaymentStatus: "unpaid",
		IssuedAt:      time.Now(),
	}
	if err := CreateBimtekMagangBilling(&billing); err != nil {
		t.Fatal(err)
	}
	if err := UploadBimtekMagangPaymentProof(application.ID, user.ID, "billing-proofs/proof.png"); err != nil {
		t.Fatal(err)
	}
	if err := VerifyBimtekMagangPayment(application.ID, time.Now()); err != nil {
		t.Fatal(err)
	}

	var savedBilling models.BimtekMagangBilling
	if err := testDB.Where("application_id = ?", application.ID).First(&savedBilling).Error; err != nil {
		t.Fatal(err)
	}
	if savedBilling.EBillingCode != billing.EBillingCode {
		t.Fatalf("expected e-billing code %q, got %q", billing.EBillingCode, savedBilling.EBillingCode)
	}
	if savedBilling.PaymentStatus != "paid" {
		t.Fatalf("expected paid status, got %q", savedBilling.PaymentStatus)
	}
	var savedApplication models.BimtekMagangApplication
	if err := testDB.First(&savedApplication, application.ID).Error; err != nil {
		t.Fatal(err)
	}
	if savedApplication.Status != "Berkas Terverifikasi" {
		t.Fatalf("expected verified application status, got %q", savedApplication.Status)
	}
	if err := DeleteBimtekMagangApplication(application.ID); !errors.Is(err, ErrBimtekMagangApplicationHasBilling) {
		t.Fatalf("expected billed application deletion to be blocked, got %v", err)
	}
}

func TestDeleteBimtekMagangApplicationWithAuditRemovesPaidBilling(t *testing.T) {
	previousDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "bimtek-magang-audited-delete.db")), &gorm.Config{})
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
	if err := testDB.AutoMigrate(
		&models.User{},
		&models.BimtekMagangApplication{},
		&models.BimtekMagangBilling{},
		&models.ActivityLog{},
	); err != nil {
		t.Fatal(err)
	}

	admin := models.User{
		FullName:     "Admin Test",
		Email:        "admin@example.test",
		Phone:        "0800000001",
		PasswordHash: "hash",
		Role:         "admin",
		IsActive:     true,
	}
	if err := testDB.Create(&admin).Error; err != nil {
		t.Fatal(err)
	}
	customer := models.User{
		FullName:     "Customer Test",
		Email:        "customer-delete@example.test",
		Phone:        "0800000002",
		PasswordHash: "hash",
		Role:         "customer",
		IsActive:     true,
	}
	if err := testDB.Create(&customer).Error; err != nil {
		t.Fatal(err)
	}
	application := models.BimtekMagangApplication{
		UserID:           customer.ID,
		RequestType:      "magang",
		Topic:            "Pengajuan untuk penghapusan admin",
		Status:           "Surat Balasan Terkirim",
		IdentityDocument: "/uploads/bimtek-magang/identity.pdf",
		RequestLetter:    "/uploads/bimtek-magang/request.pdf",
		ProposalDocument: "/uploads/bimtek-magang/proposal.pdf",
		ReplyLetter:      "/uploads/bimtek-magang/reply.pdf",
	}
	if err := testDB.Create(&application).Error; err != nil {
		t.Fatal(err)
	}
	billing := models.BimtekMagangBilling{
		ApplicationID: application.ID,
		EBillingCode:  "EB-TEST-PAID-001",
		DurationDays:  8,
		TotalAmount:   300000,
		PaymentStatus: "paid",
		ProofPayment:  "/uploads/bimtek-magang-payment-proofs/proof.png",
		IssuedAt:      time.Now(),
	}
	if err := testDB.Create(&billing).Error; err != nil {
		t.Fatal(err)
	}

	locations, err := DeleteBimtekMagangApplicationWithAudit(
		application.ID, admin.ID, admin.Role, "Permohonan duplikat", "127.0.0.1",
		"DELETE", "/api/admin/bimtek-magang/1",
	)
	if err != nil {
		t.Fatalf("delete application and paid billing: %v", err)
	}
	if len(locations) != 5 {
		t.Fatalf("expected 5 file locations, got %d", len(locations))
	}

	for _, model := range []interface{}{
		&models.BimtekMagangApplication{},
		&models.BimtekMagangBilling{},
	} {
		var count int64
		query := testDB.Model(model)
		if _, ok := model.(*models.BimtekMagangApplication); ok {
			query = query.Where("id = ?", application.ID)
		} else {
			query = query.Where("application_id = ?", application.ID)
		}
		if err := query.Count(&count).Error; err != nil {
			t.Fatal(err)
		}
		if count != 0 {
			t.Errorf("expected deleted %T record, found %d", model, count)
		}
	}

	var logEntry models.ActivityLog
	if err := testDB.Where("actor_id = ?", admin.ID).First(&logEntry).Error; err != nil {
		t.Fatalf("expected an audit log: %v", err)
	}
	for _, expected := range []string{"status_tagihan=paid", "nominal_tagihan=300000", "Permohonan duplikat"} {
		if !strings.Contains(logEntry.Activity, expected) {
			t.Errorf("audit activity %q does not contain %q", logEntry.Activity, expected)
		}
	}
	if logEntry.Method != "DELETE" || logEntry.Role != "admin" {
		t.Errorf("audit log did not retain actor role and method: %+v", logEntry)
	}
}

func TestDeleteBimtekMagangApplicationWithAuditRejectsSharedFiles(t *testing.T) {
	previousDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "bimtek-magang-shared-files.db")), &gorm.Config{})
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
	if err := testDB.AutoMigrate(
		&models.User{},
		&models.BimtekMagangApplication{},
		&models.BimtekMagangBilling{},
		&models.ActivityLog{},
	); err != nil {
		t.Fatal(err)
	}
	admin := models.User{FullName: "Admin", Email: "admin-shared@example.test", Phone: "0800000003", PasswordHash: "hash", Role: "admin", IsActive: true}
	customer := models.User{FullName: "Customer", Email: "customer-shared@example.test", Phone: "0800000004", PasswordHash: "hash", Role: "customer", IsActive: true}
	if err := testDB.Create(&admin).Error; err != nil {
		t.Fatal(err)
	}
	if err := testDB.Create(&customer).Error; err != nil {
		t.Fatal(err)
	}
	sharedPath := "/uploads/bimtek-magang/shared.pdf"
	first := models.BimtekMagangApplication{UserID: customer.ID, RequestType: "bimtek", Topic: "First", IdentityDocument: sharedPath, RequestLetter: "first-letter", ProposalDocument: "first-proposal"}
	second := models.BimtekMagangApplication{UserID: customer.ID, RequestType: "bimtek", Topic: "Second", IdentityDocument: sharedPath, RequestLetter: "second-letter", ProposalDocument: "second-proposal"}
	if err := testDB.Create(&first).Error; err != nil {
		t.Fatal(err)
	}
	if err := testDB.Create(&second).Error; err != nil {
		t.Fatal(err)
	}

	if _, err := DeleteBimtekMagangApplicationWithAudit(first.ID, admin.ID, admin.Role, "Test shared file", "", "DELETE", "/api/admin/bimtek-magang/1"); !errors.Is(err, ErrBimtekMagangApplicationFilesShared) {
		t.Fatalf("expected shared file deletion to be blocked, got %v", err)
	}
	var count int64
	if err := testDB.Model(&models.BimtekMagangApplication{}).Where("id = ?", first.ID).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatal("application was deleted despite referencing a shared file")
	}
}
