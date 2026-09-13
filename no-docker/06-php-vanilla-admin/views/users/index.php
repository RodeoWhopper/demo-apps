<?php use function Bakkal\e; ?>
<div class="grid lg:grid-cols-3 gap-6">
  <section class="lg:col-span-2 bg-white rounded-xl border border-olive-100 shadow-sm overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-olive-50 text-xs uppercase tracking-wider text-olive-500">
        <tr><th class="text-left px-5 py-3">#</th><th class="text-left px-5 py-3">Kullanıcı</th><th class="text-left px-5 py-3">Rol</th><th class="text-left px-5 py-3">Oluşturma</th><th></th></tr>
      </thead>
      <tbody>
      <?php foreach ($users as $u): ?>
        <tr class="border-t border-olive-50">
          <td class="px-5 py-3 text-olive-500"><?= (int) $u['id'] ?></td>
          <td class="px-5 py-3 font-medium"><?= e($u['username']) ?></td>
          <td class="px-5 py-3"><span class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold <?= $u['role'] === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-olive-100 text-olive-800' ?>"><?= e($u['role']) ?></span></td>
          <td class="px-5 py-3 text-olive-500"><?= e($u['created_at']) ?></td>
          <td class="px-5 py-3 text-right">
            <?php if ((int) $u['id'] !== (int) $user['id']): ?>
            <form method="post" action="/users/<?= (int) $u['id'] ?>/delete" onsubmit="return confirm('Kullanıcı silinsin mi?')">
              <?= \Bakkal\Csrf::field() ?>
              <button class="text-red-700 hover:underline">Sil</button>
            </form>
            <?php else: ?><span class="text-xs text-olive-400">siz</span><?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </section>
  <form method="post" action="/users" class="bg-white rounded-xl border border-olive-100 shadow-sm p-5 space-y-3 text-sm">
    <?= \Bakkal\Csrf::field() ?>
    <h2 class="font-semibold">Yeni kullanıcı</h2>
    <label class="block"><span class="font-medium">Kullanıcı adı</span>
      <input name="username" value="<?= e($old['username'] ?? '') ?>" required class="mt-1 w-full rounded-md border px-3 py-2 <?= isset($errors['username']) ? 'border-red-400' : 'border-olive-200' ?>">
      <?php if (isset($errors['username'])): ?><span class="text-xs text-red-700"><?= e($errors['username']) ?></span><?php endif; ?>
    </label>
    <label class="block"><span class="font-medium">Şifre</span>
      <input name="password" type="password" required minlength="8" class="mt-1 w-full rounded-md border px-3 py-2 <?= isset($errors['password']) ? 'border-red-400' : 'border-olive-200' ?>">
      <?php if (isset($errors['password'])): ?><span class="text-xs text-red-700"><?= e($errors['password']) ?></span><?php endif; ?>
    </label>
    <label class="block"><span class="font-medium">Rol</span>
      <select name="role" class="mt-1 w-full rounded-md border border-olive-200 px-3 py-2 bg-white">
        <option value="staff" <?= ($old['role'] ?? '') === 'staff' ? 'selected' : '' ?>>staff</option>
        <option value="admin" <?= ($old['role'] ?? '') === 'admin' ? 'selected' : '' ?>>admin</option>
      </select>
    </label>
    <button class="w-full rounded-md bg-olive-700 text-white px-4 py-2 font-medium hover:bg-olive-800">Oluştur</button>
  </form>
</div>
