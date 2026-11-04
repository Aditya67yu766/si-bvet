package services

import (
	"errors"
	"fmt"
	"strings"
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

func TestBimtekMagangTariff(t *testing.T) {
	tests := []struct {
		days     int
		expected int64
		valid    bool
	}{
		{days: 1, expected: 200000, valid: true},
		{days: 7, expected: 200000, valid: true},
		{days: 8, expected: 300000, valid: true},
		{days: 14, expected: 300000, valid: true},
		{days: 15, expected: 500000, valid: true},
		{days: 30, expected: 500000, valid: true},
		{days: 31, expected: 1000000, valid: true},
		{days: 90, expected: 1000000, valid: true},
		{days: 0, valid: false},
		{days: 91, valid: false},
	}

	for _, test := range tests {
		t.Run(fmt.Sprintf("%d_days", test.days), func(t *testing.T) {
			amount, err := BimtekMagangTariff(test.days)
			if test.valid && (err != nil || amount != test.expected) {
				t.Fatalf("expected tariff %d, got amount %d and error %v", test.expected, amount, err)
			}
			if !test.valid && err == nil {
				t.Fatalf("expected %d days to be rejected", test.days)
			}
		})
	}
}

func TestCreateBimtekMagangBillingRequiresValidEbillingCode(t *testing.T) {
	tests := []struct {
		name string
		code string
	}{
		{name: "empty", code: ""},
		{name: "whitespace", code: " \t "},
		{name: "too long", code: strings.Repeat("x", 101)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := CreateBimtekMagangBilling(1, test.code)
			if err == nil {
				t.Fatal("expected invalid e-billing code to be rejected")
			}
		})
	}
}
