package services

import (
	"errors"
	"testing"
)

func TestReviewBimtekMagangApplicationRequiresNoteWhenNotVerified(t *testing.T) {
	err := ReviewBimtekMagangApplication(1, false, "")
	if err == nil {
		t.Fatal("expected a note to be required when an application is not verified")
	}
}

func TestReviewBimtekMagangApplicationRequiresReplyLetterWhenVerified(t *testing.T) {
	err := ReviewBimtekMagangApplication(1, true, "")
	if !errors.Is(err, ErrBimtekMagangReplyLetterRequired) {
		t.Fatalf("expected reply letter requirement, got %v", err)
	}
}
