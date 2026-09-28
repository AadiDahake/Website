<template>
  <div>
    <div class="gal" data-reveal-group>
      <figure v-for="(shot, i) in shots" :key="shot.src + shot.caption" class="shot" :class="shot.paper && 'shot--paper'">
        <button type="button" class="shot-btn" :aria-label="`Enlarge: ${shot.caption}`" @click="open = i">
          <img :src="shot.src" :alt="shot.alt" loading="lazy" decoding="async">
          <span class="shot-zoom label" aria-hidden="true">Enlarge</span>
        </button>
        <figcaption class="label">{{ shot.caption }}</figcaption>
      </figure>
    </div>

    <Lightbox :shots="shots" :index="open" @close="open = null" @update:index="open = $event" />
  </div>
</template>

<script setup lang="ts">
/**
 * The contact-sheet grid used by both aircraft pages. Many small frames read
 * faster than a few large ones — judges scan the set — but small frames are
 * only useful if the detail is one click away, hence the lightbox.
 */
defineProps<{ shots: GalleryShot[] }>();

const open = ref<number | null>(null);
</script>

<style scoped>
.gal {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 1rem;
}

.shot {
  margin: 0;
  border: 1px solid var(--line-soft);
  background: var(--bg-2);
}

.shot-btn {
  position: relative;
  display: block;
  width: 100%;
  cursor: zoom-in;
}

.shot img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: center 60%;
  transition: opacity 180ms linear;
}

/* CAD screenshots are drawn on white: show them whole on a light plate
   rather than cropping into a photograph's frame. */
.shot--paper img {
  background: #f4f5f7;
  object-fit: contain;
  object-position: center;
}

.shot-zoom {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0.3rem 0.5rem;
  background: rgb(var(--bg-rgb) / 0.85);
  border-top: 1px solid var(--line-soft);
  border-left: 1px solid var(--line-soft);
  color: var(--g3);
  opacity: 0;
  transition: opacity 160ms linear;
}

.shot-btn:hover .shot-zoom,
.shot-btn:focus-visible .shot-zoom { opacity: 1; }
.shot-btn:hover img { opacity: 0.85; }

.shot figcaption {
  padding: 0.6rem 0.7rem;
  color: var(--dim);
}
</style>
