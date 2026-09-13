import { queryCollection } from '@nuxt/content/server'

// Pre-rendered at build time (see routeRules + nitro.prerender in nuxt.config.ts),
// so the static output contains a real /rss.xml file.
const SITE = 'https://mara.example'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'blog').order('date', 'DESC').all()

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escape(p.title ?? '')}</title>
      <link>${SITE}${p.path}</link>
      <guid isPermaLink="true">${SITE}${p.path}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escape(p.summary)}</description>
${p.tags.map((t) => `      <category>${escape(t)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mara Yılmaz — Blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Notes on design systems, research and working with engineers.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`
  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return xml
})
