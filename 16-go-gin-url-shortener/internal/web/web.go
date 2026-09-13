// Package web embeds the HTML templates and static assets into the binary.
package web

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin/render"
)

//go:embed templates/layout.html templates/pages/*.html
var templateFS embed.FS

//go:embed static/*
var staticFS embed.FS

// Static returns the embedded static directory rooted at "/".
func Static() fs.FS {
	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err)
	}
	return sub
}

var funcs = template.FuncMap{
	"trunc": func(n int, s string) string {
		if len(s) <= n {
			return s
		}
		return s[:n-1] + "…"
	},
	"date": func(t time.Time) string {
		if t.IsZero() {
			return "–"
		}
		return t.Local().Format("02 Jan 2006 15:04")
	},
	"datep": func(t *time.Time) string {
		if t == nil {
			return "henüz yok"
		}
		return t.Local().Format("02 Jan 2006 15:04")
	},
	"hasPrefix": strings.HasPrefix,
}

// Renderer implements gin's render.HTMLRender. Every page is parsed together
// with the shared layout into its own template set so pages can each define
// their own "content" and "title" blocks.
type Renderer struct {
	pages map[string]*template.Template
}

// NewRenderer parses all embedded templates; it panics on syntax errors so
// a broken template fails fast at startup instead of at request time.
func NewRenderer() *Renderer {
	entries, err := fs.ReadDir(templateFS, "templates/pages")
	if err != nil {
		panic(err)
	}
	pages := make(map[string]*template.Template, len(entries))
	for _, e := range entries {
		name := e.Name()
		pages[name] = template.Must(
			template.New(name).Funcs(funcs).ParseFS(templateFS, "templates/layout.html", "templates/pages/"+name),
		)
	}
	return &Renderer{pages: pages}
}

// Instance is called by gin for every c.HTML(...) invocation.
func (r *Renderer) Instance(name string, data any) render.Render {
	return &pageRender{tmpl: r.pages[name], name: name, data: data}
}

type pageRender struct {
	tmpl *template.Template
	name string
	data any
}

func (p *pageRender) Render(w http.ResponseWriter) error {
	p.WriteContentType(w)
	if p.tmpl == nil {
		return fmt.Errorf("template %q not found", p.name)
	}
	return p.tmpl.ExecuteTemplate(w, "layout", p.data)
}

func (p *pageRender) WriteContentType(w http.ResponseWriter) {
	w.Header()["Content-Type"] = []string{"text/html; charset=utf-8"}
}
