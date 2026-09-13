<?php
declare(strict_types=1);

namespace Bakkal;

/** Per-session CSRF token; every POST form must carry it. */
final class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['_csrf'];
    }

    public static function field(): string
    {
        return '<input type="hidden" name="_csrf" value="' . e(self::token()) . '">';
    }

    /** Middleware: reject POST requests without a valid token. */
    public static function verify(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            return;
        }
        $sent = $_POST['_csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($sent) || $sent === '' || !hash_equals(self::token(), $sent)) {
            // 403 rather than Laravel-style 419: Apache rewrites unknown status codes to 500.
            http_response_code(403);
            View::render('errors/csrf', ['title' => 'CSRF token mismatch']);
            exit;
        }
    }
}
