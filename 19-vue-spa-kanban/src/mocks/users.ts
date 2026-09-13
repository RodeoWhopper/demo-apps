import type { User } from '@/types'

// Hard-coded demo accounts. There is NO backend: "logging in" only compares against this list
// and stores a fake token in localStorage. Never do this in a real application.
export interface MockUser extends User {
  password: string
}

export const MOCK_USERS: MockUser[] = [
  { id: 'u-ana', name: 'Ana Ribeiro', email: 'ana@flowboard.app', password: 'Ana123!', role: 'admin', avatarColor: '#059669' },
  { id: 'u-leo', name: 'Leo Marchetti', email: 'leo@flowboard.app', password: 'Leo123!', role: 'member', avatarColor: '#2563eb' },
]

export function findUserByCredentials(email: string, password: string): MockUser | undefined {
  const normalized = email.trim().toLowerCase()
  return MOCK_USERS.find((u) => u.email === normalized && u.password === password)
}

export function toPublicUser(u: MockUser): User {
  const { password: _password, ...rest } = u
  return rest
}

export const PUBLIC_USERS: User[] = MOCK_USERS.map(toPublicUser)
