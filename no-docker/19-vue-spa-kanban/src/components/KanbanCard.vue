<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '@/types'
import { PUBLIC_USERS } from '@/mocks/users'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ dragstart: [cardId: string]; dragend: []; dropBefore: [cardId: string] }>()

const dragging = ref(false)
const assignee = computed(() => PUBLIC_USERS.find((u) => u.id === props.card.assigneeId))
const priorityClass: Record<Card['priority'], string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-rose-100 text-rose-700',
}

function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.card.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  dragging.value = true
  emit('dragstart', props.card.id)
}
function onDragEnd() {
  dragging.value = false
  emit('dragend')
}
// Dropping onto a card inserts the dragged card before it.
function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const id = e.dataTransfer?.getData('text/plain')
  if (id && id !== props.card.id) emit('dropBefore', props.card.id)
}
</script>

<template>
  <RouterLink
    :to="{ name: 'card', params: { cardId: card.id } }"
    class="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-500 hover:shadow"
    :class="{ 'card-dragging': dragging }"
    draggable="true"
    :data-card-id="card.id"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover.prevent
    @drop="onDrop"
  >
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-sm font-semibold text-slate-900">{{ card.title }}</h3>
      <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" :class="priorityClass[card.priority]">{{ card.priority }}</span>
    </div>
    <p v-if="card.description" class="mt-1 line-clamp-2 text-xs text-slate-500">{{ card.description }}</p>
    <div class="mt-2 flex items-center justify-between">
      <ul class="flex flex-wrap gap-1">
        <li v-for="tag in card.tags" :key="tag" class="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">#{{ tag }}</li>
      </ul>
      <UserAvatar v-if="assignee" :user="assignee" size="sm" />
    </div>
  </RouterLink>
</template>
