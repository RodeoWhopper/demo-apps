<script setup lang="ts">
defineProps<{
  path: string
  title: string
  client: string
  year: number
  summary: string
  accent: string
}>()
</script>

<template>
  <NuxtLink :to="path" class="work-card" :style="{ '--card-accent': accent }">
    <div class="work-card-art" aria-hidden="true">
      <svg viewBox="0 0 200 120" width="100%" height="100%">
        <rect width="200" height="120" rx="12" fill="var(--card-accent)" opacity=".15" />
        <rect x="24" y="24" width="72" height="10" rx="5" fill="var(--card-accent)" />
        <rect x="24" y="44" width="120" height="6" rx="3" fill="var(--card-accent)" opacity=".5" />
        <rect x="24" y="58" width="96" height="6" rx="3" fill="var(--card-accent)" opacity=".5" />
        <rect x="24" y="80" width="48" height="16" rx="8" fill="var(--card-accent)" />
        <circle cx="160" cy="84" r="18" fill="var(--card-accent)" opacity=".35" />
      </svg>
    </div>
    <div class="work-card-body">
      <p class="eyebrow">{{ client }} · {{ year }}</p>
      <h3>{{ title }}</h3>
      <p class="muted">{{ summary }}</p>
    </div>
  </NuxtLink>
</template>
