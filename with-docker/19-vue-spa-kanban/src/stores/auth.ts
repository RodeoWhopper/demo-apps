import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@/types'
import { findUserByCredentials, toPublicUser } from '@/mocks/users'

const STORAGE_KEY = 'flowboard.auth'

interface Session {
  token: string
  user: User
  issuedAt: string
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function fakeToken(email: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `mock.${btoa(email)}.${rand}`
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(loadSession())

  const user = computed(() => session.value?.user ?? null)
  const token = computed(() => session.value?.token ?? null)
  const isAuthenticated = computed(() => session.value !== null)
  const isAdmin = computed(() => session.value?.user.role === 'admin')

  async function login(email: string, password: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 350)) // pretend there is a network round-trip
    const found = findUserByCredentials(email, password)
    if (!found) throw new Error('Invalid email or password.')
    const next: Session = { token: fakeToken(found.email), user: toPublicUser(found), issuedAt: new Date().toISOString() }
    session.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next.user
  }

  function logout() {
    session.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function updateName(name: string) {
    if (!session.value) return
    session.value = { ...session.value, user: { ...session.value.user, name: name.trim() || session.value.user.name } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
  }

  return { user, token, isAuthenticated, isAdmin, login, logout, updateName }
})
