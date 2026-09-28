<template>
  <NuxtLink :to="`/streaming${path}`" class="stp">
    <div class="stp-thumb">
      <img :src="`https://img.youtube.com/vi/${code}/0.jpg`" alt="Thumbnail" loading="lazy" width="320" height="180">
      <span class="stp-rec label" aria-hidden="true"><i />REC</span>
    </div>
    <div class="stp-copy">
      <h2>{{ title }}</h2>
      <p class="stp-when label num">
        {{ new Date(start).toLocaleDateString("en-us", { year: "numeric", month: "short", day: "numeric" }) }}
        · {{ new Date(start).toLocaleTimeString("en-us", { hour: "numeric", minute: "numeric" }) }}
        - {{ new Date(end).toLocaleTimeString("en-us", { hour: "numeric", minute: "numeric" }) }}
      </p>
      <p class="stp-desc">{{ description }}</p>
    </div>
  </NuxtLink>
</template>
<script setup lang="ts">
defineProps<{
  path: string;
  title: string;
  description: string;
  code: string;
  start: string;
  end: string;
}>();
</script>
<style scoped>
.stp {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  border: 1px solid var(--line-soft);
  background: var(--bg-2);
  padding: 0.8rem;
  transition: border-color 200ms linear, background 200ms linear;
}

.stp:hover { border-color: var(--g1); background: var(--bg-3); }

.stp-thumb {
  position: relative;
  flex-shrink: 0;
  width: min(240px, 38vw);
  border: 1px solid var(--line-soft);
}

.stp-thumb img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.stp-rec {
  position: absolute;
  top: 6px;
  left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.4rem;
  background: rgb(var(--bg-rgb) / 0.75);
  color: var(--g1);
}

.stp-rec i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--g1);
}

.stp-copy { min-width: 0; }
.stp-copy h2 { font-size: 1.05rem; margin-bottom: 0.25rem; }
.stp-when { margin: 0 0 0.5rem; color: var(--dim); }

.stp-desc {
  margin: 0;
  color: var(--fg-soft);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .stp { flex-direction: column; }
  .stp-thumb { width: 100%; }
}
</style>
