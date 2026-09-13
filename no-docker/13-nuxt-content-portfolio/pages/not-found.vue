<script setup lang="ts">
// Server-rendered 404 page. Nuxt pre-renders /404.html as a client-only shell, so this route is
// pre-rendered instead and copied over .output/public/404.html by scripts/postgenerate.mjs.
useHead({ title: 'Not found' })
</script>

<template>
  <NotFoundView :status-code="404" />
</template>
