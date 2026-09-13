<script setup lang="ts">
const route = useRoute()
const { data: posts } = await useAsyncData('blog-all', () => queryCollection('blog').order('date', 'DESC').all())

// Tag filter is driven by the ?tag= query string so filtered views are linkable.
const activeTag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : null))
const allTags = computed(() => [...new Set((posts.value ?? []).flatMap((p) => p.tags))].sort())
const filtered = computed(() =>
  activeTag.value ? (posts.value ?? []).filter((p) => p.tags.includes(activeTag.value!)) : posts.value ?? [],
)
useSeoMeta({ title: 'Blog', description: 'Notes on design systems, research and working with engineers.' })
</script>

<template>
  <section class="section container">
    <p class="eyebrow">Writing</p>
    <h1>Blog</h1>
    <div class="filter-bar" aria-label="Filter by tag">
      <NuxtLink to="/blog" class="tag" :class="{ active: !activeTag }">all</NuxtLink>
      <NuxtLink
        v-for="tag in allTags"
        :key="tag"
        :to="{ path: '/blog', query: { tag } }"
        class="tag"
        :class="{ active: activeTag === tag }"
      >#{{ tag }}</NuxtLink>
    </div>
    <p v-if="activeTag" class="muted">Showing {{ filtered.length }} post{{ filtered.length === 1 ? '' : 's' }} tagged <strong>#{{ activeTag }}</strong>.</p>
    <PostListItem
      v-for="post in filtered"
      :key="post.path"
      :path="post.path"
      :title="post.title"
      :date="post.date"
      :tags="post.tags"
      :summary="post.summary"
      :reading-time="post.readingTime"
    />
    <p v-if="filtered.length === 0" class="muted">No posts with that tag yet.</p>
  </section>
</template>
