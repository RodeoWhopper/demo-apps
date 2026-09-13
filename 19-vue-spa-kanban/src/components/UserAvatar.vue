<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/types'

const props = defineProps<{ user: User; size?: 'sm' | 'md' }>()
const initials = computed(() =>
  props.user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
    :class="size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs'"
    :style="{ backgroundColor: user.avatarColor }"
    :title="user.name"
  >{{ initials }}</span>
</template>
