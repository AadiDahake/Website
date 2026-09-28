<template>
  <NuxtLink class="sp card-glow">
    <div class="sp-inner">
      <slot />
    </div>
  </NuxtLink>
</template>
<script setup lang="ts">
/* Sponsor logo cell: the one sanctioned light surface on the site — logos
   need white. The gradient glow appears behind the card on hover. */
</script>
<style scoped>
.sp {
  position: relative;
  display: block;
  transition: transform 220ms cubic-bezier(0.33, 0, 0.2, 1);
}

.sp:hover { transform: translateY(-3px); }

.sp-inner {
  height: 9rem;
  background: #fff;
  border: 1px solid var(--line);
  padding: 1.5rem;
}

.sp-inner :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
