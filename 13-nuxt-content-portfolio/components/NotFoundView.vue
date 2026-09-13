<script setup lang="ts">
defineProps<{ statusCode?: number; message?: string }>()
</script>

<template>
  <section class="container error">
    <p class="eyebrow">{{ statusCode ?? 404 }}</p>
    <h1>{{ (statusCode ?? 404) === 404 ? 'This page is not in the portfolio.' : 'Something broke.' }}</h1>
    <p class="muted">
      {{ (statusCode ?? 404) === 404 ? 'The link may be outdated. Try the work index or the blog.' : message }}
    </p>
    <p>
      <NuxtLink class="btn" to="/">Back home</NuxtLink>
      <NuxtLink class="btn btn-ghost" to="/work" style="margin-left: .5rem">Browse work</NuxtLink>
    </p>
  </section>
</template>
