<?php
declare(strict_types=1);

namespace Bakkal;

final class View
{
    public static string $viewsDir = __DIR__ . '/../views';

    /** Render a template inside the shared layout. */
    public static function render(string $template, array $data = []): void
    {
        $data['title'] = $data['title'] ?? 'Bakkal Panel';
        $data['user'] = Auth::user();
        $data['flash'] = Flash::pull();
        $data['content'] = self::partial($template, $data);
        extract($data, EXTR_SKIP);
        require self::$viewsDir . '/layout.php';
    }

    /** Render a template without the layout and return it as a string. */
    public static function partial(string $template, array $data = []): string
    {
        $file = self::$viewsDir . '/' . $template . '.php';
        if (!is_file($file)) {
            throw new \RuntimeException("View not found: $template");
        }
        extract($data, EXTR_SKIP);
        ob_start();
        require $file;
        return (string) ob_get_clean();
    }

    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function redirect(string $to, int $status = 302): never
    {
        header('Location: ' . $to, true, $status);
        exit;
    }
}

/** HTML-escape helper used everywhere in templates. */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
