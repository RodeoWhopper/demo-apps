<?php use function Bakkal\e; ?>
<div class="grid lg:grid-cols-3 gap-6">
  <section class="lg:col-span-2 bg-white rounded-xl border border-olive-100 shadow-sm">
    <div class="px-5 py-4 border-b border-olive-100 flex items-center justify-between">
      <h2 class="font-semibold">Kalemler</h2>
      <a href="/orders" class="text-sm text-olive-600 hover:underline">← Siparişler</a>
    </div>
    <table class="w-full text-sm">
      <thead class="text-xs uppercase tracking-wider text-olive-500">
        <tr><th class="text-left px-5 py-2">Ürün</th><th class="text-right px-5 py-2">Adet</th><th class="text-right px-5 py-2">Birim</th><th class="text-right px-5 py-2">Toplam</th></tr>
      </thead>
      <tbody>
      <?php foreach ($items as $i): ?>
        <tr class="border-t border-olive-50">
          <td class="px-5 py-3"><?= e($i['name']) ?> <span class="text-xs text-olive-400 font-mono"><?= e($i['sku']) ?></span></td>
          <td class="px-5 py-3 text-right"><?= (int) $i['quantity'] ?></td>
          <td class="px-5 py-3 text-right tabular-nums"><?= number_format((float) $i['unit_price'], 2, ',', '.') ?> ₺</td>
          <td class="px-5 py-3 text-right tabular-nums"><?= number_format($i['quantity'] * $i['unit_price'], 2, ',', '.') ?> ₺</td>
        </tr>
      <?php endforeach; ?>
      </tbody>
      <tfoot><tr class="border-t border-olive-100 font-semibold"><td colspan="3" class="px-5 py-3 text-right">Genel toplam</td><td class="px-5 py-3 text-right tabular-nums"><?= number_format($total, 2, ',', '.') ?> ₺</td></tr></tfoot>
    </table>
  </section>
  <aside class="bg-white rounded-xl border border-olive-100 shadow-sm p-5 space-y-4 text-sm">
    <div><div class="text-xs uppercase tracking-wider text-olive-500">Müşteri</div><div class="font-medium"><?= e($order['customer_name']) ?></div></div>
    <div><div class="text-xs uppercase tracking-wider text-olive-500">Tarih</div><div><?= e(date('d.m.Y H:i', strtotime($order['created_at']))) ?></div></div>
    <div><div class="text-xs uppercase tracking-wider text-olive-500">Not</div><div><?= $order['note'] ? e($order['note']) : '<span class="text-olive-400">—</span>' ?></div></div>
    <div>
      <div class="text-xs uppercase tracking-wider text-olive-500 mb-1">Durum</div>
      <?= \Bakkal\View::partial('orders/_status', ['status' => $order['status']]) ?>
      <form method="post" action="/orders/<?= (int) $order['id'] ?>/status" class="mt-3 flex gap-2">
        <?= \Bakkal\Csrf::field() ?>
        <select name="status" class="flex-1 rounded-md border border-olive-200 px-2 py-1.5 bg-white">
          <?php foreach ($statuses as $s): ?>
            <option value="<?= e($s) ?>" <?= $order['status'] === $s ? 'selected' : '' ?>><?= e(ucfirst($s)) ?></option>
          <?php endforeach; ?>
        </select>
        <button class="rounded-md bg-olive-700 text-white px-3 py-1.5 hover:bg-olive-800">Güncelle</button>
      </form>
    </div>
  </aside>
</div>
