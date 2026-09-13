<?php use function Bakkal\e; ?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title) ?> · Bakkal Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: {
      olive: { 50:'#f6f7ec', 100:'#e9ecd0', 200:'#d4dba3', 300:'#b9c56f', 400:'#9eab46', 500:'#7f8e33', 600:'#647127', 700:'#4c5722', 800:'#3f4720', 900:'#363d1f' },
      amber2: { 400:'#f2b544', 500:'#e39a1f', 600:'#c67a12' }
    }}}}
  </script>
</head>
<body class="min-h-screen bg-olive-50 text-olive-900 antialiased">
<?php if ($user): ?>
<div class="flex min-h-screen">
  <aside class="w-60 shrink-0 bg-olive-800 text-olive-100 flex flex-col">
    <a href="/" class="px-5 py-5 flex items-center gap-3 border-b border-olive-700">
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber2-500 text-olive-900 font-black text-lg">B</span>
      <span class="font-semibold tracking-wide">Bakkal Panel</span>
    </a>
    <?php
      $nav = [
        ['/', 'Özet', 'M3 12l9-9 9 9M5 10v10h14V10'],
        ['/products', 'Ürünler', 'M20 7l-8-4-8 4v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10'],
        ['/orders', 'Siparişler', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'],
      ];
      if ($user['role'] === 'admin') { $nav[] = ['/users', 'Kullanıcılar', 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z']; }
      $current = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    ?>
    <nav class="flex-1 px-3 py-4 space-y-1">
      <?php foreach ($nav as [$href, $label, $icon]):
        $active = $href === '/' ? $current === '/' : str_starts_with($current, $href); ?>
        <a href="<?= e($href) ?>" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium <?= $active ? 'bg-olive-700 text-white' : 'text-olive-200 hover:bg-olive-700/60 hover:text-white' ?>">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="<?= $icon ?>"/></svg>
          <?= e($label) ?>
        </a>
      <?php endforeach; ?>
    </nav>
    <div class="border-t border-olive-700 px-5 py-4 text-sm">
      <div class="font-medium text-white"><?= e($user['username']) ?></div>
      <div class="text-olive-300 text-xs uppercase tracking-wider"><?= e($user['role']) ?></div>
      <form method="post" action="/logout" class="mt-3">
        <?= \Bakkal\Csrf::field() ?>
        <button type="submit" class="text-xs text-olive-200 underline hover:text-white">Çıkış yap</button>
      </form>
    </div>
  </aside>
  <main class="flex-1 min-w-0">
    <header class="bg-white border-b border-olive-100 px-8 py-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold"><?= e($title) ?></h1>
      <span class="text-xs text-olive-500"><?= date('d.m.Y') ?></span>
    </header>
    <div class="px-8 py-6">
      <?php if ($flash): ?>
        <div class="mb-5 rounded-md border px-4 py-3 text-sm <?= $flash['type'] === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-olive-200 bg-olive-100 text-olive-800' ?>">
          <?= e($flash['message']) ?>
        </div>
      <?php endif; ?>
      <?= $content ?>
    </div>
  </main>
</div>
<?php else: ?>
<main class="min-h-screen flex items-center justify-center px-4">
  <?= $content ?>
</main>
<?php endif; ?>
</body>
</html>
