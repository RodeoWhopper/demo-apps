// Package handlers wires HTTP routes to the store.
package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"kisalink/internal/store"
	"kisalink/internal/web"
)

// Deps holds everything the handlers need.
type Deps struct {
	Store     *store.Store
	BaseURL   string
	AdminUser string
	AdminPass string
}

type Handler struct {
	deps Deps
}

// Register mounts all routes on the router. The admin group is protected
// with HTTP Basic Auth; everything else is public.
func Register(r *gin.Engine, d Deps) {
	h := &Handler{deps: d}

	r.StaticFS("/static", http.FS(web.Static()))
	r.GET("/healthz", h.health)
	r.GET("/", h.index)
	r.POST("/shorten", h.shorten)
	r.GET("/api/links/:code", h.apiLink)
	r.GET("/:code", h.redirect)
	r.GET("/:code/stats", h.stats)
	r.NoRoute(h.notFound)

	admin := r.Group("/admin", gin.BasicAuth(gin.Accounts{d.AdminUser: d.AdminPass}))
	admin.GET("", h.adminIndex)
	admin.POST("/links/:code/delete", h.adminDelete)
	admin.GET("/export.csv", h.adminExport)
}

// linkView is what templates and the JSON API see.
type linkView struct {
	Code        string     `json:"code"`
	URL         string     `json:"url"`
	ShortURL    string     `json:"short_url"`
	StatsURL    string     `json:"stats_url"`
	Clicks      int64      `json:"clicks"`
	CreatedAt   time.Time  `json:"created_at"`
	LastClickAt *time.Time `json:"last_click_at"`
}

func (h *Handler) view(l store.Link) linkView {
	return linkView{
		Code:        l.Code,
		URL:         l.URL,
		ShortURL:    h.deps.BaseURL + "/" + l.Code,
		StatsURL:    h.deps.BaseURL + "/" + l.Code + "/stats",
		Clicks:      l.Clicks,
		CreatedAt:   l.CreatedAt,
		LastClickAt: l.LastClickAt,
	}
}

func (h *Handler) views(ls []store.Link) []linkView {
	out := make([]linkView, 0, len(ls))
	for _, l := range ls {
		out = append(out, h.view(l))
	}
	return out
}

func (h *Handler) page(c *gin.Context, extra gin.H) gin.H {
	data := gin.H{
		"Brand":   "Kısa.link",
		"BaseURL": h.deps.BaseURL,
		"Path":    c.Request.URL.Path,
		"Year":    time.Now().Year(),
	}
	for k, v := range extra {
		data[k] = v
	}
	return data
}

func wantsJSON(c *gin.Context) bool {
	return strings.HasPrefix(c.ContentType(), "application/json") ||
		strings.Contains(c.GetHeader("Accept"), "application/json")
}

func (h *Handler) health(c *gin.Context) {
	if err := h.deps.Store.Ping(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "db": err.Error()})
		return
	}
	st, _ := h.deps.Store.Stats(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"status": "ok", "db": "ok", "links": st.Links})
}

func (h *Handler) renderIndex(c *gin.Context, status int, extra gin.H) {
	ctx := c.Request.Context()
	recent, _ := h.deps.Store.List(ctx, 5)
	st, _ := h.deps.Store.Stats(ctx)
	data := gin.H{"Title": "Uzun linkleri kısaltın", "Recent": h.views(recent), "Stats": st}
	for k, v := range extra {
		data[k] = v
	}
	c.HTML(status, "index.html", h.page(c, data))
}

func (h *Handler) index(c *gin.Context) {
	h.renderIndex(c, http.StatusOK, nil)
}

type shortenInput struct {
	URL   string `json:"url"   form:"url"`
	Alias string `json:"alias" form:"alias"`
}

// shorten accepts application/json or a classic HTML form post.
func (h *Handler) shorten(c *gin.Context) {
	var in shortenInput
	json := wantsJSON(c)
	if err := c.ShouldBind(&in); err != nil {
		h.shortenError(c, json, http.StatusBadRequest, "malformed request body", in)
		return
	}

	target, err := NormalizeURL(in.URL)
	if err != nil {
		h.shortenError(c, json, http.StatusBadRequest, err.Error(), in)
		return
	}
	alias := strings.TrimSpace(in.Alias)
	if alias != "" {
		if err := store.ValidateAlias(alias); err != nil {
			h.shortenError(c, json, http.StatusBadRequest, err.Error(), in)
			return
		}
	}

	link, err := h.deps.Store.Create(c.Request.Context(), alias, target)
	switch {
	case errors.Is(err, store.ErrCodeTaken):
		h.shortenError(c, json, http.StatusConflict, "that alias is already taken, pick another one", in)
		return
	case err != nil:
		h.shortenError(c, json, http.StatusInternalServerError, "could not save link", in)
		return
	}

	v := h.view(*link)
	if json {
		c.JSON(http.StatusCreated, v)
		return
	}
	h.renderIndex(c, http.StatusOK, gin.H{"Result": &v})
}

func (h *Handler) shortenError(c *gin.Context, json bool, status int, msg string, in shortenInput) {
	if json {
		c.JSON(status, gin.H{"error": msg})
		return
	}
	h.renderIndex(c, status, gin.H{"Error": msg, "Form": in})
}

func (h *Handler) redirect(c *gin.Context) {
	code := c.Param("code")
	target, err := h.deps.Store.Resolve(c.Request.Context(), code)
	if errors.Is(err, store.ErrNotFound) {
		h.notFound(c)
		return
	}
	if err != nil {
		c.String(http.StatusInternalServerError, "database error")
		return
	}
	// no-store so browsers always hit the server and the click is counted.
	c.Header("Cache-Control", "no-store")
	c.Redirect(http.StatusFound, target)
}

func (h *Handler) stats(c *gin.Context) {
	link, err := h.deps.Store.Get(c.Request.Context(), c.Param("code"))
	if errors.Is(err, store.ErrNotFound) {
		h.notFound(c)
		return
	}
	if err != nil {
		c.String(http.StatusInternalServerError, "database error")
		return
	}
	c.HTML(http.StatusOK, "stats.html", h.page(c, gin.H{
		"Title": "İstatistik · " + link.Code,
		"Link":  h.view(*link),
	}))
}

func (h *Handler) apiLink(c *gin.Context) {
	link, err := h.deps.Store.Get(c.Request.Context(), c.Param("code"))
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "link not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	c.JSON(http.StatusOK, h.view(*link))
}

func (h *Handler) notFound(c *gin.Context) {
	if wantsJSON(c) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.HTML(http.StatusNotFound, "notfound.html", h.page(c, gin.H{
		"Title": "Bağlantı bulunamadı",
		"Code":  strings.Trim(c.Request.URL.Path, "/"),
	}))
}
