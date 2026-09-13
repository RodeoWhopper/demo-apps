<script setup lang="ts">
defineProps<{
  path: string
  title: string
  date: string
  tags: string[]
  summary: string
  readingTime: number
}>()
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
</script>

<template>
  <article class="post-item">
    <div class="post-meta">
      <time :datetime="date">{{ fmt(date) }}</time>
      <span>· {{ readingTime }} min read</span>
    </div>
    <h3><NuxtLink :to="path">{{ title }}</NuxtLink></h3>
    <p class="muted">{{ summary }}</p>
    <ul class="tags">
      <li v-for="tag in tags" :key="tag">
        <NuxtLink :to="{ path: '/blog', query: { tag } }" class="tag">#{{ tag }}</NuxtLink>
      </li>
    </ul>
  </article>
</template>
