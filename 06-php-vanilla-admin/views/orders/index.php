<?php use function Bakkal\e; ?>
<div class="flex gap-2 mb-5 text-sm">
  <a href="/orders" class="rounded-full px-3 py-1 border <?= $status === '' ? 'bg-olive-700 text-white border-olive-700' : 'bg-white border-olive-200 hover:bg-olive-100' ?>">Tümü</a>
  <?php foreach ($statuses as $s): ?>
    <a href="/orders?status=<?= e($s) ?>" class="rounded-full px-3 py-1 border <?= $status === $s ? 'bg-olive-700 text-white border-olive-700' : 'bg-white border-olive-200 hover:bg-olive-100' ?>"><?= e(ucfirst($s)) ?></a>
  <?php endforeach; ?>
</div>
<div class="bg-white rounded-xl border border-olive-100 shadow-sm overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="bg-olive-50 text-xs uppercase tracking-wider text-olive-500">
      <tr>
        <th class="text-left px-5 py-3">#</th>
        <th class="text-left px-5 py-3">Müşteri</th>
        <th class="text-left px-5 py-3">Durum</th>
        <th class="text-right px-5 py-3">Kalem</th>
        <th class="text-right px-5 py-3">Tutar</th>
        <th class="text-left px-5 py-3">Tarih</th>
      </tr>
    </thead>
    <tbody>
    <?php if (!$orders): ?>
      <tr><td colspan="6" class="px-5 py-8 text-center text-olive-500">Sipariş yok.</td></tr>
    <?php endif; ?>
    <?php foreach ($orders as $o): ?>
      <tr class="border-t border-olive-50 hover:bg-olive-50/50">
        <td class="px-5 py-3"><a class="font-medium hover:underline" href="/orders/<?= (int) $o['id'] ?>">#<?= (int) $o['id'] ?></a></td>
        <td class="px-5 py-3"><?= e($o['customer_name']) ?></td>
        <td class="px-5 py-3"><?= \Bakkal\View::partial('orders/_status', ['status' => $o['status']]) ?></td>
        <td class="px-5 py-3 text-right"><?= (int) $o['item_count'] ?></td>
        <td class="px-5 py-3 text-right tabular-nums"><?= number_format((float) $o['total'], 2, ',', '.') ?> ₺</td>
        <td class="px-5 py-3 text-olive-500"><?= e(date('d.m.Y H:i', strtotime($o['created_at']))) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</div>
