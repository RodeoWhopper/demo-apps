// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://kestrel.example',
  server: { port: 4314, host: true },
  integrations: [
    starlight({
      title: 'Kestrel CLI',
      description: 'Kestrel is a single-binary CLI for creating, syncing and tearing down preview environments.',
      logo: { src: './src/assets/logo.svg', alt: 'Kestrel' },
      customCss: ['./src/styles/custom.css'],
      // Built-in Pagefind search is on by default; kept explicit for clarity.
      pagefind: true,
      // No `editLink` configured on purpose -> "Edit page" links are off.
      lastUpdated: false,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Installation', slug: 'installation' },
            { label: 'Configuration', slug: 'configuration' },
          ],
        },
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        {
          label: 'Reference',
          items: [{ label: 'CLI reference', slug: 'reference/cli' }],
        },
        { label: 'Changelog', slug: 'changelog' },
      ],
    }),
  ],
});
