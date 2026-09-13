<?php use function Bakkal\e; ?>
<form method="post" action="<?= e($action) ?>" class="max-w-xl bg-white rounded-xl border border-olive-100 shadow-sm p-6 space-y-4">
  <?= \Bakkal\Csrf::field() ?>
  <?php
    $field = function (string $name, string $label, string $type = 'text', array $attrs = []) use ($product, $errors) {
      $extra = '';
      foreach ($attrs as $k => $v) { $extra .= ' ' . $k . '="' . e($v) . '"'; }
      echo '<label class="block"><span class="text-sm font-medium">' . e($label) . '</span>';
      echo '<input name="' . e($name) . '" type="' . e($type) . '" value="' . e($product[$name] ?? '') . '"' . $extra
         . ' class="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-olive-400 '
         . (isset($errors[$name]) ? 'border-red-400' : 'border-olive-200') . '">';
      if (isset($errors[$name])) { echo '<span class="text-xs text-red-700">' . e($errors[$name]) . '</span>'; }
      echo '</label>';
    };
    $field('sku', 'SKU', 'text', ['placeholder' => 'BK-011', 'required' => 'required']);
    $field('name', 'Ürün adı', 'text', ['required' => 'required']);
  ?>
  <label class="block">
    <span class="text-sm font-medium">Kategori</span>
    <select name="category" class="mt-1 w-full rounded-md border border-olive-200 px-3 py-2 bg-white">
      <?php foreach ($categories as $c): ?>
        <option value="<?= e($c) ?>" <?= ($product['category'] ?? '') === $c ? 'selected' : '' ?>><?= e($c) ?></option>
      <?php endforeach; ?>
    </select>
    <?php if (isset($errors['category'])): ?><span class="text-xs text-red-700"><?= e($errors['category']) ?></span><?php endif; ?>
  </label>
  <div class="grid grid-cols-2 gap-4">
    <?php $field('price', 'Fiyat (₺)', 'number', ['step' => '0.01', 'min' => '0', 'required' => 'required']); ?>
    <?php $field('stock', 'Stok', 'number', ['min' => '0', 'step' => '1', 'required' => 'required']); ?>
  </div>
  <div class="flex items-center gap-3 pt-2">
    <button type="submit" class="rounded-md bg-olive-700 text-white px-4 py-2 text-sm font-medium hover:bg-olive-800">Kaydet</button>
    <a href="/products" class="text-sm text-olive-600 hover:underline">Vazgeç</a>
  </div>
</form>
