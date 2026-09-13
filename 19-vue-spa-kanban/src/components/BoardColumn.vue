<script setup lang="ts">
import { ref } from 'vue'
import type { Column } from '@/types'
import { useBoardStore } from '@/stores/board'
import KanbanCard from '@/components/KanbanCard.vue'

const props = defineProps<{ column: Column }>()
const board = useBoardStore()

const over = ref(false)
const adding = ref(false)
const newTitle = ref('')
const editingTitle = ref(false)
const titleDraft = ref(props.column.title)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  over.value = true
}
function onDragLeave(e: DragEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) over.value = false
}
// Drop on the column body appends the card to the end.
function onDrop(e: DragEvent) {
  e.preventDefault()
  over.value = false
  const id = e.dataTransfer?.getData('text/plain')
  if (id) board.moveCard(id, props.column.id)
}
function onDropBefore(targetCardId: string, draggedId?: string) {
  over.value = false
  const id = draggedId ?? currentDrag.value
  if (!id) return
  const index = props.column.cardIds.indexOf(targetCardId)
  board.moveCard(id, props.column.id, index)
}
const currentDrag = ref<string | null>(null)

function submitCard() {
  const created = board.addCard(props.column.id, { title: newTitle.value })
  if (created) {
    newTitle.value = ''
    adding.value = false
  }
}
function saveTitle() {
  board.renameColumn(props.column.id, titleDraft.value)
  editingTitle.value = false
}
function removeColumn() {
  const n = props.column.cardIds.length
  if (n === 0 || confirm(`Delete "${props.column.title}" and its ${n} card(s)?`)) board.deleteColumn(props.column.id)
}
</script>

<template>
  <section
    class="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/80 p-2 transition"
    :class="{ 'column-over': over }"
    :data-column-id="column.id"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <header class="flex items-center justify-between px-1 pb-2">
      <form v-if="editingTitle" class="flex-1" @submit.prevent="saveTitle">
        <input v-model="titleDraft" class="w-full rounded border border-slate-300 px-2 py-1 text-sm" autofocus @blur="saveTitle" @keydown.esc="editingTitle = false" />
      </form>
      <h2 v-else class="cursor-text text-sm font-semibold text-slate-700" title="Click to rename" @click="(titleDraft = column.title), (editingTitle = true)">
        {{ column.title }} <span class="ml-1 rounded-full bg-white px-1.5 text-xs text-slate-500">{{ column.cardIds.length }}</span>
      </h2>
      <button class="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600" title="Delete column" @click="removeColumn">
        <svg viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </header>

    <div class="flex min-h-16 flex-1 flex-col gap-2">
      <KanbanCard
        v-for="card in board.cardsFor(column)"
        :key="card.id"
        :card="card"
        @dragstart="currentDrag = $event"
        @dragend="currentDrag = null"
        @drop-before="onDropBefore($event)"
      />
    </div>

    <form v-if="adding" class="mt-2 space-y-2" @submit.prevent="submitCard">
      <input v-model="newTitle" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Card title" autofocus @keydown.esc="adding = false" />
      <div class="flex gap-2">
        <button type="submit" class="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">Add card</button>
        <button type="button" class="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-white" @click="adding = false">Cancel</button>
      </div>
    </form>
    <button v-else class="mt-2 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white hover:text-slate-800" @click="adding = true">+ Add a card</button>
  </section>
</template>
