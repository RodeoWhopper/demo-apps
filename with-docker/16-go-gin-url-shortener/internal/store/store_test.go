package store

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestCreateGetAndResolve(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	link, err := s.Create(ctx, "", "https://example.com/page")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if len(link.Code) != DefaultCodeLength {
		t.Fatalf("generated code %q has wrong length", link.Code)
	}

	got, err := s.Get(ctx, link.Code)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.URL != "https://example.com/page" || got.Clicks != 0 || got.LastClickAt != nil {
		t.Fatalf("unexpected link: %+v", got)
	}

	for i := 0; i < 3; i++ {
		target, err := s.Resolve(ctx, link.Code)
		if err != nil || target != "https://example.com/page" {
			t.Fatalf("resolve: target=%q err=%v", target, err)
		}
	}
	got, _ = s.Get(ctx, link.Code)
	if got.Clicks != 3 || got.LastClickAt == nil {
		t.Fatalf("expected 3 clicks with last_click_at set, got %+v", got)
	}

	if _, err := s.Resolve(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestCustomAliasMustBeUnique(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	if _, err := s.Create(ctx, "docs", "https://example.com/a"); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if _, err := s.Create(ctx, "docs", "https://example.com/b"); !errors.Is(err, ErrCodeTaken) {
		t.Fatalf("expected ErrCodeTaken, got %v", err)
	}
}

func TestDeleteListAndStats(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	for _, code := range []string{"one", "two", "three"} {
		if _, err := s.Create(ctx, code, "https://example.com/"+code); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Resolve(ctx, "two"); err != nil {
		t.Fatal(err)
	}

	st, err := s.Stats(ctx)
	if err != nil || st.Links != 3 || st.Clicks != 1 {
		t.Fatalf("stats = %+v, err = %v", st, err)
	}

	if err := s.Delete(ctx, "two"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.Delete(ctx, "two"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second delete should be ErrNotFound, got %v", err)
	}

	links, err := s.List(ctx, 0)
	if err != nil || len(links) != 2 {
		t.Fatalf("list = %d links, err = %v", len(links), err)
	}
	limited, _ := s.List(ctx, 1)
	if len(limited) != 1 {
		t.Fatalf("limited list should return 1, got %d", len(limited))
	}
}

func TestSeedOnlyRunsOnce(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	n, err := s.Seed(ctx)
	if err != nil || n != len(seedLinks) {
		t.Fatalf("first seed: n=%d err=%v", n, err)
	}
	n, err = s.Seed(ctx)
	if err != nil || n != 0 {
		t.Fatalf("second seed should be a no-op: n=%d err=%v", n, err)
	}
	if _, err := s.Get(ctx, "go"); err != nil {
		t.Fatalf("seeded link missing: %v", err)
	}
}

func TestMigrationsAreIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "reopen.db")
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(context.Background(), "keep", "https://example.com"); err != nil {
		t.Fatal(err)
	}
	s.Close()

	s2, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer s2.Close()
	if _, err := s2.Get(context.Background(), "keep"); err != nil {
		t.Fatalf("data lost after reopen: %v", err)
	}
}
