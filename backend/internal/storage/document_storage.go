package storage

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/compute/metadata"
	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	iamcredentials "google.golang.org/api/iamcredentials/v1"
	"google.golang.org/api/option"
)

type DocumentStorage interface {
	SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	ResolveDownloadLocation(ctx context.Context, location string) (string, error)
	SaveBimtekMagangPaymentProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	ReadBimtekMagangPaymentProof(ctx context.Context, location string) ([]byte, error)
	DeleteBimtekMagangFiles(ctx context.Context, locations []string) (int, error)
}

type LocalDocumentStorage struct {
	baseDir string
}

func NewLocalDocumentStorage(baseDir string) *LocalDocumentStorage {
	if baseDir == "" {
		baseDir = "/app/uploads"
	}

	return &LocalDocumentStorage{baseDir: baseDir}
}

func (s *LocalDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "registration-docs", fileHeader)
}

func (s *LocalDocumentStorage) SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang", fileHeader)
}

func (s *LocalDocumentStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-attachments", fileHeader)
}

func (s *LocalDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "billing-proofs", fileHeader)
}

func (s *LocalDocumentStorage) SaveBimtekMagangPaymentProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang-payment-proofs", fileHeader)
}

func (s *LocalDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "complaints", fileHeader)
}

func (s *LocalDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "lhu", fileHeader)
}

func (s *LocalDocumentStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-sample-templates", fileHeader)
}

func (s *LocalDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	_ = ctx

	if location == "" {
		return "", nil
	}

	if strings.HasPrefix(location, "/uploads/") {
		return location, nil
	}

	if strings.HasPrefix(location, "internal/uploads/") {
		relativePath := strings.TrimPrefix(filepath.ToSlash(location), "internal/uploads/")
		if relativePath == "" {
			return "/uploads/", nil
		}
		return "/uploads/" + relativePath, nil
	}

	return location, nil
}

func (s *LocalDocumentStorage) ReadBimtekMagangPaymentProof(ctx context.Context, location string) ([]byte, error) {
	_ = ctx
	var relativePath string
	switch {
	case strings.HasPrefix(location, "/uploads/bimtek-magang-payment-proofs/"):
		relativePath = strings.TrimPrefix(location, "/uploads/")
	case strings.HasPrefix(location, "internal/uploads/bimtek-magang-payment-proofs/"):
		relativePath = strings.TrimPrefix(filepath.ToSlash(location), "internal/uploads/")
	default:
		return nil, fmt.Errorf("invalid billing proof location")
	}

	cleanPath := filepath.Clean(filepath.FromSlash(relativePath))
	if filepath.IsAbs(cleanPath) || strings.HasPrefix(cleanPath, ".."+string(filepath.Separator)) ||
		!strings.HasPrefix(filepath.ToSlash(cleanPath), "bimtek-magang-payment-proofs"+"/") {
		return nil, fmt.Errorf("invalid billing proof location")
	}
	filePath := filepath.Join(s.baseDir, cleanPath)
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() || info.Size() > 5*1024*1024 {
		return nil, fmt.Errorf("invalid billing proof file")
	}
	return os.ReadFile(filePath)
}

func (s *LocalDocumentStorage) DeleteBimtekMagangFiles(ctx context.Context, locations []string) (int, error) {
	_ = ctx
	filePaths := make([]string, 0, len(locations))
	for _, location := range locations {
		filePath, err := s.localBimtekMagangFilePath(location)
		if err != nil {
			return len(locations), err
		}
		filePaths = append(filePaths, filePath)
	}

	failed := 0
	var firstErr error
	for _, filePath := range filePaths {
		if err := os.Remove(filePath); err != nil && !errors.Is(err, os.ErrNotExist) {
			failed++
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return failed, firstErr
}

func (s *LocalDocumentStorage) localBimtekMagangFilePath(location string) (string, error) {
	var relativePath string
	switch {
	case strings.HasPrefix(location, "/uploads/"):
		relativePath = strings.TrimPrefix(location, "/uploads/")
	case strings.HasPrefix(filepath.ToSlash(location), "internal/uploads/"):
		relativePath = strings.TrimPrefix(filepath.ToSlash(location), "internal/uploads/")
	default:
		return "", fmt.Errorf("invalid local BIMTEK/Magang file location")
	}

	cleanPath := filepath.Clean(filepath.FromSlash(relativePath))
	normalizedPath := filepath.ToSlash(cleanPath)
	if filepath.IsAbs(cleanPath) || strings.HasPrefix(normalizedPath, "../") ||
		(normalizedPath != "bimtek-magang" && !strings.HasPrefix(normalizedPath, "bimtek-magang/")) &&
			(normalizedPath != "bimtek-magang-payment-proofs" && !strings.HasPrefix(normalizedPath, "bimtek-magang-payment-proofs/")) {
		return "", fmt.Errorf("invalid local BIMTEK/Magang file location")
	}

	baseDir, err := filepath.Abs(s.baseDir)
	if err != nil {
		return "", err
	}
	filePath := filepath.Join(baseDir, cleanPath)
	relativeToBase, err := filepath.Rel(baseDir, filePath)
	if err != nil || relativeToBase == ".." || strings.HasPrefix(relativeToBase, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("local BIMTEK/Magang file is outside the upload directory")
	}
	info, err := os.Lstat(filePath)
	if errors.Is(err, os.ErrNotExist) {
		return filePath, nil
	}
	if err != nil {
		return "", err
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("local BIMTEK/Magang upload is not a regular file")
	}
	resolvedBase, err := filepath.EvalSymlinks(baseDir)
	if err != nil {
		return "", err
	}
	resolvedFile, err := filepath.EvalSymlinks(filePath)
	if err != nil {
		return "", err
	}
	resolvedRelative, err := filepath.Rel(resolvedBase, resolvedFile)
	if err != nil || resolvedRelative == ".." ||
		strings.HasPrefix(resolvedRelative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("local BIMTEK/Magang file resolves outside the upload directory")
	}
	return filePath, nil
}

func (s *LocalDocumentStorage) saveMultipartFile(ctx context.Context, objectPrefix string, fileHeader *multipart.FileHeader) (string, error) {
	_ = ctx

	if fileHeader == nil {
		return "", fmt.Errorf("file is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	name := sanitizeFileName(fileHeader.Filename)
	if name == "" {
		name = objectPrefix
	}

	relativePath := filepath.Join(objectPrefix, fmt.Sprintf("%d-%s-%s", time.Now().UnixNano(), uuid.NewString(), name))
	absolutePath := filepath.Join(s.baseDir, relativePath)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", err
	}

	destination, err := os.Create(absolutePath)
	if err != nil {
		return "", err
	}
	defer destination.Close()

	if _, err := io.Copy(destination, file); err != nil {
		return "", err
	}

	return "/uploads/" + filepath.ToSlash(relativePath), nil
}

type GCSDocumentStorage struct {
	bucketName  string
	client      *storage.Client
	signerEmail string
	privateKey  []byte
	iamService  *iamcredentials.Service
}

type serviceAccountCredentials struct {
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
}

func NewGCSDocumentStorage(ctx context.Context, bucketName string, credentialsFile string) (*GCSDocumentStorage, error) {
	if bucketName == "" {
		return nil, fmt.Errorf("GCS bucket name is required")
	}

	var opts []option.ClientOption
	if credentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}

	client, err := storage.NewClient(ctx, opts...)
	if err != nil {
		return nil, err
	}

	storageImpl := &GCSDocumentStorage{
		bucketName: bucketName,
		client:     client,
	}

	if credentialsFile != "" {
		credentials, err := readServiceAccountCredentials(credentialsFile)
		if err != nil {
			return nil, err
		}

		storageImpl.signerEmail = credentials.ClientEmail
		storageImpl.privateKey = []byte(credentials.PrivateKey)
	} else {
		if signerEmail := os.Getenv("GCS_SIGNER_EMAIL"); signerEmail != "" {
			storageImpl.signerEmail = signerEmail
		}

		if storageImpl.signerEmail == "" {
			if signerEmail, err := metadata.Email("default"); err == nil {
				storageImpl.signerEmail = signerEmail
			}
		}

		if storageImpl.signerEmail != "" {
			iamService, err := iamcredentials.NewService(ctx)
			if err != nil {
				return nil, err
			}
			storageImpl.iamService = iamService
		}
	}

	return storageImpl, nil
}

func (s *GCSDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "registration-docs", fileHeader)
}

func (s *GCSDocumentStorage) SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang", fileHeader)
}

func (s *GCSDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "billing-proofs", fileHeader)
}

func (s *GCSDocumentStorage) SaveBimtekMagangPaymentProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang-payment-proofs", fileHeader)
}

func (s *GCSDocumentStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-attachments", fileHeader)
}

func (s *GCSDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "complaints", fileHeader)
}

func (s *GCSDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "lhu", fileHeader)
}

func (s *GCSDocumentStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-sample-templates", fileHeader)
}

func (s *GCSDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	if location == "" {
		return "", nil
	}

	if strings.HasPrefix(location, "http://") || strings.HasPrefix(location, "https://") {
		return location, nil
	}

	bucketName, objectName, ok := parseGCSLocation(location)
	if !ok {
		return location, nil
	}

	if bucketName != s.bucketName {
		return "", fmt.Errorf("gcs object belongs to unsupported bucket %s", bucketName)
	}

	options := &storage.SignedURLOptions{
		Method:  http.MethodGet,
		Expires: time.Now().Add(24 * time.Hour),
		Scheme:  storage.SigningSchemeV4,
	}

	if len(s.privateKey) > 0 && s.signerEmail != "" {
		options.GoogleAccessID = s.signerEmail
		options.PrivateKey = s.privateKey
	} else if s.iamService != nil && s.signerEmail != "" {
		options.GoogleAccessID = s.signerEmail
		options.SignBytes = s.signBytesWithIAM
	} else {
		return "", fmt.Errorf("gcs signed url requires a service account signer")
	}

	url, err := storage.SignedURL(s.bucketName, objectName, options)
	if err != nil {
		return "", err
	}

	return url, nil
}

func (s *GCSDocumentStorage) ReadBimtekMagangPaymentProof(ctx context.Context, location string) ([]byte, error) {
	bucketName, objectName, ok := parseGCSLocation(location)
	if !ok || bucketName != s.bucketName || !strings.HasPrefix(objectName, "bimtek-magang-payment-proofs/") {
		return nil, fmt.Errorf("invalid magang payment proof location")
	}
	reader, err := s.client.Bucket(bucketName).Object(objectName).NewReader(ctx)
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	return readBillingProof(reader)
}

func (s *GCSDocumentStorage) DeleteBimtekMagangFiles(ctx context.Context, locations []string) (int, error) {
	objectNames := make([]string, 0, len(locations))
	for _, location := range locations {
		bucketName, objectName, ok := parseGCSLocation(location)
		if !ok || bucketName != s.bucketName || !isBimtekMagangObjectName(objectName) {
			return len(locations), fmt.Errorf("invalid or unsupported GCS BIMTEK/Magang file location")
		}
		objectNames = append(objectNames, objectName)
	}

	failed := 0
	var firstErr error
	for _, objectName := range objectNames {
		err := s.client.Bucket(s.bucketName).Object(objectName).Delete(ctx)
		if err != nil && !errors.Is(err, storage.ErrObjectNotExist) {
			failed++
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return failed, firstErr
}

func readBillingProof(reader io.Reader) ([]byte, error) {
	content, err := io.ReadAll(io.LimitReader(reader, 5*1024*1024+1))
	if err != nil {
		return nil, err
	}
	if len(content) > 5*1024*1024 {
		return nil, fmt.Errorf("billing proof exceeds maximum size")
	}
	return content, nil
}

func isBimtekMagangObjectName(objectName string) bool {
	if path.IsAbs(objectName) || path.Clean(objectName) != objectName {
		return false
	}
	return strings.HasPrefix(objectName, "bimtek-magang/") ||
		strings.HasPrefix(objectName, "bimtek-magang-payment-proofs/")
}

func (s *GCSDocumentStorage) signBytesWithIAM(b []byte) ([]byte, error) {
	if s.iamService == nil || s.signerEmail == "" {
		return nil, fmt.Errorf("gcs signer is not configured")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := s.iamService.Projects.ServiceAccounts.SignBlob(
		"projects/-/serviceAccounts/"+s.signerEmail,
		&iamcredentials.SignBlobRequest{Payload: base64.StdEncoding.EncodeToString(b)},
	).Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	return base64.StdEncoding.DecodeString(resp.SignedBlob)
}

func (s *GCSDocumentStorage) saveMultipartFile(ctx context.Context, objectPrefix string, fileHeader *multipart.FileHeader) (string, error) {
	if fileHeader == nil {
		return "", fmt.Errorf("file is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	name := sanitizeFileName(fileHeader.Filename)
	if name == "" {
		name = objectPrefix
	}

	objectName := fmt.Sprintf("%s/%d-%s-%s", objectPrefix, time.Now().UnixNano(), uuid.NewString(), name)
	writer := s.client.Bucket(s.bucketName).Object(objectName).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")

	if _, err := io.Copy(writer, file); err != nil {
		_ = writer.Close()
		return "", err
	}

	if err := writer.Close(); err != nil {
		return "", err
	}

	return gcsLocation(s.bucketName, objectName), nil
}

func sanitizeFileName(fileName string) string {
	fileName = filepath.Base(strings.TrimSpace(fileName))
	fileName = strings.ReplaceAll(fileName, " ", "_")
	fileName = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '.', r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, fileName)
	return strings.Trim(fileName, "-._")
}

func NewRegistrationDocumentStorage(ctx context.Context) (DocumentStorage, error) {
	return NewUploadStorage(ctx)
}

func NewUploadStorage(ctx context.Context) (DocumentStorage, error) {
	bucketName := os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = os.Getenv("GCS_BUCKET")
	}

	if bucketName != "" {
		credentialsFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		return NewGCSDocumentStorage(ctx, bucketName, credentialsFile)
	}

	// Cek apakah user menggunakan S3-Compatible Storage (AWS, DigitalOcean Spaces, Cloudflare R2, dll)
	s3Bucket := os.Getenv("S3_BUCKET_NAME")
	if s3Bucket != "" {
		fmt.Println("S3 Storage detected, initializing S3 client...")
		return NewS3DocumentStorage(ctx, s3Bucket)
	}

	localUploadDir := os.Getenv("LOCAL_UPLOAD_DIR")

	return NewLocalDocumentStorage(localUploadDir), nil
}

func gcsLocation(bucketName, objectName string) string {
	return "gs://" + bucketName + "/" + filepath.ToSlash(objectName)
}

func parseGCSLocation(location string) (string, string, bool) {
	if !strings.HasPrefix(location, "gs://") {
		return "", "", false
	}

	trimmed := strings.TrimPrefix(location, "gs://")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}

	return parts[0], parts[1], true
}

func readServiceAccountCredentials(credentialsFile string) (*serviceAccountCredentials, error) {
	content, err := os.ReadFile(credentialsFile)
	if err != nil {
		return nil, err
	}

	var credentials serviceAccountCredentials
	if err := json.Unmarshal(content, &credentials); err != nil {
		return nil, err
	}

	if credentials.ClientEmail == "" || credentials.PrivateKey == "" {
		return nil, fmt.Errorf("invalid service account credentials in %s", credentialsFile)
	}

	return &credentials, nil
}

func s3Location(bucketName, objectKey string) string {
	return "s3://" + bucketName + "/" + filepath.ToSlash(objectKey)
}

func parseS3Location(location string) (string, string, bool) {
	if !strings.HasPrefix(location, "s3://") {
		return "", "", false
	}

	trimmed := strings.TrimPrefix(location, "s3://")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}

	return parts[0], parts[1], true
}
