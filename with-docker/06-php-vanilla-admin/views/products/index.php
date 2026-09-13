<?php use function Bakkal\e; ?>
<div class="flex items-center justify-between mb-5 gap-4">
  <form method="get" action="/products" class="flex gap-2">
    <input name="q" value="<?= e($q) ?>" placeholder="Ürün, SKU veya kategori ara" class="w-72 rounded-md border border-olive-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400">
    <button class="rounded-md bg-white border border-olive-200 px-3 py-2 text-sm hover:bg-olive-100">Ara</button>
  </form>
  <a href="/products/new" class="rounded-md bg-olive-700 text-white px-4 py-2 text-sm font-medium hover:bg-olive-800">+ Yeni ürün</a>
</div>

<div class="bg-white rounded-xl border border-olive-100 shadow-sm overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="bg-olive-50 text-xs uppercase tracking-wider text-olive-500">
      <tr>
        <th class="text-left px-5 py-3">SKU</th>
        <th class="text-left px-5 py-3">Ürün</th>
        <th class="text-left px-5 py-3">Kategori</th>
        <th class="text-right px-5 py-3">Fiyat</th>
        <th class="text-right px-5 py-3">Stok</th>
        <th class="px-5 py-3"></th>
      </tr>
    </thead>
    <tbody>
    <?php if (!$products): ?>
      <tr><td colspan="6" class="px-5 py-8 text-center text-olive-500">Ürün bulunamadı.</td></tr>
    <?php endif; ?>
    <?php foreach ($products as $p): ?>
      <tr class="border-t border-olive-50 hover:bg-olive-50/50">
        <td class="px-5 py-3 font-mono text-xs text-olive-500"><?= e($p['sku']) ?></td>
        <td class="px-5 py-3 font-medium"><?= e($p['name']) ?></td>
        <td class="px-5 py-3"><?= e($p['category']) ?></td>
        <td class="px-5 py-3 text-right tabular-nums"><?= number_format((float) $p['price'], 2, ',', '.') ?> ₺</td>
        <td class="px-5 py-3 text-right tabular-nums <?= $p['stock'] < 10 ? 'text-red-700 font-semibold' : '' ?>"><?= (int) $p['stock'] ?></td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <a href="/products/<?= (int) $p['id'] ?>/edit" class="text-olive-700 hover:underline">Düzenle</a>
          <form method="post" action="/products/<?= (int) $p['id'] ?>/delete" class="inline ml-3" onsubmit="return confirm('Silinsin mi?')">
            <?= \Bakkal\Csrf::field() ?>
            <button class="text-red-700 hover:underline">Sil</button>
          </form>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</div>
