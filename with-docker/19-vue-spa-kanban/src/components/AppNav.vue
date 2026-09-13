<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useAuthStore()
const router = useRouter()

function signOut() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 font-bold text-slate-900">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white" aria-hidden="true">
          <svg viewBox="0 0 20 20" class="h-5 w-5" fill="currentColor"><rect x="3" y="4" width="4" height="12" rx="1"/><rect x="8" y="4" width="4" height="8" rx="1"/><rect x="13" y="4" width="4" height="10" rx="1"/></svg>
        </span>
        Flowboard
      </RouterLink>
      <nav class="flex items-center gap-1 text-sm">
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/board" class="rounded-md px-3 py-1.5 hover:bg-slate-100" active-class="bg-slate-100 font-semibold">Board</RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="rounded-md px-3 py-1.5 hover:bg-slate-100" active-class="bg-slate-100 font-semibold">Admin</RouterLink>
          <RouterLink to="/settings" class="rounded-md px-3 py-1.5 hover:bg-slate-100" active-class="bg-slate-100 font-semibold">Settings</RouterLink>
          <span class="mx-2 hidden items-center gap-2 sm:flex">
            <UserAvatar :user="auth.user!" size="sm" />
            <span class="text-slate-600">{{ auth.user?.name }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-500">{{ auth.user?.role }}</span>
          </span>
          <button class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50" @click="signOut">Sign out</button>
        </template>
        <template v-else>
          <RouterLink to="/api-mock" class="rounded-md px-3 py-1.5 hover:bg-slate-100">API mock</RouterLink>
          <RouterLink to="/login" class="rounded-md bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600">Sign in</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
