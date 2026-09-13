// Kısa.link – a small URL shortener built with Gin, embedded html/template
// views and a pure-Go SQLite store.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"kisalink/internal/handlers"
	"kisalink/internal/store"
	"kisalink/internal/web"
)

type config struct {
	Port      string
	BaseURL   string
	AdminUser string
	AdminPass string
	DBPath    string
}

func loadConfig() config {
	port := envOr("PORT", "8016")
	return config{
		Port:      port,
		BaseURL:   strings.TrimRight(envOr("BASE_URL", "http://localhost:"+port), "/"),
		AdminUser: envOr("ADMIN_USER", "admin"),
		AdminPass: envOr("ADMIN_PASS", "Admin123!"),
		DBPath:    envOr("DB_PATH", filepath.Join("data", "kisa.db")),
	}
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func main() {
	cfg := loadConfig()

	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}
	st, err := store.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open database %s: %v", cfg.DBPath, err)
	}
	defer st.Close()

	seeded, err := st.Seed(context.Background())
	if err != nil {
		log.Fatalf("seed database: %v", err)
	}
	if seeded > 0 {
		log.Printf("seeded %d demo links", seeded)
	}

	// GIN_MODE is read by Gin itself at init (debug|release|test).
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.HTMLRender = web.NewRenderer()
	handlers.Register(router, handlers.Deps{
		Store:     st,
		BaseURL:   cfg.BaseURL,
		AdminUser: cfg.AdminUser,
		AdminPass: cfg.AdminPass,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("Kısa.link listening on :%s (base URL %s, db %s)", cfg.Port, cfg.BaseURL, cfg.DBPath)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	stop()
	log.Println("shutdown signal received, draining connections")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped")
}
