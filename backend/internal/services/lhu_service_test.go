package services

import (
	"fmt"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("LHU Service", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		dsn := fmt.Sprintf("file:lhu_%d?mode=memory&cache=shared", time.Now().UnixNano())
		var err error
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		// Migrate models
		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Submission{},
			&models.LhuDocument{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("CreateLHu", func() {
		ginkgo.It("should create LHU with valid data", func() {
			// Create submission first
			now := time.Now()
			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			pubDate := time.Now()
			err = CreateLHu(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf", &pubDate)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var lhu models.LhuDocument
			err = db.DB.First(&lhu, "submission_id = ?", submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu.SubmissionID).To(gomega.Equal(submission.ID))
			gomega.Expect(lhu.NoLhu).To(gomega.Equal("LHU-2024-001"))
			gomega.Expect(lhu.FilePath).To(gomega.Equal("internal/uploads/lhu/file.pdf"))
		})

		ginkgo.It("should return error when LHU already exists for submission", func() {
			now := time.Now()

			// Create submission
			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create first LHU
			pubDate := time.Now()
			err = CreateLHu(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Try to create second LHU for same submission
			err = CreateLHu(submission.ID, "LHU-2024-002", "internal/uploads/lhu/file2.pdf", &pubDate)

			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("already exists"))
		})

		ginkgo.It("should handle nil date of publication", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = CreateLHu(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf", nil)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var lhu models.LhuDocument
			err = db.DB.First(&lhu, "submission_id = ?", submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu.DateOfPub).To(gomega.BeNil())
		})
	})

	ginkgo.Describe("GetLHuBySubmissionID", func() {
		ginkgo.It("should retrieve LHU by submission id", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			pubDate := time.Now()
			err = CreateLHu(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			lhu, err := GetLHuBySubmissionID(submission.ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu).NotTo(gomega.BeNil())
			gomega.Expect(lhu.SubmissionID).To(gomega.Equal(submission.ID))
			gomega.Expect(lhu.NoLhu).To(gomega.Equal("LHU-2024-001"))
		})

		ginkgo.It("should return error when LHU not found", func() {
			lhu, err := GetLHuBySubmissionID(99999)

			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(lhu).To(gomega.BeNil())
		})

		ginkgo.It("should retrieve correct LHU for specific submission", func() {
			now := time.Now()

			// Create two submissions
			submission1 := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			submission2 := &models.Submission{
				UserID:        2,
				NoTicket:      "TKT002",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err = db.DB.Create(submission2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create LHU for each
			pubDate := time.Now()
			err = CreateLHu(submission1.ID, "LHU-2024-001", "internal/uploads/lhu/file1.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = CreateLHu(submission2.ID, "LHU-2024-002", "internal/uploads/lhu/file2.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Retrieve and verify
			lhu1, err := GetLHuBySubmissionID(submission1.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu1.NoLhu).To(gomega.Equal("LHU-2024-001"))

			lhu2, err := GetLHuBySubmissionID(submission2.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu2.NoLhu).To(gomega.Equal("LHU-2024-002"))
		})
	})

	ginkgo.Describe("UploadLHU", func() {
		ginkgo.It("should create LHU and update submission status to done", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "pending_lhu",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = UploadLHU(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf")

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify LHU created
			var lhu models.LhuDocument
			err = db.DB.First(&lhu, "submission_id = ?", submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu.NoLhu).To(gomega.Equal("LHU-2024-001"))

			// Verify submission status updated to done
			var updated models.Submission
			err = db.DB.First(&updated, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("done"))
		})

		ginkgo.It("should return error if submission not found", func() {
			err := UploadLHU(99999, "LHU-2024-001", "internal/uploads/lhu/file.pdf")

			gomega.Expect(err).To(gomega.HaveOccurred())
		})

		ginkgo.It("should replace an existing LHU", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "pending_lhu",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Upload first LHU
			err = UploadLHU(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Re-upload replaces the existing LHU.
			err = UploadLHU(submission.ID, "LHU-2024-002", "internal/uploads/lhu/file2.pdf")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updatedLHU models.LhuDocument
			gomega.Expect(db.DB.First(&updatedLHU, "submission_id = ?", submission.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedLHU.NoLhu).To(gomega.Equal("LHU-2024-002"))
			gomega.Expect(updatedLHU.FilePath).To(gomega.Equal("internal/uploads/lhu/file2.pdf"))
		})
	})

	ginkgo.Describe("GetLHU", func() {
		ginkgo.It("should get LHU document by submission id", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			pubDate := time.Now()
			err = CreateLHu(submission.ID, "LHU-2024-001", "internal/uploads/lhu/file.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			lhu, err := GetLHU(submission.ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(lhu.SubmissionID).To(gomega.Equal(submission.ID))
			gomega.Expect(lhu.FilePath).To(gomega.Equal("internal/uploads/lhu/file.pdf"))
		})

		ginkgo.It("should return error when LHU not found", func() {
			_, err := GetLHU(99999)

			gomega.Expect(err).To(gomega.HaveOccurred())
		})
	})

	ginkgo.Describe("LHU Service Access Control Scenario", func() {
		ginkgo.It("should support access control by checking submission ownership", func() {
			now := time.Now()

			// User 1's submission
			user1Sub := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err := db.DB.Create(user1Sub).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// User 2's submission
			user2Sub := &models.Submission{
				UserID:        2,
				NoTicket:      "TKT002",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				CreatedAt:     &now,
			}
			err = db.DB.Create(user2Sub).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create LHU for User 1
			pubDate := time.Now()
			err = CreateLHu(user1Sub.ID, "LHU-2024-001", "internal/uploads/lhu/file1.pdf", &pubDate)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify User 1 can access their LHU
			lhu, err := GetLHU(user1Sub.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify it belongs to User 1
			var submission models.Submission
			err = db.DB.First(&submission, user1Sub.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(submission.UserID).To(gomega.Equal(uint(1)))
			gomega.Expect(lhu.SubmissionID).To(gomega.Equal(user1Sub.ID))

			// User 2's LHU should not be found yet (not created)
			_, err = GetLHU(user2Sub.ID)
			gomega.Expect(err).To(gomega.HaveOccurred())
		})
	})
})
