<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MOCK_USERS } from '@/mocks/users'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const redirectTo = computed(() => (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/board'))
const adminRequired = computed(() => route.query.reason === 'admin')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    router.replace(redirectTo.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Sign-in failed.'
  } finally {
    busy.value = false
  }
}
function fill(u: (typeof MOCK_USERS)[number]) {
  email.value = u.email
  password.value = u.password
}
</script>

<template>
  <section class="mx-auto max-w-md px-4 py-16">
    <h1 class="text-2xl font-bold text-slate-900">Sign in</h1>
    <p class="mt-1 text-sm text-slate-600">Demo accounts only — nothing is sent to a server.</p>

    <div v-if="adminRequired" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <strong>Admin access required.</strong> <span v-if="auth.isAuthenticated">You are signed in as a {{ auth.user?.role }}; sign in with an admin account to open <code>{{ redirectTo }}</code>.</span>
    </div>

    <form class="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="login-form" @submit.prevent="submit">
      <label class="block text-sm font-medium text-slate-700">Email
        <input v-model="email" type="email" name="email" required autocomplete="username" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label class="block text-sm font-medium text-slate-700">Password
        <input v-model="password" type="password" name="password" required autocomplete="current-password" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <p v-if="error" class="rounded-lg bg-rose-50 p-2 text-sm text-rose-700" role="alert">{{ error }}</p>
      <button type="submit" :disabled="busy" class="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>

    <div class="mt-6">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (click to fill)</p>
      <ul class="mt-2 grid gap-2 sm:grid-cols-2">
        <li v-for="u in MOCK_USERS" :key="u.id">
          <button type="button" class="w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm hover:border-brand-500" @click="fill(u)">
            <span class="block font-semibold text-slate-900">{{ u.name }} <span class="ml-1 rounded bg-slate-100 px-1.5 text-[10px] uppercase text-slate-600">{{ u.role }}</span></span>
            <span class="block font-mono text-xs text-slate-500">{{ u.email }} / {{ u.password }}</span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
