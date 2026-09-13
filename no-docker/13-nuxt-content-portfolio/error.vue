<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
useHead({ title: props.error?.statusCode === 404 ? 'Not found' : 'Something went wrong' })
</script>

<template>
  <NuxtLayout>
    <NotFoundView :status-code="error?.statusCode" :message="error?.message" />
  </NuxtLayout>
</template>
