package models

import "time"

type BimtekMagangApplication struct {
	ID                   uint                 `json:"id" gorm:"primaryKey"`
	UserID               uint                 `json:"user_id" gorm:"not null;index"`
	RequestType          string               `json:"request_type" gorm:"type:varchar(20);not null"`
	Topic                string               `json:"topic" gorm:"type:text;not null"`
	StartDate            *time.Time           `json:"start_date"`
	EndDate              *time.Time           `json:"end_date"`
	IdentityDocument     string               `json:"-" gorm:"type:text;not null"`
	RequestLetter        string               `json:"-" gorm:"type:text;not null"`
	ProposalDocument     string               `json:"-" gorm:"type:text;not null"`
	Status               string               `json:"status" gorm:"type:varchar(50);not null;default:Menunggu Verifikasi"`
	ReviewNote           string               `json:"review_note" gorm:"type:text"`
	ReviewedAt           *time.Time           `json:"reviewed_at"`
	ReplyLetter          string               `json:"-" gorm:"type:text"`
	ReplySentAt          *time.Time           `json:"reply_sent_at"`
	ReplyLetterAvailable bool                 `json:"reply_letter_available" gorm:"-"`
	Billing              *BimtekMagangBilling `json:"billing,omitempty" gorm:"-"`
	CreatedAt            *time.Time           `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt            *time.Time           `json:"updated_at" gorm:"autoUpdateTime"`

	User User `json:"user_info" gorm:"foreignKey:UserID;references:ID"`
}

func (BimtekMagangApplication) TableName() string {
	return "BimtekMagangApplications"
}
