<?php
declare(strict_types=1);

/**
 * Bakkal Panel front controller.
 * Every request is routed here (Apache .htaccess or the PHP built-in server
 * router script: `php -S localhost:8006 -t public public/index.php`).
 */

// Built-in server: let it serve real static files directly.
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if ($file !== __DIR__ . '/index.php' && is_file($file)) {
        return false;
    }
}

$root = dirname(__DIR__);

spl_autoload_register(static function (string $class) use ($root): void {
    $prefix = 'Bakkal\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $file = $root . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
require_once $root . '/src/View.php'; // also defines the global e() helper

use Bakkal\Auth;
use Bakkal\Config;
use Bakkal\Csrf;
use Bakkal\Router;
use Bakkal\View;
use Bakkal\Controllers\AuthController;
use Bakkal\Controllers\DashboardController;
use Bakkal\Controllers\OrderController;
use Bakkal\Controllers\ProductController;
use Bakkal\Controllers\UserController;

Config::load($root . '/.env');
$appEnv = Config::get('APP_ENV', 'production');
$appKey = Config::get('APP_KEY', 'change-me-demo-key'); // read for parity with other apps; not used cryptographically
ini_set('display_errors', $appEnv === 'development' ? '1' : '0');
error_reporting(E_ALL);
date_default_timezone_set('Europe/Istanbul');

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// /healthz must work without a session and without touching cookies.
if ($path === '/healthz') {
    (new DashboardController())->health();
    exit;
}

Auth::start();

$auth  = [Auth::class, 'requireLogin'];
$admin = [Auth::class, 'requireAdmin'];
$csrf  = [Csrf::class, 'verify'];

$router = new Router();

$router->get('/',       fn() => (new DashboardController())->index(), [$auth]);
$router->get('/login',  fn() => (new AuthController())->showLogin());
$router->post('/login', fn() => (new AuthController())->login(), [$csrf]);
$router->post('/logout', fn() => (new AuthController())->logout(), [$auth, $csrf]);

$router->get('/products',              fn() => (new ProductController())->index(), [$auth]);
$router->get('/products/new',          fn() => (new ProductController())->create(), [$auth]);
$router->post('/products',             fn() => (new ProductController())->store(), [$auth, $csrf]);
$router->get('/products/{id}/edit',    fn($p) => (new ProductController())->edit($p), [$auth]);
$router->post('/products/{id}',        fn($p) => (new ProductController())->update($p), [$auth, $csrf]);
$router->post('/products/{id}/delete', fn($p) => (new ProductController())->destroy($p), [$auth, $csrf]);

$router->get('/orders',              fn() => (new OrderController())->index(), [$auth]);
$router->get('/orders/{id}',         fn($p) => (new OrderController())->show($p), [$auth]);
$router->post('/orders/{id}/status', fn($p) => (new OrderController())->updateStatus($p), [$auth, $csrf]);

$router->get('/users',               fn() => (new UserController())->index(), [$admin]);
$router->post('/users',              fn() => (new UserController())->store(), [$admin, $csrf]);
$router->post('/users/{id}/delete',  fn($p) => (new UserController())->destroy($p), [$admin, $csrf]);

try {
    $router->dispatch($method, $path);
} catch (\Throwable $e) {
    error_log('[bakkal] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    View::render('errors/500', ['title' => 'Sunucu hatası', 'exception' => $appEnv === 'development' ? $e : null]);
}
