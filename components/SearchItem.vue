<template>
  <NuxtLink :to="page.link" class="row">
    <span class="idx" aria-hidden="true">&#9670;</span>
    <span class="si-title">{{ page.title }}</span>
    <span class="si-url label">amadoruavs.com{{ page.link }}</span>
    <span class="arrow" aria-hidden="true">&rarr;</span>
  </NuxtLink>
</template>

<script>
export default {
  props: ["page"],
};
</script>

<style scoped>
.si-title { color: var(--fg); font-weight: 600; }
.si-url { color: var(--dim); }
</style>
