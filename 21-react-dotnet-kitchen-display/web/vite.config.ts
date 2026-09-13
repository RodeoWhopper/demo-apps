import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev only: the API (and SignalR hub) run on 8021; everything non-SPA is proxied so the browser
// sees a single origin, exactly like the production container that serves dist/ from wwwroot.
const api = "http://localhost:8021";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5021,
    strictPort: true,
    host: true,
    proxy: {
      "/api": api,
      "/healthz": api,
      "/openapi": api,
      "/scalar": api,
      "/hubs": { target: api, ws: true },
    },
  },
  preview: { port: 5021, strictPort: true, host: true },
  build: { outDir: "dist", sourcemap: false },
});
