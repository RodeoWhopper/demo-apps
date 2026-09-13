<script setup lang="ts">
const route = useRoute()
const { data: post } = await useAsyncData(`blog-${route.path}`, () => queryCollection('blog').path(route.path).first())
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}
useSeoMeta({ title: post.value.title, description: post.value.summary })
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
</script>

<template>
  <article v-if="post">
    <header class="article-head container">
      <div class="post-meta"><time :datetime="post.date">{{ fmt(post.date) }}</time><span>· {{ post.readingTime }} min read</span></div>
      <h1>{{ post.title }}</h1>
      <p class="lead muted" style="max-width: 60ch">{{ post.summary }}</p>
      <ul class="tags">
        <li v-for="tag in post.tags" :key="tag"><NuxtLink :to="{ path: '/blog', query: { tag } }" class="tag">#{{ tag }}</NuxtLink></li>
      </ul>
    </header>
    <div class="container prose" style="padding-bottom: 4rem">
      <ContentRenderer :value="post" />
      <p style="margin-top: 3rem"><NuxtLink to="/blog">← All posts</NuxtLink></p>
    </div>
  </article>
</template>
