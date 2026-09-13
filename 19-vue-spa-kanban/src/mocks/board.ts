import type { BoardState, Card } from '@/types'

const card = (
  id: string,
  title: string,
  description: string,
  assigneeId: string | null,
  priority: Card['priority'],
  tags: string[],
): Card => ({ id, title, description, assigneeId, priority, tags, createdAt: new Date('2026-09-01T09:00:00Z').toISOString() })

// Seed board used on first load and by "Reset board".
export function seedBoard(): BoardState {
  const cards: Card[] = [
    card('c-1', 'Write onboarding checklist', 'Cover account setup, first board and invites.', 'u-ana', 'medium', ['docs']),
    card('c-2', 'Design empty-state illustration', 'Friendly, monochrome, works in dark mode.', 'u-leo', 'low', ['design']),
    card('c-3', 'Keyboard shortcuts for moving cards', 'Alt+arrow moves a focused card between columns.', 'u-leo', 'high', ['a11y', 'frontend']),
    card('c-4', 'Export board as JSON', 'Download the current localStorage state.', null, 'medium', ['frontend']),
    card('c-5', 'Rate-limit login attempts', 'Even mocked auth should lock after 5 tries.', 'u-ana', 'high', ['security']),
    card('c-6', 'Ship v0.1', 'Tag release, write changelog, announce.', 'u-ana', 'medium', ['release']),
  ]
  return {
    columns: [
      { id: 'col-backlog', title: 'Backlog', cardIds: ['c-1', 'c-2'] },
      { id: 'col-progress', title: 'In progress', cardIds: ['c-3', 'c-4'] },
      { id: 'col-review', title: 'Review', cardIds: ['c-5'] },
      { id: 'col-done', title: 'Done', cardIds: ['c-6'] },
    ],
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    updatedAt: new Date().toISOString(),
  }
}
