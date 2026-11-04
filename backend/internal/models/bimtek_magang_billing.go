package models

import "time"

type BimtekMagangBilling struct {
	ID             uint                    `json:"id" gorm:"primaryKey"`
	ApplicationID  uint                    `json:"application_id" gorm:"not null;uniqueIndex"`
	EBillingCode   string                  `json:"ebilling_code" gorm:"type:varchar(100);not null;default:''"`
	DurationDays   int                     `json:"duration_days" gorm:"not null"`
	TotalAmount    int64                   `json:"total_amount" gorm:"not null"`
	PaymentStatus  string                  `json:"payment_status" gorm:"type:varchar(50);not null;default:unpaid;index"`
	ProofPayment   string                  `json:"-" gorm:"type:text"`
	ProofAvailable bool                    `json:"proof_available" gorm:"-"`
	IssuedAt       time.Time               `json:"issued_at" gorm:"not null"`
	PaidAt         *time.Time              `json:"paid_at"`
	CreatedAt      time.Time               `json:"created_at"`
	UpdatedAt      time.Time               `json:"updated_at"`
	Application    BimtekMagangApplication `json:"-" gorm:"foreignKey:ApplicationID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (BimtekMagangBilling) TableName() string {
	return "BimtekMagangBillings"
}
