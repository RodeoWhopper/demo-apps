<script setup lang="ts">
const route = useRoute()
const { data: study } = await useAsyncData(`work-${route.path}`, () => queryCollection('work').path(route.path).first())
if (!study.value) {
  throw createError({ statusCode: 404, statusMessage: 'Case study not found', fatal: true })
}
const { data: siblings } = await useAsyncData(`work-siblings-${route.path}`, () =>
  queryCollectionItemSurroundings('work', route.path, { fields: ['title'] }),
)
useSeoMeta({ title: study.value.title, description: study.value.summary })
</script>

<template>
  <article v-if="study">
    <header class="case-head" :style="{ '--card-accent': study.accent }">
      <div class="container">
        <p class="eyebrow">{{ study.client }} · {{ study.year }}</p>
        <h1>{{ study.title }}</h1>
        <p class="lead muted" style="max-width: 60ch">{{ study.summary }}</p>
        <dl class="case-facts">
          <div><dt>Client</dt><dd>{{ study.client }}</dd></div>
          <div><dt>Role</dt><dd>{{ study.role }}</dd></div>
          <div><dt>Year</dt><dd>{{ study.year }}</dd></div>
        </dl>
      </div>
    </header>
    <div class="section container">
      <div class="outcome"><strong>Outcome:</strong> {{ study.outcome }}</div>
      <div class="prose">
        <ContentRenderer :value="study" />
      </div>
      <nav class="two-col" style="margin-top: 3rem" aria-label="Other case studies">
        <div v-if="siblings?.[0]"><p class="eyebrow">Previous</p><NuxtLink :to="siblings[0].path">{{ siblings[0].title }}</NuxtLink></div>
        <div v-if="siblings?.[1]" style="text-align: right"><p class="eyebrow">Next</p><NuxtLink :to="siblings[1].path">{{ siblings[1].title }}</NuxtLink></div>
      </nav>
    </div>
  </article>
</template>
