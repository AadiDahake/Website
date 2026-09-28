<template>
  <div class="shell">
    <a href="#main" class="skip-link">Skip to content</a>
    <div ref="glowEl" class="cursor-glow" aria-hidden="true" />
    <AppNav />
    <main id="main" :class="{ 'shell-main': !flush }">
      <slot />
    </main>
    <AppFooter />
    <EffectsPageFx />
  </div>
</template>

<script setup lang="ts">
// The home hero owns the full viewport under the fixed nav, so it opts out
// of the standard top offset.
const route = useRoute();
const flush = computed(() => route.path === "/");

// The brand gradient follows the cursor. Compositor-only: pointermove writes
// a transform and CSS eases it — no rAF loop, no layout, near-zero cost.
const glowEl = ref<HTMLElement | null>(null);
onMounted(() => {
  const el = glowEl.value;
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(pointer: coarse)").matches) return; // touch never sees it
  // Pointer events fire far faster than the display refreshes (high-polling
  // mice reach 1000Hz). Writing a style per event means a style recalc per
  // event; coalesce to one write per frame instead.
  let shown = false;
  let px = 0;
  let py = 0;
  let queued = false;
  const paint = () => {
    queued = false;
    el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    if (!shown) { shown = true; el.style.opacity = "1"; }
  };
  const onMove = (e: PointerEvent) => {
    px = e.clientX;
    py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  onBeforeUnmount(() => window.removeEventListener("pointermove", onMove));
});
</script>

<style scoped>
.shell-main {
  padding-top: var(--nav-h);
}

.cursor-glow {
  position: fixed;
  top: -130px;
  left: -130px;
  width: 260px;
  height: 260px;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  /* NO mix-blend-mode: a fixed blend layer over a hardware video layer made
     Chrome composite stale hero frames over scrolled content (the ghosting
     bug). Plain additive-looking alpha gradients read the same on black. */
  background:
    radial-gradient(closest-side at 42% 46%, rgb(var(--g1-rgb) / 0.16), transparent 72%),
    radial-gradient(closest-side at 58% 50%, rgb(var(--g2-rgb) / 0.14), transparent 74%),
    radial-gradient(closest-side at 50% 58%, rgb(var(--g3-rgb) / 0.15), transparent 72%),
    transparent;
  transition: transform 220ms cubic-bezier(0.2, 0.6, 0.3, 1), opacity 400ms linear;
  will-change: transform;
}
</style>
