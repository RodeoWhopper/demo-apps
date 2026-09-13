package handlers

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"kisalink/internal/store"
)

func (h *Handler) adminIndex(c *gin.Context) {
	ctx := c.Request.Context()
	links, err := h.deps.Store.List(ctx, 0)
	if err != nil {
		c.String(http.StatusInternalServerError, "database error")
		return
	}
	st, _ := h.deps.Store.Stats(ctx)
	c.HTML(http.StatusOK, "admin.html", h.page(c, gin.H{
		"Title":     "Yönetim paneli",
		"Links":     h.views(links),
		"Stats":     st,
		"AdminUser": c.MustGet(gin.AuthUserKey),
		"Deleted":   c.Query("deleted"),
	}))
}

func (h *Handler) adminDelete(c *gin.Context) {
	code := c.Param("code")
	err := h.deps.Store.Delete(c.Request.Context(), code)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		c.String(http.StatusInternalServerError, "database error")
		return
	}
	c.Redirect(http.StatusSeeOther, "/admin?deleted="+code)
}

func (h *Handler) adminExport(c *gin.Context) {
	links, err := h.deps.Store.List(c.Request.Context(), 0)
	if err != nil {
		c.String(http.StatusInternalServerError, "database error")
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="kisa-links-%s.csv"`, time.Now().Format("2006-01-02")))
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"code", "short_url", "url", "clicks", "created_at", "last_click_at"})
	for _, l := range h.views(links) {
		last := ""
		if l.LastClickAt != nil {
			last = l.LastClickAt.UTC().Format(time.RFC3339)
		}
		_ = w.Write([]string{l.Code, l.ShortURL, l.URL, strconv.FormatInt(l.Clicks, 10), l.CreatedAt.UTC().Format(time.RFC3339), last})
	}
	w.Flush()
}
