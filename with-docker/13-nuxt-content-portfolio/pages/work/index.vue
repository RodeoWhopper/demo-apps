<script setup lang="ts">
const { data: work } = await useAsyncData('work-all', () => queryCollection('work').order('order', 'ASC').all())
useSeoMeta({ title: 'Work', description: 'Selected product design case studies by Mara Yılmaz.' })
</script>

<template>
  <section class="section container">
    <p class="eyebrow">Case studies</p>
    <h1>Work</h1>
    <p class="muted" style="max-width: 60ch">
      Four projects that show how I think: research first, systems over screens, and shipping with engineers rather than handing off.
    </p>
    <div class="work-grid" style="margin-top: 2rem">
      <WorkCard
        v-for="item in work"
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
</template>
