package store

import (
	"crypto/rand"
	"errors"
	"regexp"
)

// alphabet deliberately omits look-alike characters (0/O, 1/l/I).
const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// DefaultCodeLength gives ~57^7 (≈2×10^12) possible generated codes.
const DefaultCodeLength = 7

var (
	ErrInvalidAlias  = errors.New("alias must be 3-32 characters: letters, digits, '-' or '_'")
	ErrReservedAlias = errors.New("alias is reserved")

	aliasPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{3,32}$`)

	// Path segments that collide with application routes.
	reserved = map[string]struct{}{
		"admin": {}, "api": {}, "healthz": {}, "shorten": {}, "static": {},
		"stats": {}, "favicon.ico": {}, "robots.txt": {}, "login": {}, "logout": {},
	}
)

// GenerateCode returns a random short code of length n using rejection
// sampling so every character is uniformly distributed.
func GenerateCode(n int) (string, error) {
	if n <= 0 {
		n = DefaultCodeLength
	}
	limit := 256 - (256 % len(alphabet))
	out := make([]byte, 0, n)
	buf := make([]byte, n*2)
	for len(out) < n {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		for _, b := range buf {
			if int(b) >= limit {
				continue
			}
			out = append(out, alphabet[int(b)%len(alphabet)])
			if len(out) == n {
				break
			}
		}
	}
	return string(out), nil
}

// ValidateAlias checks a user supplied custom alias.
func ValidateAlias(alias string) error {
	if !aliasPattern.MatchString(alias) {
		return ErrInvalidAlias
	}
	if _, ok := reserved[alias]; ok {
		return ErrReservedAlias
	}
	return nil
}
