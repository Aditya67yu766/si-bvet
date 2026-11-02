package services

import "testing"

func TestReviewBimtekMagangApplicationRequiresNoteWhenNotVerified(t *testing.T) {
	err := ReviewBimtekMagangApplication(1, false, "")
	if err == nil {
		t.Fatal("expected a note to be required when an application is not verified")
	}
}
