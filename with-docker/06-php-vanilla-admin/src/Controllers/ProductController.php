<?php
declare(strict_types=1);

namespace Bakkal\Controllers;

use Bakkal\Database;
use Bakkal\Flash;
use Bakkal\View;

final class ProductController
{
    private const CATEGORIES = ['Kahvaltılık', 'İçecek', 'Fırın', 'Süt Ürünleri', 'Bakliyat', 'Yağ', 'Temel Gıda', 'Temizlik', 'Atıştırmalık'];

    public function index(): void
    {
        $q = trim((string) ($_GET['q'] ?? ''));
        $pdo = Database::pdo();
        if ($q !== '') {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE name LIKE :q OR sku LIKE :q OR category LIKE :q ORDER BY name');
            $stmt->execute([':q' => '%' . $q . '%']);
        } else {
            $stmt = $pdo->query('SELECT * FROM products ORDER BY name');
        }
        View::render('products/index', ['title' => 'Ürünler', 'products' => $stmt->fetchAll(), 'q' => $q]);
    }

    public function create(): void
    {
        View::render('products/form', [
            'title' => 'Yeni Ürün',
            'product' => ['sku' => '', 'name' => '', 'category' => self::CATEGORIES[0], 'price' => '', 'stock' => 0],
            'categories' => self::CATEGORIES,
            'errors' => [],
            'action' => '/products',
        ]);
    }

    public function store(): void
    {
        [$data, $errors] = $this->validate($_POST);
        if ($errors) {
            http_response_code(422);
            View::render('products/form', ['title' => 'Yeni Ürün', 'product' => $data, 'categories' => self::CATEGORIES, 'errors' => $errors, 'action' => '/products']);
            return;
        }
        $stmt = Database::pdo()->prepare('INSERT INTO products (sku, name, category, price, stock) VALUES (:sku, :name, :category, :price, :stock)');
        $stmt->execute($data);
        Flash::set('success', 'Ürün eklendi: ' . $data['name']);
        View::redirect('/products');
    }

    public function edit(array $params): void
    {
        $product = $this->find((int) $params['id']);
        View::render('products/form', [
            'title' => 'Ürünü Düzenle',
            'product' => $product,
            'categories' => self::CATEGORIES,
            'errors' => [],
            'action' => '/products/' . $product['id'],
        ]);
    }

    public function update(array $params): void
    {
        $product = $this->find((int) $params['id']);
        [$data, $errors] = $this->validate($_POST, $product['id']);
        if ($errors) {
            http_response_code(422);
            View::render('products/form', ['title' => 'Ürünü Düzenle', 'product' => $data + ['id' => $product['id']], 'categories' => self::CATEGORIES, 'errors' => $errors, 'action' => '/products/' . $product['id']]);
            return;
        }
        $data['id'] = $product['id'];
        $stmt = Database::pdo()->prepare("UPDATE products SET sku = :sku, name = :name, category = :category, price = :price, stock = :stock, updated_at = datetime('now') WHERE id = :id");
        $stmt->execute($data);
        Flash::set('success', 'Ürün güncellendi: ' . $data['name']);
        View::redirect('/products');
    }

    public function destroy(array $params): void
    {
        $product = $this->find((int) $params['id']);
        try {
            $stmt = Database::pdo()->prepare('DELETE FROM products WHERE id = :id');
            $stmt->execute([':id' => $product['id']]);
            Flash::set('success', 'Ürün silindi: ' . $product['name']);
        } catch (\PDOException $e) {
            Flash::set('error', 'Bu ürün siparişlerde kullanıldığı için silinemez.');
        }
        View::redirect('/products');
    }

    private function find(int $id): array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM products WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $product = $stmt->fetch();
        if (!$product) {
            http_response_code(404);
            View::render('errors/404', ['title' => 'Ürün bulunamadı']);
            exit;
        }
        return $product;
    }

    /** @return array{0: array, 1: array<string,string>} */
    private function validate(array $input, ?int $ignoreId = null): array
    {
        $data = [
            'sku' => strtoupper(trim((string) ($input['sku'] ?? ''))),
            'name' => trim((string) ($input['name'] ?? '')),
            'category' => trim((string) ($input['category'] ?? '')),
            'price' => str_replace(',', '.', trim((string) ($input['price'] ?? ''))),
            'stock' => trim((string) ($input['stock'] ?? '0')),
        ];
        $errors = [];
        if (!preg_match('/^[A-Z0-9\-]{3,20}$/', $data['sku'])) {
            $errors['sku'] = 'SKU 3-20 karakter, sadece harf/rakam/tire.';
        } else {
            $stmt = Database::pdo()->prepare('SELECT id FROM products WHERE sku = :sku AND id != :id');
            $stmt->execute([':sku' => $data['sku'], ':id' => $ignoreId ?? 0]);
            if ($stmt->fetch()) {
                $errors['sku'] = 'Bu SKU zaten kullanılıyor.';
            }
        }
        if (mb_strlen($data['name']) < 2 || mb_strlen($data['name']) > 80) {
            $errors['name'] = 'Ürün adı 2-80 karakter olmalı.';
        }
        if (!in_array($data['category'], self::CATEGORIES, true)) {
            $errors['category'] = 'Geçersiz kategori.';
        }
        if (!is_numeric($data['price']) || (float) $data['price'] < 0) {
            $errors['price'] = 'Fiyat 0 veya daha büyük bir sayı olmalı.';
        } else {
            $data['price'] = round((float) $data['price'], 2);
        }
        if (!ctype_digit($data['stock'])) {
            $errors['stock'] = 'Stok tam sayı olmalı.';
        } else {
            $data['stock'] = (int) $data['stock'];
        }
        return [$data, $errors];
    }
}
