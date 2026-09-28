// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/content",
  ],
  tailwindcss: {
    cssPath: "~/assets/css/main.css",
  },
  css: [
    "@fontsource-variable/inter/index.css",
    "@fontsource/dm-mono/400.css",
    "@fontsource/dm-mono/500.css",
  ],
  build: {
    transpile: [
      "@headlessui/vue",
    ],
  },
  nitro: {
    // emit .gz/.br next to every asset so any static host serves compressed
    compressPublicAssets: true,
  },
  routeRules: {
    // The Design Documentation page was folded into the Ladybug page. Anything
    // already linking to the old URL — the TDP, judges' notes, bookmarks —
    // lands on the process section instead of a 404.
    "/design-documentation": { redirect: { to: "/ladybug#process", statusCode: 301 } },
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#0a0d12" },
      ],
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // three and animejs must never reach the entry chunk; they are only
          // ever pulled in by dynamic import() from lib/ modules.
          manualChunks(id: string) {
            if (id.includes("node_modules/three")) return "three";
            if (id.includes("node_modules/animejs")) return "anime";
            return undefined;
          },
        },
      },
    },
  },
});
