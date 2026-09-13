<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBoardStore } from '@/stores/board'
import { PUBLIC_USERS } from '@/mocks/users'
import type { Priority } from '@/types'

const props = defineProps<{ cardId: string }>()
const board = useBoardStore()
const router = useRouter()

const card = computed(() => board.getCard(props.cardId))
const column = computed(() => board.columnOf(props.cardId))

const form = reactive({ title: '', description: '', assigneeId: '' as string, priority: 'medium' as Priority, tags: '' })
watch(
  card,
  (c) => {
    if (!c) return
    form.title = c.title
    form.description = c.description
    form.assigneeId = c.assigneeId ?? ''
    form.priority = c.priority
    form.tags = c.tags.join(', ')
  },
  { immediate: true },
)

function close() {
  router.push({ name: 'board' })
}
function save() {
  board.updateCard(props.cardId, {
    title: form.title,
    description: form.description,
    assigneeId: form.assigneeId || null,
    priority: form.priority,
    tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
  })
  close()
}
function remove() {
  if (confirm('Delete this card?')) {
    board.deleteCard(props.cardId)
    close()
  }
}
function move(toColumnId: string) {
  board.moveCard(props.cardId, toColumnId)
}
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" @click.self="close">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <template v-if="card">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ column?.title }} · <span class="font-mono normal-case">{{ card.id }}</span></p>
            <h2 class="mt-1 text-lg font-bold text-slate-900">Edit card</h2>
          </div>
          <button class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close" @click="close">✕</button>
        </div>
        <form class="mt-4 space-y-3" @submit.prevent="save">
          <label class="block text-sm font-medium">Title<input v-model="form.title" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label class="block text-sm font-medium">Description<textarea v-model="form.description" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></textarea></label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-sm font-medium">Assignee
              <select v-model="form.assigneeId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Unassigned</option>
                <option v-for="u in PUBLIC_USERS" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </label>
            <label class="block text-sm font-medium">Priority
              <select v-model="form.priority" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
          </div>
          <label class="block text-sm font-medium">Tags (comma separated)<input v-model="form.tags" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <div class="flex flex-wrap items-center gap-2 pt-2">
            <label class="text-sm text-slate-600">Move to
              <select class="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" :value="column?.id" @change="move(($event.target as HTMLSelectElement).value)">
                <option v-for="c in board.columns" :key="c.id" :value="c.id">{{ c.title }}</option>
              </select>
            </label>
            <span class="flex-1"></span>
            <button type="button" class="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" @click="remove">Delete</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Save</button>
          </div>
        </form>
      </template>
      <template v-else>
        <h2 class="text-lg font-bold text-slate-900">Card not found</h2>
        <p class="mt-1 text-sm text-slate-600">No card with id <code class="font-mono">{{ cardId }}</code> exists on this board.</p>
        <button class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" @click="close">Back to board</button>
      </template>
    </div>
  </div>
</template>
