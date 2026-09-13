<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
</script>

<template>
  <div class="flex min-h-full flex-col">
    <AppNav />
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
