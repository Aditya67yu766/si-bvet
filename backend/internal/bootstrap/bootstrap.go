package bootstrap

import (
	"context"
	"os"
	"si-bvet/internal/handlers"
	"si-bvet/internal/routes"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	authService := services.NewAuthService(&services.DefaultUserRepository{})
	documentStorage, err := storage.NewRegistrationDocumentStorage(context.Background())
	if err != nil {
		panic(err)
	}
	uploadStorage, err := storage.NewUploadStorage(context.Background())
	if err != nil {
		panic(err)
	}

	authHandler := handlers.NewAuthHandler(authService, documentStorage)
	submissionHandler := handlers.NewSubmissionHandler(services.NewSubmissionService(), uploadStorage)

	r := gin.Default()

	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}
	if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	routes.RegisterRoutes(r, routes.Dependencies{
		AuthHandler:         authHandler,
		SubmissionHandler:   submissionHandler,
		AdminHandler:        handlers.NewAdminHandlerWithStorage(uploadStorage),
		ComplaintHandler:    handlers.NewComplaintHandlerWithStorage(uploadStorage),
		FeedbackHandler:     handlers.NewFeedbackHandlerWithDefault(),
		NotificationHandler: handlers.NewNotificationHandlerWithDefault(),
		UserHandler:         handlers.NewUserHandlerWithDefault(),
		LHUHandler:          handlers.NewLHUHandlerWithStorage(uploadStorage),
		TestServiceHandler:  handlers.NewTestServiceHandlerWithDefault(),
		BillingHandler:      handlers.NewBillingHandlerWithStorage(uploadStorage),
		ActivityLogHandler:  handlers.NewActivityLogHandler(services.NewActivityLogService()),
		BimtekMagangHandler: handlers.NewBimtekMagangHandler(uploadStorage),
	})

	return r
}
