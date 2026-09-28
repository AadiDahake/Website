<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>
<template>
  <div :id="sectionId" class="ps" :class="hero && 'ps-hero'">
    <!-- background image slot: framed and dimmed under the page ground -->
    <div v-if="$slots.background" class="ps-bg" aria-hidden="true">
      <slot name="background" />
      <div class="ps-veil" />
    </div>
    <div v-if="hero" class="glow ps-glow" aria-hidden="true" />
    <div v-bind="$attrs" class="wrap ps-body" :class="hero && 'ps-hero-body'">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  sectionId?: string;
  gradient?: boolean; // legacy prop, kept for old call sites
  hero?: boolean;
}>();
</script>

<style scoped>
.ps {
  position: relative;
  padding: clamp(2.5rem, 7vh, 5rem) 0;
  scroll-margin-top: calc(var(--nav-h) + 1rem);
  overflow: hidden;
}

.ps + .ps { border-top: 1px solid var(--line-soft); }

.ps-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.ps-bg :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.38;
}

.ps-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgb(var(--bg-rgb) / 0.92), rgb(var(--bg-rgb) / 0.55) 30%, rgb(var(--bg-rgb) / 0.55) 70%, rgb(var(--bg-rgb) / 0.96)),
    linear-gradient(90deg, rgb(var(--g1-rgb) / 0.10), rgb(var(--g2-rgb) / 0.08) 50%, rgb(var(--g3-rgb) / 0.10));
}

.ps-glow { opacity: 0.6; }

.ps-body {
  position: relative;
  z-index: 1;
}

/* hero: a compact animated page header, not a full viewport of prose */
.ps-hero { padding: clamp(5rem, 16vh, 9rem) 0 clamp(3rem, 9vh, 5rem); }

.ps-hero-body :deep(h1) {
  font-size: var(--size-huge);
  letter-spacing: -0.03em;
  line-height: 1;
  text-wrap: balance;
  max-width: 18ch;
  animation: ps-rise 700ms cubic-bezier(0.22, 0.9, 0.3, 1) both;
}

.ps-hero-body :deep(h2) {
  font-size: 1.15rem;
  font-weight: 400;
  color: var(--fg-soft);
  letter-spacing: 0;
  max-width: 52ch;
  margin-top: 1.1rem;
  animation: ps-rise 700ms cubic-bezier(0.22, 0.9, 0.3, 1) 120ms both;
}

.ps-hero-body::after {
  content: "";
  display: block;
  height: 1px;
  margin-top: 2rem;
  background: var(--grad);
  transform-origin: left center;
  animation: ps-rule 900ms cubic-bezier(0.22, 0.9, 0.3, 1) 200ms both;
}

/* non-hero body typography: replaces the old prose-invert styling */
.ps-body :deep(h1) { font-size: var(--size-head); margin-bottom: 1rem; }
.ps-body :deep(h2) { font-size: 1.35rem; margin-bottom: 0.8rem; }
.ps-body :deep(h3) { font-size: 1.1rem; margin-bottom: 0.5rem; }
.ps-body :deep(p) { color: var(--fg-soft); max-width: 68ch; }
.ps-body :deep(a:not(.btn)) {
  color: var(--fg);
  text-decoration: underline;
  text-decoration-color: var(--g2);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.ps-body :deep(a:not(.btn):hover) { text-decoration-thickness: 2px; }
.ps-body :deep(ul) { color: var(--fg-soft); padding-left: 1.2rem; }

@keyframes ps-rise {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ps-rule {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
</style>
