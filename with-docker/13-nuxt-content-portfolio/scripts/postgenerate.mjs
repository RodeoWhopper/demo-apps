// Replace the client-only 404 shell that `nuxt generate` emits with the fully pre-rendered
// /not-found page so static hosts (nginx, serve, Netlify…) return real HTML for unknown paths.
import { copyFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'

const out = resolve('.output/public')
const src = resolve(out, 'not-found/index.html')
const dest = resolve(out, '404.html')

try {
  await access(src)
  await copyFile(src, dest)
  console.log('[postgenerate] 404.html replaced with pre-rendered /not-found page')
} catch (err) {
  console.error('[postgenerate] could not copy /not-found to 404.html:', err.message)
  process.exit(1)
}
