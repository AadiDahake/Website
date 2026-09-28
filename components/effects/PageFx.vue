<script setup lang="ts">
/**
 * Renders nothing. Mounts the site-wide reveal/counter system and re-runs it
 * on route change, so server-rendered markup stays the source of truth and
 * only the effects are client-side.
 */
const route = useRoute();
let cleanup: (() => void) | null = null;
let cancelled = false;

function mount() {
  cleanup?.();
  cleanup = null;
  import("~/lib/reveal").then(({ initReveal }) => {
    if (!cancelled) cleanup = initReveal(document);
  });
}

onMounted(() => {
  mount();
  watch(() => route.fullPath, () => nextTick(mount));
});

onBeforeUnmount(() => {
  cancelled = true;
  cleanup?.();
});
</script>

<template><span /></template>
