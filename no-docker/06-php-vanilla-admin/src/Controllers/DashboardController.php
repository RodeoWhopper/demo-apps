<?php
declare(strict_types=1);

namespace Bakkal\Controllers;

use Bakkal\Database;
use Bakkal\View;

final class DashboardController
{
    public function index(): void
    {
        $pdo = Database::pdo();
        $stats = [
            'products'  => (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn(),
            'low_stock' => (int) $pdo->query('SELECT COUNT(*) FROM products WHERE stock < 10')->fetchColumn(),
            'orders'    => (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn(),
            'pending'   => (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn(),
            'revenue'   => (float) $pdo->query("SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
                                                FROM order_items oi JOIN orders o ON o.id = oi.order_id
                                                WHERE o.status IN ('paid','shipped')")->fetchColumn(),
        ];
        $recent = $pdo->query('SELECT o.*, (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = o.id) AS total
                               FROM orders o ORDER BY o.created_at DESC LIMIT 5')->fetchAll();
        $lowStock = $pdo->query('SELECT * FROM products WHERE stock < 10 ORDER BY stock ASC')->fetchAll();

        View::render('dashboard', [
            'title' => 'Dashboard',
            'stats' => $stats,
            'recent' => $recent,
            'lowStock' => $lowStock,
        ]);
    }

    public function health(): void
    {
        try {
            Database::pdo()->query('SELECT 1')->fetchColumn();
            $db = 'ok';
        } catch (\Throwable $e) {
            $db = 'error';
        }
        View::json([
            'status' => $db === 'ok' ? 'ok' : 'degraded',
            'app' => 'bakkal-panel',
            'db' => $db,
            'php' => PHP_VERSION,
            'time' => gmdate('c'),
        ], $db === 'ok' ? 200 : 503);
    }
}
