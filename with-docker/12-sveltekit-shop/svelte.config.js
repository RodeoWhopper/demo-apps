import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Emits a Node server into ./build; run it with `node build` (PORT/HOST/ORIGIN env vars).
    adapter: adapter({ out: "build" }),
  },
};

export default config;
