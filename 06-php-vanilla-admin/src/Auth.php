<?php
declare(strict_types=1);

namespace Bakkal;

/** Native PHP session authentication with role checks. */
final class Auth
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('bakkal_session');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (($_SERVER['HTTPS'] ?? '') === 'on'),
        ]);
        session_start();
    }

    public static function attempt(string $username, string $password): bool
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE username = :u LIMIT 1');
        $stmt->execute([':u' => $username]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            return false;
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        return true;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }

    public static function user(): ?array
    {
        static $cache = false;
        if ($cache !== false) {
            return $cache;
        }
        $id = $_SESSION['user_id'] ?? null;
        if (!$id) {
            return $cache = null;
        }
        $stmt = Database::pdo()->prepare('SELECT id, username, role, created_at FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        return $cache = ($user ?: null);
    }

    public static function check(): bool
    {
        return self::user() !== null;
    }

    /** Middleware: any logged-in user. */
    public static function requireLogin(): void
    {
        if (!self::check()) {
            $_SESSION['intended'] = $_SERVER['REQUEST_URI'] ?? '/';
            View::redirect('/login');
        }
    }

    /** Middleware: admin role only -> 403 for everyone else. */
    public static function requireAdmin(): void
    {
        self::requireLogin();
        if ((self::user()['role'] ?? '') !== 'admin') {
            http_response_code(403);
            View::render('errors/403', ['title' => 'Forbidden']);
            exit;
        }
    }
}
