<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <section class="mx-auto max-w-xl px-4 py-24 text-center">
    <p class="text-6xl font-black text-brand-500">404</p>
    <h1 class="mt-2 text-2xl font-bold text-slate-900">Nothing at <code class="font-mono text-lg">{{ route.fullPath }}</code></h1>
    <p class="mt-2 text-slate-600">This 404 is rendered by the SPA's catch-all route — the server still answered 200 with <code>index.html</code>, which is exactly what history mode needs.</p>
    <RouterLink to="/" class="mt-6 inline-block rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600">Go home</RouterLink>
  </section>
</template>
