package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

type failingDocumentStorage struct{}

func (f failingDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	return "", http.ErrAbortHandler
}

func (f failingDocumentStorage) SaveBimtekMagangPaymentProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) ReadBimtekMagangPaymentProof(ctx context.Context, location string) ([]byte, error) {
	return nil, http.ErrAbortHandler
}

func (f failingDocumentStorage) DeleteBimtekMagangFiles(ctx context.Context, locations []string) (int, error) {
	return 0, nil
}

type MockAdminService struct {
	createCalled bool
	createReq    dto.AdminRequest
	createErr    error

	getCalled     bool
	getRoleFilter string
	getResult     []models.Admin
	getErr        error

	verifyCalled bool
	verifyUserID uint
	verifyResult models.User
	verifyErr    error

	rejectCalled bool
	rejectUserID uint
	rejectErr    error

	deleteCalled bool
	deleteTarget uint
	deleteActor  uint
	deleteErr    error

	updateCalled bool
	updateUserID uint
	updateReq    services.UpdateAdminAccountRequest
	updateErr    error

	getAllCalled bool
	getAllResult []models.User
	getAllErr    error

	createCustomerCalled bool
	createCustomerReq    dto.CustomerCreateRequest
	createCustomerErr    error

	updateCustomerCalled bool
	updateCustomerUserID uint
	updateCustomerReq    dto.CustomerUpdateRequest
	updateCustomerErr    error

	deleteCustomerCalled bool
	deleteCustomerUserID uint
	deleteCustomerErr    error

	importCustomerCalled bool
	importCustomerResult services.ImportResult
	importCustomerErr    error
}

var _ handlers.AdminServiceInterface = (*MockAdminService)(nil)

func (m *MockAdminService) CreateAdminAccount(req dto.AdminRequest) error {
	m.createCalled = true
	m.createReq = req
	return m.createErr
}

func (m *MockAdminService) GetManagedAccounts(roleFilter string) ([]models.Admin, error) {
	m.getCalled = true
	m.getRoleFilter = roleFilter
	return m.getResult, m.getErr
}

func (m *MockAdminService) VerifyUserByID(userID uint) (models.User, error) {
	m.verifyCalled = true
	m.verifyUserID = userID
	return m.verifyResult, m.verifyErr
}

func (m *MockAdminService) RejectUserByID(userID uint) error {
	m.rejectCalled = true
	m.rejectUserID = userID
	return m.rejectErr
}

func (m *MockAdminService) DeleteManagedAccount(targetID, actorID uint) error {
	m.deleteCalled = true
	m.deleteTarget = targetID
	m.deleteActor = actorID
	return m.deleteErr
}

func (m *MockAdminService) UpdateManagedAccount(userID uint, req services.UpdateAdminAccountRequest) error {
	m.updateCalled = true
	m.updateUserID = userID
	m.updateReq = req
	return m.updateErr
}

func (m *MockAdminService) GetAllCustomers() ([]models.User, error) {
	m.getAllCalled = true
	return m.getAllResult, m.getAllErr
}

func (m *MockAdminService) CreateCustomerAccount(req dto.CustomerCreateRequest) error {
	m.createCustomerCalled = true
	m.createCustomerReq = req
	return m.createCustomerErr
}

func (m *MockAdminService) UpdateCustomerAccount(userID uint, req dto.CustomerUpdateRequest) error {
	m.updateCustomerCalled = true
	m.updateCustomerUserID = userID
	m.updateCustomerReq = req
	return m.updateCustomerErr
}

func (m *MockAdminService) DeleteCustomerAccount(userID uint) error {
	m.deleteCustomerCalled = true
	m.deleteCustomerUserID = userID
	return m.deleteCustomerErr
}

func (m *MockAdminService) ImportCustomerAccounts(file io.Reader) (services.ImportResult, error) {
	m.importCustomerCalled = true
	// We can read the file here to check content if needed for a more complex test
	return m.importCustomerResult, m.importCustomerErr
}

var _ = Describe("AdminHandler", func() {
	var mockService *MockAdminService
	var handler *handlers.AdminHandler
	var router *gin.Engine
	var w *httptest.ResponseRecorder

	BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		mockService = &MockAdminService{}
		handler = handlers.NewAdminHandler(mockService)
		router = gin.New()
		w = httptest.NewRecorder()
	})

	Describe("CreateAdmin", func() {
		BeforeEach(func() {
			router.POST("/admins", handler.CreateAdmin)
		})

		It("should reject invalid role", func() {
			invalidBody, err := json.Marshal(dto.AdminRequest{Role: "customer"})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPost, "/admins", bytes.NewReader(invalidBody))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusBadRequest))
			Expect(mockService.createCalled).To(BeFalse())
		})

		It("should create admin with valid role", func() {
			validBody, err := json.Marshal(dto.AdminRequest{
				FullName: "Jane Admin", Email: "jane@example.com", Phone: "08123456780", Password: "password123", Role: "admin",
			})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPost, "/admins", bytes.NewReader(validBody))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusCreated))
			Expect(w.Body.String()).To(ContainSubstring("Account created successfully"))
			Expect(mockService.createCalled).To(BeTrue())
			Expect(mockService.createReq.Role).To(Equal("admin"))
		})
	})

	Describe("Account Listing and Verification", func() {
		BeforeEach(func() {
			mockService.getResult = []models.Admin{{User: models.User{ID: 1, FullName: "Admin One", Role: "admin"}}}
			router.GET("/admins", handler.GetAllAdminAccounts)
			router.GET("/admins/:id/verify", handler.VerifyUser)
		})

		It("should get all admin accounts", func() {
			req := httptest.NewRequest(http.MethodGet, "/admins?role=admin", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Admin One"))
			Expect(mockService.getCalled).To(BeTrue())
			Expect(mockService.getRoleFilter).To(Equal("admin"))
		})

		It("should verify a user", func() {
			mockService.verifyResult = models.User{ID: 9, FullName: "Verified User"}
			req := httptest.NewRequest(http.MethodGet, "/admins/9/verify", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("User verification successful"))
			Expect(mockService.verifyCalled).To(BeTrue())
			Expect(mockService.verifyUserID).To(Equal(uint(9)))
		})

		It("should return bad request for invalid verification ID", func() {
			req := httptest.NewRequest(http.MethodGet, "/admins/abc/verify", nil)
			router.ServeHTTP(w, req)
			Expect(w.Code).To(Equal(http.StatusBadRequest))
		})
	})

	Describe("UpdateAdminAccount and GetAllCustomers", func() {
		BeforeEach(func() {
			mockService.getAllResult = []models.User{{ID: 2, FullName: "Customer A"}}
			router.PATCH("/admins/:id", handler.UpdateAdminAccount)
			router.GET("/admins/customers", handler.GetAllCustomers)
		})

		It("should update an admin account", func() {
			body, err := json.Marshal(map[string]any{"fullname": "Admin Updated", "role": "superadmin"})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPatch, "/admins/5", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Account successfully updated"))
			Expect(mockService.updateCalled).To(BeTrue())
			Expect(mockService.updateUserID).To(Equal(uint(5)))
			Expect(*mockService.updateReq.FullName).To(Equal("Admin Updated"))
			Expect(*mockService.updateReq.Role).To(Equal("superadmin"))
		})

		It("should get all customers", func() {
			req := httptest.NewRequest(http.MethodGet, "/admins/customers", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Customer A"))
			Expect(w.Body.String()).To(ContainSubstring("registration_doc"))
			Expect(mockService.getAllCalled).To(BeTrue())
		})
	})

	Describe("GetAllCustomers with failing storage", func() {
		It("should keep original doc path on resolution failure", func() {
			mockService.getAllResult = []models.User{{ID: 2, FullName: "Customer A", RegistrationDoc: "/uploads/doc.pdf"}}
			handlerWithFailingStorage := handlers.NewAdminHandler(mockService, failingDocumentStorage{})
			router.GET("/admins/customers", handlerWithFailingStorage.GetAllCustomers)

			req := httptest.NewRequest(http.MethodGet, "/admins/customers", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("/uploads/doc.pdf"))
			Expect(mockService.getAllCalled).To(BeTrue())
		})
	})

	Describe("Customer Account Management", func() {
		It("should create a customer account", func() {
			// Replicate the route structure from routes.go accurately
			apiGroup := router.Group("/api")
			protectedGroup := apiGroup.Group("/")
			// Simulate AuthMiddleware() which sets user_id and role
			protectedGroup.Use(func(c *gin.Context) {
				c.Set("user_id", uint(1))
				c.Set("role", "superadmin")
				c.Next()
			})

			// The RequireRole middleware is implicitly covered by setting the role above
			superAdminGroup := protectedGroup.Group("/superadmin")
			superAdminGroup.POST("/customers", handler.CreateCustomerAccount)

			body, err := json.Marshal(dto.CustomerCreateRequest{
				FullName:    "New Cust",
				Email:       "new@cust.com",
				Phone:       "081234567890",
				Password:    "password123",
				Institution: "Inst X",
				IsActive:    true,
			})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPost, "/api/superadmin/customers", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusCreated))
			Expect(mockService.createCustomerCalled).To(BeTrue())
			Expect(mockService.createCustomerReq.Email).To(Equal("new@cust.com"))
			Expect(mockService.createCustomerReq.FullName).To(Equal("New Cust"))
			Expect(mockService.createCustomerReq.IsActive).To(Equal(true))
			Expect(mockService.createCustomerReq.Institution).To(Equal("Inst X"))
		})

		It("should update a customer account", func() {
			router.PATCH("/customers/:id", handler.UpdateCustomerAccount)
			newName := "Updated Name"
			body, err := json.Marshal(dto.CustomerUpdateRequest{FullName: &newName})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPatch, "/customers/123", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(mockService.updateCustomerCalled).To(BeTrue())
			Expect(mockService.updateCustomerUserID).To(Equal(uint(123)))
			Expect(*mockService.updateCustomerReq.FullName).To(Equal(newName))
		})

		It("should delete a customer account", func() {
			router.DELETE("/customers/:id", handler.DeleteCustomerAccount)
			req := httptest.NewRequest(http.MethodDelete, "/customers/123", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(mockService.deleteCustomerCalled).To(BeTrue())
			Expect(mockService.deleteCustomerUserID).To(Equal(uint(123)))
		})
	})

	Describe("RejectUser", func() {
		It("should reject a user verification", func() {
			router.PATCH("/users/:id/reject", handler.RejectUser)
			req := httptest.NewRequest(http.MethodPatch, "/users/42/reject", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("User verification rejected and deleted"))
			Expect(mockService.rejectCalled).To(BeTrue())
			Expect(mockService.rejectUserID).To(Equal(uint(42)))
		})
	})
})
