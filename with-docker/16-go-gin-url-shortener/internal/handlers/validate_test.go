package handlers

import "testing"

func TestNormalizeURL(t *testing.T) {
	ok := map[string]string{
		"https://example.com/a?b=1": "https://example.com/a?b=1",
		"  http://example.org  ":    "http://example.org",
		"example.com/path":          "https://example.com/path",
		"http://localhost:3000/x":   "http://localhost:3000/x",
	}
	for in, want := range ok {
		got, err := NormalizeURL(in)
		if err != nil || got != want {
			t.Errorf("NormalizeURL(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
	for _, bad := range []string{"", "ftp://example.com", "javascript:alert(1)", "http://", "not a url", "mailto:a@b.co"} {
		if _, err := NormalizeURL(bad); err == nil {
			t.Errorf("NormalizeURL(%q) should fail", bad)
		}
	}
}
