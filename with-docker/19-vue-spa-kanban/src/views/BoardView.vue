<script setup lang="ts">
import { ref } from 'vue'
import { useBoardStore } from '@/stores/board'
import BoardColumn from '@/components/BoardColumn.vue'

const board = useBoardStore()
const newColumn = ref('')

function addColumn() {
  board.addColumn(newColumn.value)
  newColumn.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Product board</h1>
        <p class="text-sm text-slate-500">{{ board.cardCount }} cards · saved to localStorage · drag cards between columns</p>
      </div>
      <form class="flex gap-2" @submit.prevent="addColumn">
        <input v-model="newColumn" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="New column" />
        <button class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Add column</button>
      </form>
    </div>

    <div class="flex items-start gap-4 overflow-x-auto pb-4" data-testid="board">
      <BoardColumn v-for="column in board.columns" :key="column.id" :column="column" />
    </div>

    <!-- Nested modal route (/board/:cardId) renders here on top of the board -->
    <RouterView />
  </div>
</template>
