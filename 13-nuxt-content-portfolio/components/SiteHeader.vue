<script setup lang="ts">
const { theme, toggle } = useTheme()
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <header class="site-header">
    <div class="container nav">
      <NuxtLink to="/" class="brand" aria-label="Mara Yılmaz — home">
        <span class="mark" aria-hidden="true">M</span>
        <span>Mara Yılmaz</span>
      </NuxtLink>
      <button class="nav-toggle" :aria-expanded="open" aria-controls="site-nav" @click="open = !open">
        Menu
      </button>
      <nav id="site-nav" class="nav-links" :class="{ open }">
        <NuxtLink to="/work">Work</NuxtLink>
        <NuxtLink to="/blog">Blog</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
        <a href="/rss.xml" title="RSS feed">RSS</a>
        <button class="theme-toggle" type="button" :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`" @click="toggle">
          <span v-if="theme === 'dark'">☀︎</span>
          <span v-else>☾</span>
        </button>
      </nav>
    </div>
  </header>
</template>
