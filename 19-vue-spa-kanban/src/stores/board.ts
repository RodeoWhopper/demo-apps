import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { BoardState, Card, Column } from '@/types'
import { seedBoard } from '@/mocks/board'

const STORAGE_KEY = 'flowboard.board'

function load(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BoardState
    return Array.isArray(parsed.columns) && parsed.cards ? parsed : null
  } catch {
    return null
  }
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const useBoardStore = defineStore('board', () => {
  const state = ref<BoardState>(load() ?? seedBoard())

  watch(
    state,
    (value) => {
      value.updatedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true, immediate: true },
  )

  const columns = computed(() => state.value.columns)
  const cardCount = computed(() => Object.keys(state.value.cards).length)
  const updatedAt = computed(() => state.value.updatedAt)

  const getCard = (id: string): Card | undefined => state.value.cards[id]
  const cardsFor = (column: Column): Card[] =>
    column.cardIds.map((id) => state.value.cards[id]).filter((c): c is Card => Boolean(c))
  const columnOf = (cardId: string): Column | undefined => state.value.columns.find((c) => c.cardIds.includes(cardId))

  function addCard(columnId: string, input: Pick<Card, 'title'> & Partial<Omit<Card, 'id' | 'createdAt'>>): Card | null {
    const column = state.value.columns.find((c) => c.id === columnId)
    const title = input.title.trim()
    if (!column || !title) return null
    const card: Card = {
      id: newId('c'),
      title,
      description: input.description ?? '',
      assigneeId: input.assigneeId ?? null,
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      createdAt: new Date().toISOString(),
    }
    state.value.cards[card.id] = card
    column.cardIds.push(card.id)
    return card
  }

  function updateCard(id: string, patch: Partial<Omit<Card, 'id' | 'createdAt'>>) {
    const existing = state.value.cards[id]
    if (!existing) return
    state.value.cards[id] = { ...existing, ...patch, title: (patch.title ?? existing.title).trim() || existing.title }
  }

  function deleteCard(id: string) {
    const column = columnOf(id)
    if (column) column.cardIds = column.cardIds.filter((c) => c !== id)
    delete state.value.cards[id]
  }

  // Move a card to a column, optionally at a specific index (append when omitted).
  function moveCard(cardId: string, toColumnId: string, toIndex?: number) {
    const from = columnOf(cardId)
    const to = state.value.columns.find((c) => c.id === toColumnId)
    if (!from || !to) return
    const fromIndex = from.cardIds.indexOf(cardId)
    from.cardIds.splice(fromIndex, 1)
    let index = toIndex ?? to.cardIds.length
    if (from.id === to.id && toIndex !== undefined && toIndex > fromIndex) index -= 1
    index = Math.max(0, Math.min(index, to.cardIds.length))
    to.cardIds.splice(index, 0, cardId)
  }

  function addColumn(title: string) {
    const t = title.trim()
    if (!t) return
    state.value.columns.push({ id: newId('col'), title: t, cardIds: [] })
  }

  function renameColumn(id: string, title: string) {
    const column = state.value.columns.find((c) => c.id === id)
    if (column && title.trim()) column.title = title.trim()
  }

  function deleteColumn(id: string) {
    const index = state.value.columns.findIndex((c) => c.id === id)
    if (index === -1) return
    const [removed] = state.value.columns.splice(index, 1)
    removed?.cardIds.forEach((cid) => delete state.value.cards[cid])
  }

  function reset() {
    state.value = seedBoard()
  }

  function exportJson(): string {
    return JSON.stringify(state.value, null, 2)
  }

  return { columns, cardCount, updatedAt, getCard, cardsFor, columnOf, addCard, updateCard, deleteCard, moveCard, addColumn, renameColumn, deleteColumn, reset, exportJson }
})
