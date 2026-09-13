<?php
use function Bakkal\e;
$map = [
  'pending'   => ['Bekliyor',   'bg-amber-100 text-amber-800'],
  'paid'      => ['Ödendi',     'bg-blue-100 text-blue-800'],
  'shipped'   => ['Gönderildi', 'bg-olive-100 text-olive-800'],
  'cancelled' => ['İptal',      'bg-gray-200 text-gray-700'],
];
[$label, $cls] = $map[$status] ?? [$status, 'bg-gray-100 text-gray-700'];
?>
<span class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold <?= $cls ?>"><?= e($label) ?></span>
