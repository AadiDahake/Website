<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="shot"
        ref="rootEl"
        class="lb"
        role="dialog"
        aria-modal="true"
        :aria-label="shot.caption || shot.alt"
        @click.self="emit('close')"
      >
        <figure class="lb-fig" :class="shot.paper && 'lb-fig--paper'">
          <img :src="shot.src" :alt="shot.alt" @click.stop>
          <figcaption class="lb-cap">
            <span v-if="shots.length > 1" class="label lb-count num">
              {{ (index ?? 0) + 1 }} / {{ shots.length }}
            </span>
            <span class="lb-text">{{ shot.caption }}</span>
          </figcaption>
        </figure>

        <button ref="closeEl" type="button" class="label lb-x" @click="emit('close')">
          Close <span aria-hidden="true">&#10005;</span>
        </button>

        <template v-if="shots.length > 1">
          <button type="button" class="lb-nav lb-prev" aria-label="Previous image" @click="step(-1)">
            <span aria-hidden="true">&lsaquo;</span>
          </button>
          <button type="button" class="lb-nav lb-next" aria-label="Next image" @click="step(1)">
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </template>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * The enlarged view for a set of images. Deliberately controlled — the caller
 * owns the index — so the same overlay serves the page galleries and the
 * figures inside a design-decision row without either of them owning a modal.
 *
 * Teleported to <body> because the sections it opens from set `overflow:
 * hidden`, and a fixed overlay rendered inside one of those is one stacking
 * context away from being clipped.
 */
const props = defineProps<{
  shots: GalleryShot[];
  /** null when closed. */
  index: number | null;
}>();

const emit = defineEmits<{
  close: [];
  "update:index": [value: number];
}>();

const rootEl = ref<HTMLElement | null>(null);
const closeEl = ref<HTMLElement | null>(null);

const shot = computed(() =>
  props.index === null ? null : props.shots[props.index] ?? null,
);

/** Wraps, so arrowing off either end stays inside the set. */
function step(delta: number) {
  if (props.index === null || !props.shots.length) return;
  const n = props.shots.length;
  emit("update:index", (props.index + delta + n) % n);
}

// Whatever was focused when the overlay opened gets focus back when it
// closes — otherwise dismissing it drops a keyboard user at the top of the
// document, several screens away from the photo they were looking at.
let restoreTo: HTMLElement | null = null;

watch(shot, (now, before) => {
  if (now && !before) {
    restoreTo = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    nextTick(() => closeEl.value?.focus());
  } else if (!now && before) {
    document.body.style.overflow = "";
    restoreTo?.focus?.();
    restoreTo = null;
  }
});

function onKey(e: KeyboardEvent) {
  if (props.index === null) return;
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }
  if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); return; }
  if (e.key === "ArrowRight") { e.preventDefault(); step(1); return; }
  if (e.key !== "Tab") return;

  // Minimal focus trap: the overlay only ever holds three or four buttons,
  // so cycling the list by hand beats pulling in a trap library.
  const focusable = rootEl.value?.querySelectorAll<HTMLElement>("button");
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2.5rem, 7vh, 4.5rem) clamp(1rem, 6vw, 5rem);
  background: rgb(var(--bg-rgb) / 0.96);
  animation: lb-in 160ms linear both;
}

@keyframes lb-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lb-fig {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-width: 100%;
  max-height: 100%;
}

.lb-fig img {
  display: block;
  max-width: 100%;
  /* leave room for the caption line under it */
  max-height: calc(100vh - 12rem);
  width: auto;
  height: auto;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid var(--line);
}

/* CAD screenshots come off Onshape on white. Sitting them on a light plate
   is honest about what they are (a drawing, not a photograph) and keeps the
   thin grey linework readable, which inverting them would not. */
.lb-fig--paper img {
  background: #f4f5f7;
  border-color: var(--line);
}

.lb-cap {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  justify-content: center;
  flex-wrap: wrap;
  color: var(--fg-soft);
  text-align: center;
}

.lb-count { color: var(--g3); }
.lb-text { max-width: 70ch; }

.lb-x {
  position: absolute;
  top: clamp(0.8rem, 3vh, 1.6rem);
  right: clamp(0.8rem, 3vw, 1.6rem);
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--fg-soft);
  transition: border-color 160ms linear, color 160ms linear;
}

.lb-x:hover { border-color: var(--g2); color: var(--fg); }

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.6rem;
  height: 3.4rem;
  font-size: 1.8rem;
  line-height: 1;
  border: 1px solid var(--line);
  background: rgb(var(--bg-rgb) / 0.8);
  color: var(--fg-soft);
  transition: border-color 160ms linear, color 160ms linear;
}

.lb-nav:hover { border-color: var(--g2); color: var(--fg); }
.lb-prev { left: clamp(0.4rem, 2vw, 1.4rem); }
.lb-next { right: clamp(0.4rem, 2vw, 1.4rem); }

@media (prefers-reduced-motion: reduce) {
  .lb { animation: none; }
}
</style>
