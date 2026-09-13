<?php use function Bakkal\e; ?>
<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
  <?php
    $cards = [
      ['Ürün', $stats['products'], 'toplam'],
      ['Düşük stok', $stats['low_stock'], '< 10 adet'],
      ['Sipariş', $stats['orders'], 'toplam'],
      ['Bekleyen', $stats['pending'], 'sipariş'],
      ['Ciro', number_format($stats['revenue'], 2, ',', '.') . ' ₺', 'ödenen + gönderilen'],
    ];
    foreach ($cards as [$label, $value, $sub]): ?>
    <div class="bg-white rounded-xl border border-olive-100 p-5 shadow-sm">
      <div class="text-xs uppercase tracking-wider text-olive-500"><?= e($label) ?></div>
      <div class="mt-1 text-2xl font-bold"><?= e($value) ?></div>
      <div class="text-xs text-olive-400"><?= e($sub) ?></div>
    </div>
  <?php endforeach; ?>
</div>

<div class="grid lg:grid-cols-2 gap-6">
  <section class="bg-white rounded-xl border border-olive-100 shadow-sm">
    <div class="px-5 py-4 border-b border-olive-100 flex items-center justify-between">
      <h2 class="font-semibold">Son siparişler</h2>
      <a href="/orders" class="text-sm text-olive-600 hover:underline">Tümü →</a>
    </div>
    <table class="w-full text-sm">
      <tbody>
      <?php foreach ($recent as $o): ?>
        <tr class="border-b border-olive-50 last:border-0">
          <td class="px-5 py-3"><a class="font-medium hover:underline" href="/orders/<?= (int) $o['id'] ?>">#<?= (int) $o['id'] ?> <?= e($o['customer_name']) ?></a></td>
          <td class="px-3 py-3"><?= \Bakkal\View::partial('orders/_status', ['status' => $o['status']]) ?></td>
          <td class="px-5 py-3 text-right tabular-nums"><?= number_format((float) $o['total'], 2, ',', '.') ?> ₺</td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </section>

  <section class="bg-white rounded-xl border border-olive-100 shadow-sm">
    <div class="px-5 py-4 border-b border-olive-100 flex items-center justify-between">
      <h2 class="font-semibold">Stok uyarıları</h2>
      <a href="/products" class="text-sm text-olive-600 hover:underline">Ürünler →</a>
    </div>
    <?php if (!$lowStock): ?>
      <p class="px-5 py-6 text-sm text-olive-500">Stoğu azalan ürün yok.</p>
    <?php else: ?>
    <table class="w-full text-sm">
      <tbody>
      <?php foreach ($lowStock as $p): ?>
        <tr class="border-b border-olive-50 last:border-0">
          <td class="px-5 py-3"><a class="font-medium hover:underline" href="/products/<?= (int) $p['id'] ?>/edit"><?= e($p['name']) ?></a> <span class="text-olive-400 text-xs"><?= e($p['sku']) ?></span></td>
          <td class="px-5 py-3 text-right"><span class="inline-block rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold"><?= (int) $p['stock'] ?> adet</span></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </section>
</div>
