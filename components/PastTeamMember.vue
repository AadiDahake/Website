<template>
  <div class="ptm">
    <div class="ptm-avatar">
      <slot />
    </div>
    <div class="ptm-body">
      <p class="ptm-name">
        {{ name }}<span class="ptm-year num">'{{ year }}</span>
      </p>
      <p v-if="founder" class="label ptm-founder">Founder</p>
      <p class="label ptm-title">{{ officer ? "★ " : "" }}{{ title }}</p>
      <div class="ptm-meta">
        <NuxtLink v-if="university" :to="to" target="_blank" class="ptm-uni">
          {{ university }}
        </NuxtLink>
        <span v-else class="ptm-uni-none">&mdash;</span>
        <NuxtLink :to="`mailto:${email}`" class="ptm-mail" aria-label="Email">
          <HeroIcon name="envelope" size="mini" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  name: string;
  year: string;
  title: string;
  officer?: boolean;
  founder?: boolean;
  email: string;
  to?: string;
  university?: string;
}>();
</script>
<style scoped>
.ptm {
  /* Uniform cards: the grid stretches every cell to the tallest in its row,
     and the body is a column so the meta row can be pinned to the bottom.
     Without this, alumni who have no college listed produced short boxes
     and a ragged grid. */
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  height: 100%;
  min-height: 8rem;
  border: 1px solid var(--line-soft);
  background: var(--bg-2);
  padding: 0.9rem;
  transition: border-color 200ms linear;
}

.ptm:hover { border-color: var(--line); }

.ptm-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.ptm-avatar :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ptm-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ptm-name {
  margin: 0;
  color: var(--fg);
  font-weight: 600;
  /* up to two lines, then ellipsis: full names stay readable while the
     card height stays fixed, which is what keeps the grid even */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.2;
}

.ptm-year {
  margin-left: 0.4rem;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--dim);
}

.ptm-founder { margin: 0.1rem 0 0; color: var(--g1); }
.ptm-title {
  margin: 0.15rem 0 0.35rem;
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ptm-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-width: 0;
  /* pinned to the card's bottom edge so every row of cards aligns */
  margin-top: auto;
  padding-top: 0.4rem;
  min-height: 1.35rem;
}

.ptm-uni {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--fg-soft);
  text-decoration: underline;
  text-decoration-color: var(--g2);
  text-underline-offset: 3px;
}

.ptm-uni-none { font-size: 0.85rem; color: var(--dim); }

.ptm-mail { color: var(--dim); }
.ptm-mail:hover { color: var(--g3); }
</style>
