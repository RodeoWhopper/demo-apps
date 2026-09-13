import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    home: defineCollection({
      type: 'page',
      source: 'index.md',
      schema: z.object({
        tagline: z.string(),
        availability: z.string(),
      }),
    }),
    about: defineCollection({
      type: 'page',
      source: 'about.md',
    }),
    work: defineCollection({
      type: 'page',
      source: 'work/*.md',
      schema: z.object({
        client: z.string(),
        year: z.number(),
        role: z.string(),
        summary: z.string(),
        accent: z.string(),
        order: z.number(),
        outcome: z.string(),
      }),
    }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        date: z.string(),
        tags: z.array(z.string()),
        summary: z.string(),
        readingTime: z.number(),
      }),
    }),
  },
})
