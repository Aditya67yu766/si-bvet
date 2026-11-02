package handlers_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"github.com/xuri/excelize/v2"
)

type MockSubmissionService struct {
	createCalled bool
	createUserID uint
	createReq    dto.SubmissionRequest
	createErr    error

	updateCalled bool
	updateID     uint
	updateUserID uint
	updateReq    dto.UpdateSubmissionRequest
	updateErr    error

	trackingCalled bool
	trackingID     uint
	trackingUserID uint
	trackingResp   dto.SubmissionTrackingTimelineResponse
	trackingErr    error

	uploadedTemplate    *models.SubmissionSampleTemplate
	uploadedTemplateErr error
	saveTemplateCalled  bool
	saveTemplateUserID  uint
	saveTemplatePath    string
	saveTemplateName    string
	saveTemplateErr     error

	importCalled       bool
	importSubmissionID uint
	importReaderSeen   bool

	getByUserPaginatedCalled  bool
	getByUserPaginatedUserID  uint
	getByUserPaginatedPage    int
	getByUserPaginatedPerPage int
	getByUserPaginatedResp    []models.Submission
	getByUserPaginatedTotal   int64
	getByUserPaginatedErr     error

	getAllPaginatedCalled  bool
	getAllPaginatedPage    int
	getAllPaginatedPerPage int
	getAllPaginatedResp    []models.Submission
	getAllPaginatedTotal   int64
	getAllPaginatedErr     error

	getByIDCalled bool
	getByIDID     uint
	getByIDResult models.Submission
	getByIDErr    error

	getSubmissionByUserErr error

	getByIDForUserCalled bool
	getByIDForUserID     uint
	getByIDForUserUserID uint
	getByIDForUserResult models.Submission
	getByIDForUserErr    error
}

var _ services.SubmissionServiceInterface = (*MockSubmissionService)(nil)

func (m *MockSubmissionService) Create(userID uint, req dto.SubmissionRequest) (models.Submission, error) {
	m.createCalled = true
	m.createUserID = userID
	m.createReq = req
	if m.createErr != nil {
		return models.Submission{}, m.createErr
	}

	// build minimal submission object to return
	samples := make([]models.Sample, 0, len(req.Samples))
	for i, s := range req.Samples {
		sampleModel := models.Sample{
			ID:             uint(i + 1),
			SampleCodeCust: s.SampleCodeCust,
			SampleModel:    s.SampleModel,
			TotalSample:    int64(s.TotalSample),
		}

		// attach test requests minimal
		trs := make([]models.TestRequest, 0, len(s.Tests))
		for j, t := range s.Tests {
			trs = append(trs, models.TestRequest{ID: uint(j + 1), TestServiceID: t.TestServiceID, SampleID: sampleModel.ID})
		}
		sampleModel.TestRequests = trs

		samples = append(samples, sampleModel)
	}

	submission := models.Submission{
		ID:            1,
		UserID:        userID,
		TypeService:   req.TypeService,
		PurposeOfTest: req.PurposeOfTest,
		SampleTaker:   req.SampleTaker,
		Notes:         req.Notes,
		SamplesCount:  len(req.Samples),
		Samples:       samples,
	}

	return submission, nil
}

func (m *MockSubmissionService) GetSubmissionsByUser(userID uint) ([]models.Submission, error) {
	return nil, m.getSubmissionByUserErr
}

func (m *MockSubmissionService) GetByUserPaginated(userID uint, page, perPage int) ([]models.Submission, int64, error) {
	m.getByUserPaginatedCalled = true
	m.getByUserPaginatedUserID = userID
	m.getByUserPaginatedPage = page
	m.getByUserPaginatedPerPage = perPage
	return m.getByUserPaginatedResp, m.getByUserPaginatedTotal, m.getByUserPaginatedErr
}

func (m *MockSubmissionService) GetSubmissionByID(submissionID uint) (models.Submission, error) {
	m.getByIDCalled = true
	m.getByIDID = submissionID

	return m.getByIDResult, m.getByIDErr
}

func (m *MockSubmissionService) GetSubmissionByIDForUser(submissionID uint, userID uint) (models.Submission, error) {
	m.getByIDForUserCalled = true
	m.getByIDForUserID = submissionID
	m.getByIDForUserUserID = userID
	return m.getByIDForUserResult, m.getByIDForUserErr
}

func (m *MockSubmissionService) GetAll() ([]models.Submission, error) {
	return nil, nil
}

func (m *MockSubmissionService) GetAllPaginated(page, perPage int) ([]models.Submission, int64, error) {
	m.getAllPaginatedCalled = true
	m.getAllPaginatedPage = page
	m.getAllPaginatedPerPage = perPage
	return m.getAllPaginatedResp, m.getAllPaginatedTotal, m.getAllPaginatedErr
}

func (m *MockSubmissionService) Approve(id uint) error {
	return nil
}

func (m *MockSubmissionService) Reject(id uint) error {
	return nil
}

func (m *MockSubmissionService) Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error {
	m.updateCalled = true
	m.updateID = submissionID
	m.updateUserID = userID
	m.updateReq = req
	return m.updateErr
}

func (m *MockSubmissionService) GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error) {
	m.trackingCalled = true
	m.trackingID = submissionID
	m.trackingUserID = userID
	return m.trackingResp, m.trackingErr
}

func (m *MockSubmissionService) GetSampleTemplate() (*bytes.Buffer, error) {
	return bytes.NewBufferString("template"), nil
}

func (m *MockSubmissionService) GetSampleTemplateWithTestServices(testServiceIDs []uint) (*bytes.Buffer, error) {
	return bytes.NewBufferString("template"), nil
}

func (m *MockSubmissionService) ApplyTestServicesToUploadedTemplate(templateBytes []byte, testServiceIDs []uint) (*bytes.Buffer, error) {
	return bytes.NewBuffer(templateBytes), nil
}

func (m *MockSubmissionService) GetUploadedSampleTemplate() (*models.SubmissionSampleTemplate, error) {
	return m.uploadedTemplate, m.uploadedTemplateErr
}

func (m *MockSubmissionService) SaveUploadedSampleTemplate(userID uint, filePath string, fileName string) error {
	m.saveTemplateCalled = true
	m.saveTemplateUserID = userID
	m.saveTemplatePath = filePath
	m.saveTemplateName = fileName
	return m.saveTemplateErr
}

func (m *MockSubmissionService) ImportSamplesFromTemplate(submissionID uint, file io.Reader) (dto.SampleTemplateImportResponse, error) {
	m.importCalled = true
	m.importSubmissionID = submissionID
	m.importReaderSeen = file != nil
	return dto.SampleTemplateImportResponse{
		SubmissionID: submissionID,
		Samples: []dto.SampleInput{{
			SampleCodeCust: "SMPL-BULK-001",
			SampleModel:    "Swab",
			TotalSample:    2,
			Tests:          []dto.TestInput{{TestServiceID: 1}},
		}},
		TotalSamples: 1,
	}, nil
}

type MockTemplateStorage struct {
	saveResult   string
	saveErr      error
	resolveValue string
	resolveErr   error
	lastFileName string
}

func (m *MockTemplateStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (m *MockTemplateStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (m *MockTemplateStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (m *MockTemplateStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (m *MockTemplateStorage) SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return m.saveResult, m.saveErr
}

func (m *MockTemplateStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (m *MockTemplateStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	m.lastFileName = fileHeader.Filename
	return m.saveResult, m.saveErr
}

func (m *MockTemplateStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	return m.resolveValue, m.resolveErr
}

func withUserID(userID uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	}
}

var _ = ginkgo.Describe("SubmissionHandler", func() {
	ginkgo.Describe("CreateSubmission", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns unauthorized when user_id is missing", func() {
			router.POST("/submissions", handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("user_id not found"))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request for invalid json", func() {
			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("invalid json"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns internal server error when service fails", func() {
			mockService.createErr = errors.New("create failed")
			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("create failed"))
			gomega.Expect(mockService.createCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createUserID).To(gomega.Equal(uint(42)))
		})

		ginkgo.It("creates submission with bulk template upload", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "sample_code_cust")
			f.SetCellValue(sheet, "B1", "sample_model")
			f.SetCellValue(sheet, "C1", "total_sample")
			f.SetCellValue(sheet, "D1", "test_service_ids")
			f.SetCellValue(sheet, "A2", "SMPL-BULK-001")
			f.SetCellValue(sheet, "B2", "Swab")
			f.SetCellValue(sheet, "C2", "2")
			f.SetCellValue(sheet, "D2", "1")

			buf := new(bytes.Buffer)
			gomega.Expect(f.Write(buf)).To(gomega.Succeed())

			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			gomega.Expect(writer.WriteField("type_service", "Reguler")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("purpose_of_test", "Surveilans")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("sample_taker", "Petugas Lapangan")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("notes", "Bulk submission")).To(gomega.Succeed())
			part, err := writer.CreateFormFile("file", "bulk-template.xlsx")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			_, err = part.Write(buf.Bytes())
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(writer.Close()).To(gomega.Succeed())

			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Submission created successfully"))
			gomega.Expect(mockService.importCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.importSubmissionID).To(gomega.Equal(uint(0)))
			gomega.Expect(mockService.importReaderSeen).To(gomega.BeTrue())
			gomega.Expect(mockService.createCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createReq.TypeService).To(gomega.Equal("Reguler"))
			gomega.Expect(mockService.createReq.Samples).To(gomega.HaveLen(1))
			gomega.Expect(mockService.createReq.Samples[0].SampleCodeCust).To(gomega.Equal("SMPL-BULK-001"))
			gomega.Expect(mockService.createReq.Samples[0].TotalSample).To(gomega.Equal(int64(2)))
		})

		ginkgo.It("creates submission with multipart samples json when file is not provided", func() {
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			gomega.Expect(writer.WriteField("type_service", "Reguler")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("purpose_of_test", "Surveilans")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("sample_taker", "Petugas Lapangan")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("notes", "Multipart samples json")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("samples", `[{"sample_code_cust":"SMPL-JSON-001","sample_model":"Serum","total_sample":3,"tests":[{"test_service_id":2}]}]`)).To(gomega.Succeed())
			gomega.Expect(writer.Close()).To(gomega.Succeed())

			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.importCalled).To(gomega.BeFalse())
			gomega.Expect(mockService.createCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createReq.Samples).To(gomega.HaveLen(1))
			gomega.Expect(mockService.createReq.Samples[0].SampleCodeCust).To(gomega.Equal("SMPL-JSON-001"))
			gomega.Expect(mockService.createReq.Samples[0].TotalSample).To(gomega.Equal(int64(3)))
		})

		ginkgo.It("prioritizes template file over multipart samples json when both are provided", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "sample_code_cust")
			f.SetCellValue(sheet, "B1", "sample_model")
			f.SetCellValue(sheet, "C1", "total_sample")
			f.SetCellValue(sheet, "D1", "test_service_ids")
			f.SetCellValue(sheet, "A2", "SMPL-BULK-001")
			f.SetCellValue(sheet, "B2", "Swab")
			f.SetCellValue(sheet, "C2", "2")
			f.SetCellValue(sheet, "D2", "1")

			buf := new(bytes.Buffer)
			gomega.Expect(f.Write(buf)).To(gomega.Succeed())

			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			gomega.Expect(writer.WriteField("type_service", "Reguler")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("purpose_of_test", "Surveilans")).To(gomega.Succeed())
			gomega.Expect(writer.WriteField("samples", `[{"sample_code_cust":"SMPL-JSON-OVERRIDE","sample_model":"Serum","total_sample":9,"tests":[{"test_service_id":99}]}]`)).To(gomega.Succeed())
			part, err := writer.CreateFormFile("file", "bulk-template.xlsx")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			_, err = part.Write(buf.Bytes())
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(writer.Close()).To(gomega.Succeed())

			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.importCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createReq.Samples).To(gomega.HaveLen(1))
			gomega.Expect(mockService.createReq.Samples[0].SampleCodeCust).To(gomega.Equal("SMPL-BULK-001"))
		})
	})

	ginkgo.Describe("GetSubmissionByIDForCustomer", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.GET("/submissions/:id", withUserID(42), handler.GetSubmissionByIDForCustomer)
			req := httptest.NewRequest(http.MethodGet, "/submissions/abc", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.getByIDForUserCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns forbidden when submission does not belong to user", func() {
			mockService.getByIDForUserErr = errors.New("unauthorized")
			router.GET("/submissions/:id", withUserID(42), handler.GetSubmissionByIDForCustomer)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("unauthorized"))
			gomega.Expect(mockService.getByIDForUserCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.getByIDForUserID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.getByIDForUserUserID).To(gomega.Equal(uint(42)))
		})

		ginkgo.It("returns submission successfully with compact customer payload", func() {
			mockService.getByIDForUserResult = models.Submission{
				ID:                123,
				UserID:            42,
				NoTicket:          "TCK-2026-000123",
				TypeService:       "Aktif",
				PurposeOfTest:     "untuk kepentingan penelitian",
				SampleTaker:       "Ivana",
				ProcessStatus:     "pending_verification",
				SamplesCount:      1,
				DiagnosisRequired: false,
				Samples: []models.Sample{
					{
						ID:             12,
						SubmissionID:   123,
						SampleModel:    "Mamalia",
						SampleCodeCust: "001",
						TotalSample:    2,
						TestRequests: []models.TestRequest{
							{
								ID:            2,
								SampleID:      12,
								TestServiceID: 416,
								PriceAtMoment: 7500,
								TestService: models.TestService{
									ID:            416,
									TestName:      "AI H5 (2.3.2) HA-HI",
									UnitLab:       "Virologi",
									Target:        "AI subtipe H5 clade 2.3.2",
									Method:        "Haemagglutination - Haemagglutination Inhibition (HA-HI) Test",
									ResultType:    "single results",
									TestReference: "MU.VIR.BVET-LPG No Bagian 03",
									Price:         7500,
									Duration:      "3",
								},
							},
						},
					},
				},
			}

			router.GET("/submissions/:id", withUserID(42), handler.GetSubmissionByIDForCustomer)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Submission retrieved successfully"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"id":123`))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"no_ticket":"TCK-2026-000123"`))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"samples"`))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"test_service"`))
			gomega.Expect(w.Body.String()).ToNot(gomega.ContainSubstring("submission_info"))
			gomega.Expect(w.Body.String()).ToNot(gomega.ContainSubstring(`"sample":{`))
			gomega.Expect(mockService.getByIDForUserCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.getByIDForUserID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.getByIDForUserUserID).To(gomega.Equal(uint(42)))
		})
	})

	ginkgo.Describe("UpdateSubmission", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.PATCH("/submissions/:id", withUserID(42), handler.UpdateSubmission)
			req := httptest.NewRequest(http.MethodPatch, "/submissions/abc", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.updateCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request when service rejects update", func() {
			mockService.updateErr = errors.New("submission cannot be edited")
			router.PATCH("/submissions/:id", withUserID(42), handler.UpdateSubmission)
			req := httptest.NewRequest(http.MethodPatch, "/submissions/123", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("submission cannot be edited"))
			gomega.Expect(mockService.updateCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.updateID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.updateUserID).To(gomega.Equal(uint(42)))
		})
	})

	ginkgo.Describe("GetSubmissionTrackingTimeline", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/abc/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns forbidden when service denies access", func() {
			mockService.trackingErr = errors.New("unauthorized")
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("unauthorized"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.trackingID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.trackingUserID).To(gomega.Equal(uint(42)))
		})

		ginkgo.It("returns tracking timeline successfully", func() {
			mockService.trackingResp = dto.SubmissionTrackingTimelineResponse{
				SubmissionID:  123,
				CurrentStep:   3,
				CurrentStatus: "awaiting_payment",
			}
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Tracking timeline retrieved successfully"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("awaiting_payment"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeTrue())
		})
	})

	ginkgo.Describe("SampleTemplateEndpoints", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			mockStorage *MockTemplateStorage
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			mockStorage = &MockTemplateStorage{
				saveResult:   "/uploads/submission-sample-templates/template.xlsx",
				resolveValue: "/uploads/submission-sample-templates/template.xlsx",
			}
			handler = handlers.NewSubmissionHandler(mockService, mockStorage)
		})

		ginkgo.It("downloads sample template excel", func() {
			router.GET("/submissions/samples/template", handler.DownloadSampleTemplate)
			req := httptest.NewRequest(http.MethodGet, "/submissions/samples/template", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Header().Get("Content-Disposition")).To(gomega.ContainSubstring("sample_template.xlsx"))
		})

		ginkgo.It("downloads uploaded sample template by redirecting to resolved location", func() {
			mockService.uploadedTemplate = &models.SubmissionSampleTemplate{FilePath: "gs://bucket/submission-sample-templates/template.xlsx", FileName: "customer-template.xlsx"}
			router.GET("/submissions/samples/template", handler.DownloadSampleTemplate)
			req := httptest.NewRequest(http.MethodGet, "/submissions/samples/template", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusFound))
			gomega.Expect(w.Header().Get("Location")).To(gomega.Equal("/uploads/submission-sample-templates/template.xlsx"))
		})

		ginkgo.It("uploads sample template successfully", func() {
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, err := writer.CreateFormFile("file", "customer-template.xlsx")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			_, err = part.Write([]byte("dummy-template"))
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(writer.Close()).To(gomega.Succeed())

			router.POST("/submissions/samples/template", withUserID(77), handler.UploadSampleTemplate)
			req := httptest.NewRequest(http.MethodPost, "/submissions/samples/template", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Sample template uploaded successfully"))
			gomega.Expect(mockService.saveTemplateCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.saveTemplateUserID).To(gomega.Equal(uint(77)))
			gomega.Expect(mockService.saveTemplatePath).To(gomega.Equal("/uploads/submission-sample-templates/template.xlsx"))
			gomega.Expect(mockService.saveTemplateName).To(gomega.Equal("customer-template.xlsx"))
		})

		ginkgo.It("returns bad request when import file is missing", func() {
			router.POST("/submissions/:submission_id/samples/import", handler.ImportSampleTemplate)
			req := httptest.NewRequest(http.MethodPost, "/submissions/123/samples/import", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("file is required"))
		})

		ginkgo.It("imports sample template successfully", func() {
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, err := writer.CreateFormFile("file", "samples.xlsx")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			_, err = part.Write([]byte("dummy"))
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(writer.Close()).To(gomega.Succeed())

			router.POST("/submissions/:submission_id/samples/import", handler.ImportSampleTemplate)
			req := httptest.NewRequest(http.MethodPost, "/submissions/123/samples/import", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Successfully parsed"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"submission_id":123`))
		})
	})
})
