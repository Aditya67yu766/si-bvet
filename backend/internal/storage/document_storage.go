package storage

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
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
