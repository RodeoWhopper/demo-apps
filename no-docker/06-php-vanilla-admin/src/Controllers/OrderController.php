<?php
declare(strict_types=1);

namespace Bakkal\Controllers;

use Bakkal\Database;
use Bakkal\Flash;
use Bakkal\View;

final class OrderController
{
    public const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];

    public function index(): void
    {
        $status = (string) ($_GET['status'] ?? '');
        $sql = 'SELECT o.*, (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = o.id) AS total,
                       (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
                FROM orders o';
        $params = [];
        if (in_array($status, self::STATUSES, true)) {
            $sql .= ' WHERE o.status = :status';
            $params[':status'] = $status;
        }
        $sql .= ' ORDER BY o.created_at DESC';
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        View::render('orders/index', ['title' => 'Siparişler', 'orders' => $stmt->fetchAll(), 'status' => $status, 'statuses' => self::STATUSES]);
    }

    public function show(array $params): void
    {
        $order = $this->find((int) $params['id']);
        $stmt = Database::pdo()->prepare('SELECT oi.*, p.name, p.sku FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = :id');
        $stmt->execute([':id' => $order['id']]);
        $items = $stmt->fetchAll();
        $total = array_sum(array_map(fn($i) => $i['quantity'] * $i['unit_price'], $items));
        View::render('orders/show', ['title' => 'Sipariş #' . $order['id'], 'order' => $order, 'items' => $items, 'total' => $total, 'statuses' => self::STATUSES]);
    }

    public function updateStatus(array $params): void
    {
        $order = $this->find((int) $params['id']);
        $status = (string) ($_POST['status'] ?? '');
        if (!in_array($status, self::STATUSES, true)) {
            Flash::set('error', 'Geçersiz durum.');
            View::redirect('/orders/' . $order['id']);
        }
        $stmt = Database::pdo()->prepare('UPDATE orders SET status = :status WHERE id = :id');
        $stmt->execute([':status' => $status, ':id' => $order['id']]);
        Flash::set('success', 'Sipariş durumu güncellendi: ' . $status);
        View::redirect('/orders/' . $order['id']);
    }

    private function find(int $id): array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM orders WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $order = $stmt->fetch();
        if (!$order) {
            http_response_code(404);
            View::render('errors/404', ['title' => 'Sipariş bulunamadı']);
            exit;
        }
        return $order;
    }
}
