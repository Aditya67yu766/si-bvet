package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalDocumentStorageReadsOnlyPrivateBillingProofs(t *testing.T) {
	baseDir := t.TempDir()
	proofDir := filepath.Join(baseDir, "bimtek-magang-payment-proofs")
	if err := os.MkdirAll(proofDir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(proofDir, "proof.png"), []byte("proof"), 0o600); err != nil {
		t.Fatal(err)
	}
	storage := NewLocalDocumentStorage(baseDir)

	content, err := storage.ReadBimtekMagangPaymentProof(context.Background(), "/uploads/bimtek-magang-payment-proofs/proof.png")
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "proof" {
		t.Fatalf("unexpected proof content %q", content)
	}

	for _, location := range []string{
		"/uploads/bimtek-magang-payment-proofs/../../private.txt",
		"/uploads/bimtek-magang/document.pdf",
		"/uploads/billing-proofs/sample-test-proof.png",
		"https://example.test/proof.png",
	} {
		if _, err := storage.ReadBimtekMagangPaymentProof(context.Background(), location); err == nil {
			t.Errorf("expected location %q to be rejected", location)
		}
	}
}
