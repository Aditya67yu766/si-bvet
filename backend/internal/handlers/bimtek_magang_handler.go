package handlers

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const maxBimtekMagangDocumentSize = 10 * 1024 * 1024

type BimtekMagangHandler struct {
	fileStorage storage.DocumentStorage
}

func NewBimtekMagangHandler(fileStorage storage.DocumentStorage) *BimtekMagangHandler {
	return &BimtekMagangHandler{fileStorage: fileStorage}
}

func (h *BimtekMagangHandler) Create(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 32*1024*1024)
	if err := c.Request.ParseMultipartForm(32 * 1024 * 1024); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			utils.ErrorResponse(c, http.StatusRequestEntityTooLarge, "Ukuran total unggahan maksimal 32 MB.")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, "Format formulir unggahan tidak valid.")
		return
	}
	requestType := strings.TrimSpace(c.PostForm("request_type"))
	if requestType != "bimtek" && requestType != "magang" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Pilih jenis permohonan BIMTEK atau Magang.")
		return
	}
	if c.PostForm("consulted") != "true" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Pemohon wajib berkonsultasi sebelum mengirim permohonan.")
		return
	}
	topic := strings.TrimSpace(c.PostForm("topic"))
	if topic == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Topik kegiatan wajib diisi.")
		return
	}
	if len(topic) > 2000 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Topik kegiatan maksimal 2.000 karakter.")
		return
	}

	startDate, err := parseOptionalApplicationDate(c.PostForm("start_date"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format tanggal mulai tidak valid.")
		return
	}
	endDate, err := parseOptionalApplicationDate(c.PostForm("end_date"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format tanggal selesai tidak valid.")
		return
	}
	if startDate != nil && endDate != nil && endDate.Before(*startDate) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Tanggal selesai tidak boleh sebelum tanggal mulai.")
		return
	}

	identity, err := h.requiredDocument(c, "identity_document")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	requestLetter, err := h.requiredDocument(c, "request_letter")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	proposal, err := h.requiredDocument(c, "proposal_document")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	identityPath, err := h.fileStorage.SaveBimtekMagangDocument(c.Request.Context(), identity)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan dokumen identitas.")
		return
	}
	requestLetterPath, err := h.fileStorage.SaveBimtekMagangDocument(c.Request.Context(), requestLetter)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan surat permohonan.")
		return
	}
	proposalPath, err := h.fileStorage.SaveBimtekMagangDocument(c.Request.Context(), proposal)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan proposal.")
		return
	}

	application, err := services.CreateBimtekMagangApplication(userID, services.BimtekMagangApplicationInput{
		RequestType:      requestType,
		Topic:            topic,
		StartDate:        startDate,
		EndDate:          endDate,
		IdentityDocument: identityPath,
		RequestLetter:    requestLetterPath,
		ProposalDocument: proposalPath,
	})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan pengajuan BIMTEK/Magang.")
		return
	}

	utils.DataResponse(c, http.StatusCreated, "Pengajuan BIMTEK/Magang berhasil dikirim.", application)
}

func (h *BimtekMagangHandler) requiredDocument(c *gin.Context, field string) (*multipart.FileHeader, error) {
	file, err := c.FormFile(field)
	if err != nil {
		return nil, errors.New("Semua dokumen wajib diunggah.")
	}
	if file.Size == 0 || file.Size > maxBimtekMagangDocumentSize {
		return nil, errors.New("Ukuran setiap dokumen harus lebih dari 0 dan maksimal 10 MB.")
	}
	switch strings.ToLower(filepath.Ext(file.Filename)) {
	case ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png":
		return file, nil
	default:
		return nil, errors.New("Format dokumen harus PDF, DOC, DOCX, JPG, JPEG, atau PNG.")
	}
}

func (h *BimtekMagangHandler) GetMyApplications(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}
	applications, err := services.GetBimtekMagangApplicationsByUser(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat pengajuan BIMTEK/Magang.")
		return
	}
	utils.DataResponse(c, http.StatusOK, "Daftar pengajuan berhasil dimuat.", applications)
}

func (h *BimtekMagangHandler) GetAllApplications(c *gin.Context) {
	applications, err := services.GetAllBimtekMagangApplications()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat pengajuan BIMTEK/Magang.")
		return
	}
	utils.DataResponse(c, http.StatusOK, "Daftar pengajuan berhasil dimuat.", applications)
}

func (h *BimtekMagangHandler) GetDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}

	application, err := services.GetBimtekMagangApplicationByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat dokumen pengajuan.")
		return
	}

	var location string
	switch c.Param("document") {
	case "identity":
		location = application.IdentityDocument
	case "request-letter":
		location = application.RequestLetter
	case "proposal":
		location = application.ProposalDocument
	case "reply-letter":
		if application.ReplyLetter == "" {
			utils.ErrorResponse(c, http.StatusNotFound, "Surat balasan belum tersedia.")
			return
		}
		location = application.ReplyLetter
	default:
		utils.ErrorResponse(c, http.StatusNotFound, "Dokumen tidak ditemukan.")
		return
	}

	resolvedLocation, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, location)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyiapkan dokumen untuk diunduh.")
		return
	}
	utils.DataResponse(c, http.StatusOK, "Dokumen siap dibuka.", gin.H{"url": resolvedLocation})
}

func (h *BimtekMagangHandler) DeleteApplication(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}
	if err := services.DeleteBimtekMagangApplication(uint(id)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus pengajuan BIMTEK/Magang.")
		return
	}
	utils.MessageResponse(c, http.StatusOK, "Pengajuan BIMTEK/Magang berhasil dihapus.")
}

func (h *BimtekMagangHandler) Review(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}
	var request struct {
		Verified *bool  `json:"verified"`
		Note     string `json:"note"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data verifikasi tidak valid.")
		return
	}
	if request.Verified == nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Status verifikasi wajib dipilih.")
		return
	}
	if *request.Verified {
		utils.ErrorResponse(c, http.StatusBadRequest, services.ErrBimtekMagangReplyLetterRequired.Error())
		return
	}
	request.Note = strings.TrimSpace(request.Note)
	if len(request.Note) > 2000 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Catatan verifikasi maksimal 2.000 karakter.")
		return
	}
	if err := services.ReviewBimtekMagangApplication(uint(id), *request.Verified, request.Note); err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
		case errors.Is(err, services.ErrBimtekMagangApplicationStateConflict):
			utils.ErrorResponse(c, http.StatusConflict, err.Error())
		default:
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.MessageResponse(c, http.StatusOK, "Verifikasi berkas berhasil disimpan.")
}

func (h *BimtekMagangHandler) VerifyWithReplyLetter(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}
	application, err := services.GetBimtekMagangApplicationByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat pengajuan.")
		return
	}
	if application.Status != "Menunggu Verifikasi" {
		utils.ErrorResponse(c, http.StatusConflict, services.ErrBimtekMagangApplicationStateConflict.Error())
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 12*1024*1024)
	file, err := c.FormFile("reply_letter")
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			utils.ErrorResponse(c, http.StatusRequestEntityTooLarge, "Ukuran surat balasan maksimal 10 MB.")
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "Surat balasan PDF wajib diunggah bersama verifikasi.")
		}
		return
	}
	if file.Size == 0 || file.Size > maxBimtekMagangDocumentSize || strings.ToLower(filepath.Ext(file.Filename)) != ".pdf" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Surat balasan harus berupa PDF maksimal 10 MB.")
		return
	}
	openedFile, err := file.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal membaca surat balasan.")
		return
	}
	signature := make([]byte, 5)
	_, readErr := io.ReadFull(openedFile, signature)
	closeErr := openedFile.Close()
	if readErr != nil || closeErr != nil || string(signature) != "%PDF-" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Isi surat balasan bukan dokumen PDF yang valid.")
		return
	}

	filePath, err := h.fileStorage.SaveBimtekMagangDocument(c.Request.Context(), file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan surat balasan.")
		return
	}
	if err := services.VerifyBimtekMagangApplicationWithReplyLetter(uint(id), filePath); err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
		case errors.Is(err, services.ErrBimtekMagangApplicationStateConflict):
			utils.ErrorResponse(c, http.StatusConflict, err.Error())
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memverifikasi pengajuan dan mengirim surat balasan.")
		}
		return
	}
	utils.MessageResponse(c, http.StatusOK, "Pengajuan berhasil diverifikasi dan surat balasan dikirim kepada customer.")
}

func (h *BimtekMagangHandler) SendReplyLetter(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}
	application, err := services.GetBimtekMagangApplicationByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat pengajuan.")
		return
	}
	if application.Status != "Berkas Terverifikasi" {
		utils.ErrorResponse(c, http.StatusConflict, "Surat balasan hanya dapat dikirim setelah berkas terverifikasi.")
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 12*1024*1024)
	file, err := c.FormFile("reply_letter")
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			utils.ErrorResponse(c, http.StatusRequestEntityTooLarge, "Ukuran surat balasan maksimal 10 MB.")
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "Surat balasan wajib diunggah.")
		}
		return
	}
	if file.Size == 0 || file.Size > maxBimtekMagangDocumentSize || strings.ToLower(filepath.Ext(file.Filename)) != ".pdf" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Surat balasan harus berupa PDF maksimal 10 MB.")
		return
	}
	filePath, err := h.fileStorage.SaveBimtekMagangDocument(c.Request.Context(), file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan surat balasan.")
		return
	}
	if err := services.SendBimtekMagangReplyLetter(uint(id), filePath); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Pengajuan tidak ditemukan.")
		} else if errors.Is(err, services.ErrBimtekMagangApplicationStateConflict) {
			utils.ErrorResponse(c, http.StatusConflict, err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengirim surat balasan.")
		}
		return
	}
	utils.MessageResponse(c, http.StatusOK, "Surat balasan perizinan berhasil dikirim kepada customer.")
}

func (h *BimtekMagangHandler) GetMyReplyLetter(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengajuan tidak valid.")
		return
	}
	application, err := services.GetBimtekMagangReplyLetterByUser(uint(id), userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Surat balasan belum tersedia.")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat surat balasan.")
		return
	}
	location, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, application.ReplyLetter)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyiapkan surat balasan.")
		return
	}
	utils.DataResponse(c, http.StatusOK, "Surat balasan siap dibuka.", gin.H{"url": location})
}

func parseOptionalApplicationDate(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, err
	}
	return &date, nil
}
