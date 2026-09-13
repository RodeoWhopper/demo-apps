<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-16 sm:py-24">
    <p class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Kanban, without the ceremony</p>
    <h1 class="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Move work forward with a board that lives in your browser.</h1>
    <p class="mt-4 max-w-xl text-lg text-slate-600">Flowboard is a demo single-page app: columns, cards, drag &amp; drop and a mock sign-in — all persisted to <code class="rounded bg-white px-1">localStorage</code>. No server, no account, no tracking.</p>
    <div class="mt-8 flex flex-wrap gap-3">
      <RouterLink v-if="auth.isAuthenticated" to="/board" class="rounded-lg bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">Open the board</RouterLink>
      <RouterLink v-else to="/login" class="rounded-lg bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">Sign in to the demo</RouterLink>
      <RouterLink to="/api-mock" class="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">How auth is mocked</RouterLink>
    </div>
    <dl class="mt-16 grid gap-6 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-5"><dt class="font-semibold text-slate-900">Native drag &amp; drop</dt><dd class="mt-1 text-sm text-slate-600">HTML5 DnD, no library. Drop on a card to insert before it, on a column to append.</dd></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5"><dt class="font-semibold text-slate-900">Deep-linkable modals</dt><dd class="mt-1 text-sm text-slate-600"><code>/board/&lt;cardId&gt;</code> opens a card on top of the board — a nested route, which is why the host needs an SPA fallback.</dd></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5"><dt class="font-semibold text-slate-900">Role-guarded routes</dt><dd class="mt-1 text-sm text-slate-600">Router guards send anonymous users to <code>/login?redirect=…</code> and keep members out of <code>/admin</code>.</dd></div>
    </dl>
  </section>
</template>
