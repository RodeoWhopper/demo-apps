package store

import (
	"strings"
	"testing"
)

func TestGenerateCodeLengthAndAlphabet(t *testing.T) {
	for _, n := range []int{1, 7, 12} {
		code, err := GenerateCode(n)
		if err != nil {
			t.Fatalf("GenerateCode(%d): %v", n, err)
		}
		if len(code) != n {
			t.Fatalf("expected length %d, got %q", n, code)
		}
		for _, r := range code {
			if !strings.ContainsRune(alphabet, r) {
				t.Fatalf("character %q not in alphabet", r)
			}
		}
	}
}

func TestGenerateCodeIsRandom(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 500; i++ {
		code, err := GenerateCode(DefaultCodeLength)
		if err != nil {
			t.Fatal(err)
		}
		if seen[code] {
			t.Fatalf("duplicate code generated: %s", code)
		}
		seen[code] = true
	}
}

func TestValidateAlias(t *testing.T) {
	cases := map[string]error{
		"my-link":   nil,
		"abc":       nil,
		"Under_Sc0": nil,
		"ab":        ErrInvalidAlias,
		"has space": ErrInvalidAlias,
		"ünïcode":   ErrInvalidAlias,
		"admin":     ErrReservedAlias,
		"healthz":   ErrReservedAlias,
		"api":       ErrReservedAlias,
	}
	for alias, want := range cases {
		if got := ValidateAlias(alias); got != want {
			t.Errorf("ValidateAlias(%q) = %v, want %v", alias, got, want)
		}
	}
}
