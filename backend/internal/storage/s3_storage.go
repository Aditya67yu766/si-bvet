package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3DocumentStorage struct {
	client     *s3.Client
	presign    *s3.PresignClient
	bucketName string
}

func NewS3DocumentStorage(ctx context.Context, bucketName string) (*S3DocumentStorage, error) {
	region := os.Getenv("S3_REGION")
	endpoint := os.Getenv("S3_ENDPOINT")
	accessKeyID := os.Getenv("S3_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("S3_SECRET_ACCESS_KEY")

	if bucketName == "" || region == "" || accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("S3 storage requires S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY")
	}

	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if endpoint != "" {
			return aws.Endpoint{
				URL:           endpoint,
				SigningRegion: region,
			}, nil
		}
		// fallback to default
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithEndpointResolverWithOptions(resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load s3 config: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		// Use path-style addressing for compatibility with MinIO, etc.
		if endpoint != "" {
			o.UsePathStyle = true
		}
	})

	return &S3DocumentStorage{
		client:     s3Client,
		presign:    s3.NewPresignClient(s3Client),
		bucketName: bucketName,
	}, nil
}

func (s *S3DocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "registration-docs", fileHeader)
}

func (s *S3DocumentStorage) SaveBimtekMagangDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang", fileHeader)
}

func (s *S3DocumentStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-attachments", fileHeader)
}

func (s *S3DocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "billing-proofs", fileHeader)
}

func (s *S3DocumentStorage) SaveBimtekMagangPaymentProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "bimtek-magang-payment-proofs", fileHeader)
}

func (s *S3DocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "complaints", fileHeader)
}

func (s *S3DocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "lhu", fileHeader)
}

func (s *S3DocumentStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "submission-sample-templates", fileHeader)
}

func (s *S3DocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	if location == "" {
		return "", nil
	}

	if !strings.HasPrefix(location, "s3://") {
		return location, nil
	}

	bucketName, objectKey, ok := parseS3Location(location)
	if !ok || bucketName != s.bucketName {
		return "", fmt.Errorf("invalid or unsupported s3 location: %s", location)
	}

	presignReq, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectKey),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 24 * time.Hour
	})
	if err != nil {
		return "", fmt.Errorf("failed to presign s3 url: %w", err)
	}

	return presignReq.URL, nil
}

func (s *S3DocumentStorage) ReadBimtekMagangPaymentProof(ctx context.Context, location string) ([]byte, error) {
	bucketName, objectKey, ok := parseS3Location(location)
	if !ok || bucketName != s.bucketName || !strings.HasPrefix(objectKey, "bimtek-magang-payment-proofs/") {
		return nil, fmt.Errorf("invalid magang payment proof location")
	}
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucketName,
		Key:    &objectKey,
	})
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()
	content, err := io.ReadAll(io.LimitReader(result.Body, 5*1024*1024+1))
	if err != nil {
		return nil, err
	}
	if len(content) > 5*1024*1024 {
		return nil, fmt.Errorf("billing proof exceeds maximum size")
	}
	return content, nil
}

func (s *S3DocumentStorage) DeleteBimtekMagangFiles(ctx context.Context, locations []string) (int, error) {
	objectKeys := make([]string, 0, len(locations))
	for _, location := range locations {
		bucketName, objectKey, ok := parseS3Location(location)
		if !ok || bucketName != s.bucketName || !isBimtekMagangObjectName(objectKey) {
			return len(locations), fmt.Errorf("invalid or unsupported S3 BIMTEK/Magang file location")
		}
		objectKeys = append(objectKeys, objectKey)
	}

	failed := 0
	var firstErr error
	for _, objectKey := range objectKeys {
		_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s.bucketName),
			Key:    aws.String(objectKey),
		})
		if err != nil {
			failed++
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return failed, firstErr
}

func (s *S3DocumentStorage) saveMultipartFile(ctx context.Context, objectPrefix string, fileHeader *multipart.FileHeader) (string, error) {
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

	objectKey := fmt.Sprintf("%s/%d-%s-%s", objectPrefix, time.Now().UnixNano(), uuid.NewString(), name)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(objectKey),
		Body:        file,
		ContentType: aws.String(fileHeader.Header.Get("Content-Type")),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to s3: %w", err)
	}

	return s3Location(s.bucketName, objectKey), nil
}
