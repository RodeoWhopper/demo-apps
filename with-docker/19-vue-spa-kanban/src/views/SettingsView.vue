<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBoardStore } from '@/stores/board'

const auth = useAuthStore()
const board = useBoardStore()
const router = useRouter()
const name = ref(auth.user?.name ?? '')
const saved = ref(false)
const exported = ref('')

function save() {
  auth.updateName(name.value)
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
function exportBoard() {
  exported.value = board.exportJson()
}
function signOut() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="mx-auto max-w-2xl px-4 py-10">
    <h1 class="text-2xl font-bold text-slate-900">Settings</h1>

    <form class="mt-6 rounded-xl border border-slate-200 bg-white p-5" @submit.prevent="save">
      <h2 class="font-semibold">Profile</h2>
      <label class="mt-3 block text-sm font-medium">Display name<input v-model="name" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <p class="mt-2 text-xs text-slate-500">Email: <span class="font-mono">{{ auth.user?.email }}</span> · Role: {{ auth.user?.role }}</p>
      <div class="mt-3 flex items-center gap-3">
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Save</button>
        <span v-if="saved" class="text-sm text-brand-700">Saved.</span>
      </div>
    </form>

    <div class="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 class="font-semibold">Session</h2>
      <p class="mt-1 text-sm text-slate-600">Mock token stored in <code>localStorage["flowboard.auth"]</code>:</p>
      <code class="mt-2 block break-all rounded bg-slate-50 p-2 text-xs">{{ auth.token }}</code>
      <button class="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50" @click="signOut">Sign out</button>
    </div>

    <div class="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 class="font-semibold">Board data</h2>
      <p class="mt-1 text-sm text-slate-600">Stored in <code>localStorage["flowboard.board"]</code>. Export it to see the raw shape.</p>
      <button class="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50" @click="exportBoard">Export JSON</button>
      <pre v-if="exported" class="mt-3 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{{ exported }}</pre>
    </div>
  </section>
</template>
