// Package store persists short links in SQLite (modernc.org/sqlite, no CGO).
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var (
	ErrNotFound  = errors.New("link not found")
	ErrCodeTaken = errors.New("short code already in use")
)

// Link is one shortened URL.
type Link struct {
	ID          int64
	Code        string
	URL         string
	Clicks      int64
	CreatedAt   time.Time
	LastClickAt *time.Time
}

// Store wraps the SQLite connection.
type Store struct {
	db *sql.DB
}

// Open opens (or creates) the database file and applies pending migrations.
func Open(path string) (*Store, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// A single connection keeps SQLite writes serialised and lock-free.
	db.SetMaxOpenConns(1)

	s := &Store{db: db}
	if err := s.migrate(context.Background()); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

// Close releases the database handle.
func (s *Store) Close() error { return s.db.Close() }

// Ping verifies the database is reachable (used by /healthz).
func (s *Store) Ping(ctx context.Context) error {
	var one int
	return s.db.QueryRowContext(ctx, "SELECT 1").Scan(&one)
}

var migrations = []string{
	`CREATE TABLE links (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		code          TEXT    NOT NULL UNIQUE,
		url           TEXT    NOT NULL,
		clicks        INTEGER NOT NULL DEFAULT 0,
		created_at    TEXT    NOT NULL,
		last_click_at TEXT
	);
	CREATE INDEX idx_links_created_at ON links(created_at DESC);`,
}

func (s *Store) migrate(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`); err != nil {
		return err
	}
	var current int
	if err := s.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(version), 0) FROM schema_migrations`).Scan(&current); err != nil {
		return err
	}
	for i := current; i < len(migrations); i++ {
		version := i + 1
		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, migrations[i]); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %d: %w", version, err)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)`,
			version, now()); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func now() string { return time.Now().UTC().Format(time.RFC3339Nano) }

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339Nano, s)
	return t
}

// Create stores a new link. An empty code means "generate one for me".
func (s *Store) Create(ctx context.Context, code, target string) (*Link, error) {
	if code != "" {
		return s.insert(ctx, code, target)
	}
	for attempt := 0; attempt < 5; attempt++ {
		generated, err := GenerateCode(DefaultCodeLength)
		if err != nil {
			return nil, err
		}
		link, err := s.insert(ctx, generated, target)
		if errors.Is(err, ErrCodeTaken) {
			continue
		}
		return link, err
	}
	return nil, errors.New("could not find a free short code")
}

func (s *Store) insert(ctx context.Context, code, target string) (*Link, error) {
	created := now()
	res, err := s.db.ExecContext(ctx, `INSERT INTO links(code, url, created_at) VALUES (?, ?, ?)`, code, target, created)
	if err != nil {
		// modernc.org/sqlite surfaces constraint failures by message.
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return nil, ErrCodeTaken
		}
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &Link{ID: id, Code: code, URL: target, CreatedAt: parseTime(created)}, nil
}

const selectCols = `id, code, url, clicks, created_at, last_click_at`

func scanLink(sc interface{ Scan(...any) error }) (*Link, error) {
	var (
		l         Link
		created   string
		lastClick sql.NullString
	)
	if err := sc.Scan(&l.ID, &l.Code, &l.URL, &l.Clicks, &created, &lastClick); err != nil {
		return nil, err
	}
	l.CreatedAt = parseTime(created)
	if lastClick.Valid {
		t := parseTime(lastClick.String)
		l.LastClickAt = &t
	}
	return &l, nil
}

// Get returns a link by its short code.
func (s *Store) Get(ctx context.Context, code string) (*Link, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+selectCols+` FROM links WHERE code = ?`, code)
	link, err := scanLink(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return link, err
}

// Resolve increments the click counter and returns the target URL.
func (s *Store) Resolve(ctx context.Context, code string) (string, error) {
	var target string
	err := s.db.QueryRowContext(ctx,
		`UPDATE links SET clicks = clicks + 1, last_click_at = ? WHERE code = ? RETURNING url`,
		now(), code).Scan(&target)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return target, err
}

// List returns links newest first; limit <= 0 returns everything.
func (s *Store) List(ctx context.Context, limit int) ([]Link, error) {
	q := `SELECT ` + selectCols + ` FROM links ORDER BY created_at DESC, id DESC`
	args := []any{}
	if limit > 0 {
		q += ` LIMIT ?`
		args = append(args, limit)
	}
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Link
	for rows.Next() {
		l, err := scanLink(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

// Delete removes a link by code.
func (s *Store) Delete(ctx context.Context, code string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM links WHERE code = ?`, code)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Stats holds aggregate counters shown on the landing and admin pages.
type Stats struct {
	Links  int64
	Clicks int64
}

// Stats returns the number of links and the sum of all clicks.
func (s *Store) Stats(ctx context.Context) (Stats, error) {
	var st Stats
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(clicks), 0) FROM links`).Scan(&st.Links, &st.Clicks)
	return st, err
}

var seedLinks = []struct {
	Code, URL string
	Clicks    int64
}{
	{"go", "https://go.dev/doc/", 128},
	{"gin", "https://gin-gonic.com/docs/", 74},
	{"sqlite", "https://www.sqlite.org/docs.html", 41},
	{"tailwind", "https://tailwindcss.com/docs/installation", 19},
	{"docker", "https://docs.docker.com/get-started/", 63},
}

// Seed inserts demo links when the table is empty. Returns the number inserted.
func (s *Store) Seed(ctx context.Context) (int, error) {
	st, err := s.Stats(ctx)
	if err != nil {
		return 0, err
	}
	if st.Links > 0 {
		return 0, nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	base := time.Now().UTC().Add(-5 * 24 * time.Hour)
	for i, sl := range seedLinks {
		created := base.Add(time.Duration(i) * 24 * time.Hour)
		last := created.Add(6 * time.Hour)
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO links(code, url, clicks, created_at, last_click_at) VALUES (?, ?, ?, ?, ?)`,
			sl.Code, sl.URL, sl.Clicks, created.Format(time.RFC3339Nano), last.Format(time.RFC3339Nano)); err != nil {
			tx.Rollback()
			return 0, err
		}
	}
	return len(seedLinks), tx.Commit()
}
