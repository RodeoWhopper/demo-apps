<script setup lang="ts">
import { ref } from 'vue'
import { PUBLIC_USERS } from '@/mocks/users'
import { useBoardStore } from '@/stores/board'
import UserAvatar from '@/components/UserAvatar.vue'

const board = useBoardStore()
const done = ref('')

function resetBoard() {
  if (confirm('Reset the board to the seed data? Everyone on this browser loses their changes.')) {
    board.reset()
    done.value = 'Board reset to seed data.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-10">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Admin</p>
    <h1 class="text-2xl font-bold text-slate-900">Workspace</h1>

    <h2 class="mt-8 text-lg font-semibold">Members</h2>
    <p class="text-sm text-slate-500">Hard-coded in <code>src/mocks/users.ts</code>. There is no user management API.</p>
    <table class="mt-3 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-2">Member</th><th class="px-4 py-2">Email</th><th class="px-4 py-2">Role</th></tr></thead>
      <tbody>
        <tr v-for="u in PUBLIC_USERS" :key="u.id" class="border-t border-slate-100">
          <td class="flex items-center gap-2 px-4 py-2"><UserAvatar :user="u" size="sm" />{{ u.name }}</td>
          <td class="px-4 py-2 font-mono text-xs">{{ u.email }}</td>
          <td class="px-4 py-2"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'">{{ u.role }}</span></td>
        </tr>
      </tbody>
    </table>

    <h2 class="mt-10 text-lg font-semibold">Board data</h2>
    <div class="mt-3 rounded-xl border border-slate-200 bg-white p-5">
      <dl class="grid gap-4 sm:grid-cols-3 text-sm">
        <div><dt class="text-slate-500">Columns</dt><dd class="text-xl font-bold">{{ board.columns.length }}</dd></div>
        <div><dt class="text-slate-500">Cards</dt><dd class="text-xl font-bold">{{ board.cardCount }}</dd></div>
        <div><dt class="text-slate-500">Last change</dt><dd class="font-mono text-xs">{{ new Date(board.updatedAt).toLocaleString() }}</dd></div>
      </dl>
      <div class="mt-5 flex items-center gap-3">
        <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700" @click="resetBoard">Reset board</button>
        <span v-if="done" class="text-sm text-brand-700">{{ done }}</span>
      </div>
    </div>
  </section>
</template>
