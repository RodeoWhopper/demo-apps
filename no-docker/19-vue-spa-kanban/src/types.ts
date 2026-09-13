export type Role = 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarColor: string
}

export type Priority = 'low' | 'medium' | 'high'

export interface Card {
  id: string
  title: string
  description: string
  assigneeId: string | null
  priority: Priority
  tags: string[]
  createdAt: string
}

export interface Column {
  id: string
  title: string
  cardIds: string[]
}

export interface BoardState {
  columns: Column[]
  cards: Record<string, Card>
  updatedAt: string
}
