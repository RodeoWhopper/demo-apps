<?php
declare(strict_types=1);

namespace Bakkal;

/** One-shot flash messages stored in the session. */
final class Flash
{
    public static function set(string $type, string $message): void
    {
        $_SESSION['_flash'] = ['type' => $type, 'message' => $message];
    }

    public static function pull(): ?array
    {
        $flash = $_SESSION['_flash'] ?? null;
        unset($_SESSION['_flash']);
        return $flash;
    }
}
