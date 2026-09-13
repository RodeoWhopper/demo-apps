<?php
declare(strict_types=1);

namespace Bakkal\Controllers;

use Bakkal\Auth;
use Bakkal\Flash;
use Bakkal\View;

final class AuthController
{
    public function showLogin(): void
    {
        if (Auth::check()) {
            View::redirect('/');
        }
        View::render('login', ['title' => 'Giriş', 'error' => null, 'username' => '']);
    }

    public function login(): void
    {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        if ($username === '' || $password === '' || !Auth::attempt($username, $password)) {
            http_response_code(422);
            View::render('login', [
                'title' => 'Giriş',
                'error' => 'Kullanıcı adı veya şifre hatalı.',
                'username' => $username,
            ]);
            return;
        }

        $to = $_SESSION['intended'] ?? '/';
        unset($_SESSION['intended']);
        Flash::set('success', 'Hoş geldin, ' . $username . '!');
        View::redirect(is_string($to) && str_starts_with($to, '/') ? $to : '/');
    }

    public function logout(): void
    {
        Auth::logout();
        View::redirect('/login');
    }
}
