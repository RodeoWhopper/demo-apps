<script setup lang="ts">
const { data: about } = await useAsyncData('about', () => queryCollection('about').first())
useSeoMeta({ title: 'About', description: 'About Mara Yılmaz, product designer based in Istanbul and Berlin.' })
</script>

<template>
  <section class="section container">
    <div class="two-col">
      <div>
        <p class="eyebrow">About</p>
        <h1>{{ about?.title }}</h1>
        <div class="prose"><ContentRenderer v-if="about" :value="about" /></div>
      </div>
      <aside>
        <ul class="about-facts">
          <li><span>Based in</span><strong>Istanbul / Berlin</strong></li>
          <li><span>Experience</span><strong>11 years</strong></li>
          <li><span>Focus</span><strong>Design systems, B2B SaaS</strong></li>
          <li><span>Tools</span><strong>Figma, Storybook, Vue</strong></li>
          <li><span>Availability</span><strong>Q1 2027</strong></li>
          <li><span>Email</span><strong>hello@mara.example</strong></li>
        </ul>
      </aside>
    </div>
  </section>
</template>
