package handlers

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
)

var ErrInvalidURL = errors.New("enter an absolute http(s) URL, e.g. https://example.com/page")

var schemeRe = regexp.MustCompile(`^([a-zA-Z][a-zA-Z0-9+.\-]*):(.*)$`)

// NormalizeURL trims the input, defaults to https:// when no scheme is given
// and rejects anything that is not an absolute http(s) URL.
func NormalizeURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > 2048 || strings.ContainsAny(raw, " \t\r\n") {
		return "", ErrInvalidURL
	}
	if m := schemeRe.FindStringSubmatch(raw); m != nil {
		scheme, rest := strings.ToLower(m[1]), m[2]
		switch {
		case scheme == "http" || scheme == "https":
			// already absolute
		case rest != "" && rest[0] >= '0' && rest[0] <= '9':
			raw = "https://" + raw // "localhost:3000/x" – a host:port, not a scheme
		default:
			return "", ErrInvalidURL // mailto:, javascript:, ftp://, file:// ...
		}
	} else {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", ErrInvalidURL
	}
	host := u.Hostname()
	if (u.Scheme != "http" && u.Scheme != "https") || host == "" || (!strings.Contains(host, ".") && host != "localhost") {
		return "", ErrInvalidURL
	}
	return u.String(), nil
}
