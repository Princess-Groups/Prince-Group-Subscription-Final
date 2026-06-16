// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable the Cloudflare Vite plugin so the build does not produce a Cloudflare worker
  // output. We deploy the frontend as a static SPA on Vercel.
  cloudflare: false,
  // Tell the TanStack Start plugin to emit a static SPA (one index.html per route)
  // and pre-render every known page so Vercel's static hosting can serve them.
  tanstackStart: {
    spa: {
      enabled: true,
      // Render the SPA shell directly to /index.html so Vercel's static
      // hosting serves it for the document root. Sub-routes are still
      // emitted as their own /<route>/index.html by `pages` below.
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoSubfolderIndex: true,
        outputPath: "/index.html",
      },
    },
    // Explicitly enumerate the static routes so each one is prerendered,
    // regardless of whether the crawler can reach it from the index.
    pages: [
      { path: "/", prerender: { enabled: true } },
      { path: "/plans", prerender: { enabled: true } },
      { path: "/earnings", prerender: { enabled: true } },
      { path: "/benefits", prerender: { enabled: true } },
      { path: "/contact", prerender: { enabled: true } },
      { path: "/my-services", prerender: { enabled: true } },
      { path: "/admin", prerender: { enabled: true } },
    ],
  },
  vite: {
    server: {
      proxy: {
        // Proxy /api calls to local server.mjs for local testing
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  },
});
