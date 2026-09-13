// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/content'],
  ssr: true,
  css: ['~/assets/css/main.css'],
  devServer: { port: 3013 },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s · Mara Yılmaz',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Mara Yılmaz — product designer. Case studies, writing and notes on design systems.' },
        { name: 'theme-color', content: '#6b4fe0' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'Mara Yılmaz — Blog', href: '/rss.xml' },
      ],
      // Apply the stored theme before first paint to avoid a flash of the wrong mode.
      script: [
        {
          innerHTML:
            "(function(){try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()",
        },
      ],
    },
  },
  content: {
    // Use Node's built-in sqlite (node:sqlite, Node >= 22.12) so no native addon is required.
    experimental: { nativeSqlite: true },
    build: { markdown: { toc: { depth: 2 } } },
  },
  routeRules: {
    '/rss.xml': { prerender: true },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml', '/not-found'],
    },
  },
  typescript: { strict: true },
})
