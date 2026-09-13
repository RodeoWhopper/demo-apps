<?php
declare(strict_types=1);

namespace Bakkal;

use PDO;

/** PDO + SQLite connection; creates the schema and seed data on first run. */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $path = Config::get('DB_PATH', dirname(__DIR__) . '/data/bakkal.sqlite');
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            self::$pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            self::$pdo->exec('PRAGMA foreign_keys = ON');
            self::$pdo->exec('PRAGMA journal_mode = WAL');
            self::migrate(self::$pdo);
            self::seed(self::$pdo);
        }
        return self::$pdo;
    }

    private static function migrate(PDO $pdo): void
    {
        $pdo->exec(<<<SQL
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin','staff')),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL CHECK (price >= 0),
                stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
                note TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                unit_price REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
        SQL);
    }

    private static function seed(PDO $pdo): void
    {
        if ((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) {
            return; // already seeded
        }

        $pdo->beginTransaction();
        try {
            $u = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
            $u->execute(['admin', password_hash('Admin123!', PASSWORD_DEFAULT), 'admin']);
            $u->execute(['staff', password_hash('Staff123!', PASSWORD_DEFAULT), 'staff']);

            $products = [
                ['BK-001', 'Beyaz Peynir 500g',      'Kahvaltılık', 145.00, 24],
                ['BK-002', 'Siyah Zeytin 1kg',       'Kahvaltılık', 210.00, 12],
                ['BK-003', 'Rize Çayı 1kg',          'İçecek',       320.00, 40],
                ['BK-004', 'Köy Ekmeği',             'Fırın',        35.00,  18],
                ['BK-005', 'Günlük Süt 1L',          'Süt Ürünleri', 42.50,  30],
                ['BK-006', 'Köy Yumurtası 15li',     'Kahvaltılık',  120.00, 9],
                ['BK-007', 'Pilavlık Bulgur 2kg',    'Bakliyat',     95.00,  22],
                ['BK-008', 'Ayçiçek Yağı 5L',        'Yağ',          540.00, 6],
                ['BK-009', 'Makarna Burgu 500g',     'Bakliyat',     28.00,  55],
                ['BK-010', 'Toz Şeker 1kg',          'Temel Gıda',   48.00,  3],
            ];
            $p = $pdo->prepare('INSERT INTO products (sku, name, category, price, stock) VALUES (?, ?, ?, ?, ?)');
            foreach ($products as $row) {
                $p->execute($row);
            }

            // [customer, status, note, items: [product_id => qty]]
            $orders = [
                ['Ayşe Yılmaz',   'shipped',   'Kapıya bırakın',            [1 => 2, 4 => 3, 5 => 4]],
                ['Mehmet Demir',  'paid',      null,                        [3 => 1, 9 => 6]],
                ['Fatma Kaya',    'pending',   'Akşam 18:00 sonrası',       [6 => 1, 2 => 1]],
                ['Ali Çelik',     'paid',      null,                        [8 => 1, 10 => 2, 7 => 1]],
                ['Zeynep Arslan', 'cancelled', 'Müşteri vazgeçti',          [5 => 2]],
                ['Hasan Şahin',   'shipped',   'Fatura istiyor',            [1 => 1, 3 => 2, 4 => 1, 9 => 2]],
            ];
            $o = $pdo->prepare('INSERT INTO orders (customer_name, status, note, created_at) VALUES (?, ?, ?, ?)');
            $oi = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
            $day = 6;
            foreach ($orders as [$customer, $status, $note, $items]) {
                $o->execute([$customer, $status, $note, date('Y-m-d H:i:s', strtotime("-{$day} days"))]);
                $orderId = (int) $pdo->lastInsertId();
                foreach ($items as $productId => $qty) {
                    $oi->execute([$orderId, $productId, $qty, $products[$productId - 1][3]]);
                }
                $day--;
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
