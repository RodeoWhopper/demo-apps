<script setup lang="ts">
import { PUBLIC_USERS } from '@/mocks/users'
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-10">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">/api-mock</p>
    <h1 class="text-2xl font-bold text-slate-900">There is no backend.</h1>
    <div class="prose prose-slate mt-4 max-w-none text-slate-700">
      <p>Flowboard never makes an HTTP request. Everything a "real" app would fetch from an API is mocked in the browser:</p>
      <ul class="list-disc space-y-1 pl-5">
        <li><strong>Authentication</strong> — <code>src/mocks/users.ts</code> holds two accounts. <code>POST /login</code> is simulated by comparing the form against that list and writing a fake token to <code>localStorage["flowboard.auth"]</code>.</li>
        <li><strong>Authorization</strong> — enforced only by Vue Router guards (<code>requiresAuth</code>, <code>requiresAdmin</code>). Anyone can bypass them with dev-tools; that is fine for a demo and fatal for a product.</li>
        <li><strong>Board data</strong> — seeded from <code>src/mocks/board.ts</code> and kept in <code>localStorage["flowboard.board"]</code>. Different browsers see different boards.</li>
      </ul>
      <h2 class="mt-6 text-lg font-semibold">What this means for deployment</h2>
      <p>Serve <code>dist/</code> as static files with an SPA fallback so deep links such as <code>/board/c-3</code> return <code>index.html</code>. There is nothing to proxy under <code>/api</code>.</p>
      <h2 class="mt-6 text-lg font-semibold">Mock accounts</h2>
      <table class="w-full text-sm">
        <thead class="text-left text-xs uppercase text-slate-500"><tr><th class="py-1">Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody><tr v-for="u in PUBLIC_USERS" :key="u.id" class="border-t border-slate-200"><td class="py-1">{{ u.name }}</td><td class="font-mono text-xs">{{ u.email }}</td><td>{{ u.role }}</td></tr></tbody>
      </table>
      <p class="mt-2 text-xs text-slate-500">Passwords are shown on the sign-in page.</p>
    </div>
  </section>
</template>
