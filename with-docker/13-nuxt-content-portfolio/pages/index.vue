<script setup lang="ts">
const { data: home } = await useAsyncData('home', () => queryCollection('home').first())
const { data: featured } = await useAsyncData('featured-work', () =>
  queryCollection('work').order('order', 'ASC').limit(3).all(),
)
const { data: posts } = await useAsyncData('recent-posts', () =>
  queryCollection('blog').order('date', 'DESC').limit(3).all(),
)
useSeoMeta({ title: 'Product Designer', description: home.value?.description })
</script>

<template>
  <div>
    <section class="hero container">
      <span class="availability">{{ home?.availability }}</span>
      <h1>{{ home?.title }}</h1>
      <p class="lead">{{ home?.tagline }}</p>
      <div class="hero-actions">
        <NuxtLink class="btn" to="/work">See selected work</NuxtLink>
        <NuxtLink class="btn btn-ghost" to="/about">About me</NuxtLink>
      </div>
    </section>

    <section class="section container">
      <div class="section-head">
        <h2>Selected work</h2>
        <NuxtLink to="/work">All case studies →</NuxtLink>
      </div>
      <div class="work-grid">
        <WorkCard
          v-for="item in featured"
          :key="item.path"
          :path="item.path"
          :title="item.title"
          :client="item.client"
          :year="item.year"
          :summary="item.summary"
          :accent="item.accent"
        />
      </div>
    </section>

    <section v-if="home" class="section container prose">
      <ContentRenderer :value="home" />
    </section>

    <section class="section container">
      <div class="section-head">
        <h2>Recent writing</h2>
        <NuxtLink to="/blog">All posts →</NuxtLink>
      </div>
      <PostListItem
        v-for="post in posts"
        :key="post.path"
        :path="post.path"
        :title="post.title"
        :date="post.date"
        :tags="post.tags"
        :summary="post.summary"
        :reading-time="post.readingTime"
      />
    </section>
  </div>
</template>
