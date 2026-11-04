package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalDocumentStorageDeletesOnlyBimtekMagangFiles(t *testing.T) {
	baseDir := t.TempDir()
	storage := NewLocalDocumentStorage(baseDir)
	magangFile := filepath.Join(baseDir, "bimtek-magang", "request.pdf")
	proofFile := filepath.Join(baseDir, "bimtek-magang-payment-proofs", "proof.png")
	sampleBillingFile := filepath.Join(baseDir, "billing-proofs", "sample.png")
	for _, file := range []string{magangFile, proofFile, sampleBillingFile} {
		if err := os.MkdirAll(filepath.Dir(file), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(file, []byte("test"), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	failed, err := storage.DeleteBimtekMagangFiles(context.Background(), []string{
		"/uploads/bimtek-magang/request.pdf",
		"/uploads/bimtek-magang-payment-proofs/proof.png",
	})
	if err != nil {
		t.Fatalf("delete BIMTEK/Magang files: %v", err)
	}
	if failed != 0 {
		t.Fatalf("expected no pending file deletions, got %d", failed)
	}
	for _, file := range []string{magangFile, proofFile} {
		if _, err := os.Stat(file); !os.IsNotExist(err) {
			t.Errorf("expected %q to be deleted, stat error = %v", file, err)
		}
	}
	if _, err := os.Stat(sampleBillingFile); err != nil {
		t.Errorf("sample-testing billing file was affected: %v", err)
	}
}

func TestLocalDocumentStorageRejectsOutOfScopeAndTraversalPaths(t *testing.T) {
	baseDir := t.TempDir()
	storage := NewLocalDocumentStorage(baseDir)
	protectedFile := filepath.Join(baseDir, "billing-proofs", "sample.png")
	if err := os.MkdirAll(filepath.Dir(protectedFile), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(protectedFile, []byte("protected"), 0o600); err != nil {
		t.Fatal(err)
	}

	for _, location := range []string{
		"/uploads/billing-proofs/sample.png",
		"/uploads/bimtek-magang/../../billing-proofs/sample.png",
	} {
		if _, err := storage.DeleteBimtekMagangFiles(context.Background(), []string{location}); err == nil {
			t.Errorf("expected unsafe location %q to be rejected", location)
		}
	}
	if _, err := os.Stat(protectedFile); err != nil {
		t.Fatalf("protected sample-testing file was removed: %v", err)
	}
}
