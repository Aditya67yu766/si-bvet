package routes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestIsPrivateBillingProofPath(t *testing.T) {
	tests := []struct {
		path     string
		expected bool
	}{
		{path: "/uploads/bimtek-magang-payment-proofs/proof.png", expected: true},
		{path: "/api/uploads/bimtek-magang-payment-proofs/proof.png", expected: true},
		{path: "/uploads/bimtek-magang-payment-proofs", expected: true},
		{path: "/uploads/billing-proofs/sample-test-proof.png", expected: false},
		{path: "/uploads/bimtek-magang/document.pdf", expected: false},
		{path: "/uploads/billing-proofs-public/proof.png", expected: false},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			if got := isPrivateBillingProofPath(test.path); got != test.expected {
				t.Fatalf("isPrivateBillingProofPath(%q) = %t, want %t", test.path, got, test.expected)
			}
		})
	}
}

func TestPrivateBillingProofGuardDoesNotBlockSampleBillingFiles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	uploadDir := t.TempDir()
	for path, content := range map[string]string{
		filepath.Join("bimtek-magang-payment-proofs", "private.png"): "private proof",
		filepath.Join("billing-proofs", "sample.png"):                "sample proof",
	} {
		fullPath := filepath.Join(uploadDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	router := gin.New()
	router.Use(privateBillingProofGuard())
	router.Static("/uploads", uploadDir)

	for _, test := range []struct {
		path       string
		statusCode int
	}{
		{path: "/uploads/bimtek-magang-payment-proofs/private.png", statusCode: http.StatusNotFound},
		{path: "/uploads/billing-proofs/sample.png", statusCode: http.StatusOK},
	} {
		request := httptest.NewRequest(http.MethodGet, test.path, nil)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != test.statusCode {
			t.Errorf("GET %s returned status %d, want %d", test.path, response.Code, test.statusCode)
		}
	}
}
