<template>
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient :id="gid" x1="0" y1="18" x2="36" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0.1" stop-color="#CE2A7F" />
        <stop offset="0.5" stop-color="#694FD4" />
        <stop offset="0.9" stop-color="#0EABCD" />
      </linearGradient>
    </defs>
    <path d="M0 17.9995L4.31026 25.3817L15.1795 6.57595H20.0993L20.1209 27.0712L30.6542 8.76947L26.9919 2.4001H9.0069L0 17.9995Z" :fill="fill" />
    <path d="M5.60501 27.6603L9.0081 33.6001H26.9931L36 18.0007L31.9681 11.0409L21.4181 29.3402L16.4407 29.3522V19.3206L11.5928 19.3086L12.0776 18.4566H16.4407L16.4335 8.88098L5.60501 27.6603Z" :fill="fill" />
  </svg>
</template>
<script setup lang="ts">
/* The mark wears the brand gradient. Pass flat to render in currentColor
   (footer, monochrome contexts). Gradient id is instance-unique so multiple
   logos on a page don't collide. */
const props = defineProps<{ flat?: boolean }>();
const gid = `uavs-g-${Math.random().toString(36).slice(2, 8)}`;
const fill = computed(() => (props.flat ? "currentColor" : `url(#${gid})`));
</script>
