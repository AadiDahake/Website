<template>
  <div class="its" :class="rtl && 'its-rtl'">
    <div class="its-img photo-frame">
      <slot name="image" />
    </div>
    <div class="its-text">
      <slot name="text" />
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  rtl?: boolean;
}>();
</script>

<style scoped>
.its {
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
}

.its-rtl { direction: rtl; }
.its-rtl > * { direction: ltr; }

@media (max-width: 780px) {
  .its, .its-rtl { grid-template-columns: 1fr; direction: ltr; }
}

.its-img :deep(img) {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.its-text :deep(h1) { font-size: var(--size-head); margin-bottom: 0.8rem; }
.its-text :deep(h2) { font-size: 1.3rem; margin-bottom: 0.6rem; }
.its-text :deep(p) { color: var(--fg-soft); }
</style>
