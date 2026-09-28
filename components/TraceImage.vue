<template>
  <div ref="hostEl" class="trace photo-frame">
    <img :src="src" :alt="alt" loading="lazy">
    <canvas class="trace-canvas" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ src: string; alt: string }>();

const hostEl = ref<HTMLElement | null>(null);

onMounted(() => {
  let cleanup: (() => void) | null = null;
  let cancelled = false;
  import("~/lib/trace").then(({ initTrace }) => {
    if (!cancelled && hostEl.value) cleanup = initTrace(hostEl.value);
  }).catch(() => {
    const img = hostEl.value?.querySelector("img");
    if (img) img.style.opacity = "1";
  });
  onBeforeUnmount(() => {
    cancelled = true;
    cleanup?.();
  });
});
</script>

<style scoped>
.trace {
  position: relative;
  background-color: var(--bg-2);
}

.trace img {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 200ms linear;
}

.trace-canvas {
  position: absolute;
  inset: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  object-fit: cover;
  pointer-events: none;
}
</style>
