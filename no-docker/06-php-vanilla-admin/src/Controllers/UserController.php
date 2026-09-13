<?php
declare(strict_types=1);

namespace Bakkal\Controllers;

use Bakkal\Auth;
use Bakkal\Database;
use Bakkal\Flash;
use Bakkal\View;

/** Admin-only user management. */
final class UserController
{
    public function index(): void
    {
        $users = Database::pdo()->query('SELECT id, username, role, created_at FROM users ORDER BY id')->fetchAll();
        View::render('users/index', ['title' => 'Kullanıcılar', 'users' => $users, 'errors' => [], 'old' => []]);
    }

    public function store(): void
    {
        $username = strtolower(trim((string) ($_POST['username'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        $role = (string) ($_POST['role'] ?? 'staff');
        $errors = [];
        if (!preg_match('/^[a-z0-9_.]{3,30}$/', $username)) {
            $errors['username'] = 'Kullanıcı adı 3-30 karakter, küçük harf/rakam/nokta/alt çizgi.';
        }
        if (strlen($password) < 8) {
            $errors['password'] = 'Şifre en az 8 karakter olmalı.';
        }
        if (!in_array($role, ['admin', 'staff'], true)) {
            $errors['role'] = 'Geçersiz rol.';
        }
        $pdo = Database::pdo();
        if (!$errors) {
            $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :u');
            $stmt->execute([':u' => $username]);
            if ($stmt->fetch()) {
                $errors['username'] = 'Bu kullanıcı adı zaten alınmış.';
            }
        }
        if ($errors) {
            http_response_code(422);
            $users = $pdo->query('SELECT id, username, role, created_at FROM users ORDER BY id')->fetchAll();
            View::render('users/index', ['title' => 'Kullanıcılar', 'users' => $users, 'errors' => $errors, 'old' => ['username' => $username, 'role' => $role]]);
            return;
        }
        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role]);
        Flash::set('success', 'Kullanıcı oluşturuldu: ' . $username);
        View::redirect('/users');
    }

    public function destroy(array $params): void
    {
        $id = (int) $params['id'];
        if ($id === (int) Auth::user()['id']) {
            Flash::set('error', 'Kendi hesabınızı silemezsiniz.');
            View::redirect('/users');
        }
        $stmt = Database::pdo()->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Flash::set('success', $stmt->rowCount() ? 'Kullanıcı silindi.' : 'Kullanıcı bulunamadı.');
        View::redirect('/users');
    }
}
