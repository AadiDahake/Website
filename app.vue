<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
<script setup lang="ts">
// Fonts are self-hosted via @fontsource (registered in nuxt.config css) —
// no runtime dependency on a font CDN. Preload the two latin faces the
// first paint actually uses so headlines settle immediately.
import interUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import monoUrl from "@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2?url";

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk && titleChunk !== "Home" ? `${titleChunk} | AmadorUAVs` : "AmadorUAVs";
  },
  link: [
    { rel: "preload", href: interUrl, as: "font", type: "font/woff2", crossorigin: "" },
    { rel: "preload", href: monoUrl, as: "font", type: "font/woff2", crossorigin: "" },
  ],
});
</script>
