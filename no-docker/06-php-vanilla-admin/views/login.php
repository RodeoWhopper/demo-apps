<?php use function Bakkal\e; ?>
<div class="w-full max-w-sm">
  <div class="text-center mb-6">
    <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber2-500 text-olive-900 font-black text-2xl shadow">B</span>
    <h1 class="mt-4 text-2xl font-bold">Bakkal Panel</h1>
    <p class="text-sm text-olive-600">Mahalle bakkalınızın yönetim paneli</p>
  </div>
  <form method="post" action="/login" class="bg-white rounded-xl shadow-sm border border-olive-100 p-6 space-y-4">
    <?= \Bakkal\Csrf::field() ?>
    <?php if ($error): ?>
      <div class="rounded-md bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2"><?= e($error) ?></div>
    <?php endif; ?>
    <label class="block">
      <span class="text-sm font-medium">Kullanıcı adı</span>
      <input name="username" value="<?= e($username) ?>" autocomplete="username" required class="mt-1 w-full rounded-md border-olive-200 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-olive-400">
    </label>
    <label class="block">
      <span class="text-sm font-medium">Şifre</span>
      <input name="password" type="password" autocomplete="current-password" required class="mt-1 w-full rounded-md border-olive-200 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-olive-400">
    </label>
    <button type="submit" class="w-full rounded-md bg-olive-700 text-white font-medium py-2 hover:bg-olive-800">Giriş yap</button>
    <p class="text-xs text-olive-500 text-center">Demo: <code>admin / Admin123!</code> · <code>staff / Staff123!</code></p>
  </form>
</div>
