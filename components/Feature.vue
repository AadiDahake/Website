<template>
  <div class="feat" :class="rtl && 'feat-rtl'">
    <div class="feat-img photo-frame">
      <slot name="image" />
    </div>
    <div class="feat-copy">
      <slot />
      <NuxtLink :to="to" :target="target" :rel="target ? 'noopener' : undefined" class="label feat-cta">
        <slot name="cta" />
        <span aria-hidden="true">&rarr;</span>
      </NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  rtl?: boolean;
  to: string;
  target?: string;
}>();
</script>

<style scoped>
.feat {
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: clamp(1.2rem, 3vw, 2.5rem);
  align-items: center;
}

.feat-rtl { direction: rtl; }
.feat-rtl > * { direction: ltr; }

@media (max-width: 700px) {
  .feat, .feat-rtl { grid-template-columns: 1fr; direction: ltr; }
}

.feat-img :deep(img) {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.feat-copy :deep(h2) {
  font-size: 1.35rem;
  margin-bottom: 0.5rem;
}

.feat-copy :deep(p) { color: var(--fg-soft); }

.feat-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--fg);
  border-bottom: 1px solid var(--g2);
  padding-bottom: 2px;
  transition: color 160ms linear;
}

.feat-cta:hover { color: var(--g3); }
</style>
