<template>
  <div class="acc">
    <div
      v-for="(section, index) in sections"
      :key="index"
      class="acc-item"
      :class="openSection === index && 'acc-open'"
    >
      <button class="acc-head" :aria-expanded="openSection === index" @click="toggle(index)">
        <span class="acc-idx label num">{{ String(index + 1).padStart(2, "0") }}</span>
        <span class="acc-title">{{ section.title }}</span>
        <span class="acc-sign label" aria-hidden="true">{{ openSection === index ? "−" : "+" }}</span>
      </button>

      <transition name="acc-slide">
        <div v-if="openSection === index" class="acc-body" :class="rtl && 'acc-rtl'">
          <div v-if="section.image" class="acc-imgs">
            <img :src="section.image" :alt="section.title" loading="lazy">
            <img v-if="section.image2" :src="section.image2" :alt="`${section.title} extra image 1`" loading="lazy">
            <img v-if="section.image3" :src="section.image3" :alt="`${section.title} extra image 2`" loading="lazy">
          </div>
          <div class="acc-text" v-html="section.content" />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  rtl?: boolean;
  sections: {
    title: string;
    content: string;
    image?: string;
    image2?: string;
    image3?: string;
  }[];
}>();

const openSection = ref<number | null>(null);
const toggle = (index: number) => {
  openSection.value = openSection.value === index ? null : index;
};
</script>

<style scoped>
.acc { border: 1px solid var(--line-soft); }

.acc-item + .acc-item { border-top: 1px solid var(--line-soft); }

.acc-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.2rem;
  text-align: left;
  color: var(--fg);
  font-weight: 600;
  transition: background 160ms linear;
}

.acc-head:hover { background: var(--bg-2); }
.acc-open .acc-head { background: var(--bg-2); }

.acc-idx { color: var(--dim); }
.acc-open .acc-idx { color: var(--g3); }
.acc-title { flex: 1; }
.acc-sign { color: var(--dim); }

.acc-body {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 1.4rem;
  padding: 0.4rem 1.2rem 1.4rem;
}

.acc-rtl { direction: rtl; }
.acc-rtl > * { direction: ltr; }

@media (max-width: 780px) {
  .acc-body, .acc-rtl { grid-template-columns: 1fr; direction: ltr; }
}

.acc-imgs {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.acc-imgs img {
  width: 100%;
  max-height: 16rem;
  object-fit: cover;
  border: 1px solid var(--line-soft);
}

.acc-text { color: var(--fg-soft); }
.acc-text :deep(h1), .acc-text :deep(h2), .acc-text :deep(h3) { color: var(--fg); margin-bottom: 0.5rem; }
.acc-text :deep(a) { color: var(--fg); text-decoration: underline; text-decoration-color: var(--g2); }

.acc-slide-enter-active { transition: opacity 220ms linear, transform 220ms cubic-bezier(0.22, 0.9, 0.3, 1); }
.acc-slide-enter-from { opacity: 0; transform: translateY(-8px); }
.acc-slide-leave-active { transition: opacity 140ms linear; }
.acc-slide-leave-to { opacity: 0; }
</style>
