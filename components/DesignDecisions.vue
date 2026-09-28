<template>
  <div class="dec">
    <div
      v-for="(d, i) in decisions"
      :key="d.what"
      class="dec-item"
      :class="open.has(i) && 'dec-item--open'"
      :data-hue="d.hue"
    >
      <h3 class="dec-h">
        <button
          :id="`dec-h-${ids[i]}`"
          type="button"
          class="dec-head"
          :aria-expanded="open.has(i)"
          :aria-controls="`dec-p-${ids[i]}`"
          @click="toggle(i)"
        >
          <span class="label dec-tag">{{ d.tag }}</span>
          <span class="dec-what">{{ d.what }}</span>
          <span class="dec-why">{{ d.why }}</span>
          <span class="dec-sign label" aria-hidden="true">{{ open.has(i) ? "−" : "+" }}</span>
        </button>
      </h3>

      <div
        :id="`dec-p-${ids[i]}`"
        role="region"
        :aria-labelledby="`dec-h-${ids[i]}`"
        class="dec-panel"
        :inert="!open.has(i)"
      >
        <div class="dec-panel-in">
          <!-- eslint-disable-next-line vue/no-v-html -- authored copy, not user input -->
          <div class="dec-detail" v-html="d.detail" />

          <div v-if="d.figures?.length || d.video" class="dec-media">
            <figure v-if="d.video" class="dec-fig">
              <video
                class="dec-video"
                :poster="d.video.poster"
                controls
                playsinline
                preload="none"
              >
                <source :src="d.video.src" type="video/mp4">
              </video>
              <figcaption class="label">{{ d.video.caption }}</figcaption>
            </figure>
            <figure v-for="(f, fi) in d.figures" :key="f.src" class="dec-fig" :class="f.paper && 'dec-fig--paper'">
              <button
                type="button"
                class="dec-fig-btn"
                :aria-label="`Enlarge: ${f.caption}`"
                @click="openFig(d.figures ?? [], fi)"
              >
                <img :src="f.src" :alt="f.alt" loading="lazy" decoding="async">
              </button>
              <figcaption class="label">{{ f.caption }}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>

    <Lightbox :shots="lbShots" :index="lbIndex" @close="lbIndex = null" @update:index="lbIndex = $event" />
  </div>
</template>

<script setup lang="ts">
// DesignDecision and friends are ambient (types/index.d.ts) so the page can
// type its data without importing from a component.
const props = defineProps<{ decisions: DesignDecision[] }>();

// The aria-controls / aria-labelledby pair needs ids that are stable across
// server render and hydration. Deriving them from the row's own tag is
// deterministic by construction, which a counter or a random suffix is not.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ids = computed(() => props.decisions.map(d => slug(d.tag)));

const open = ref(new Set<number>());
function toggle(i: number) {
  const next = new Set(open.value);
  if (!next.delete(i)) next.add(i);
  open.value = next;
}

// The figures in an expanded row are thumbnails in a two-column panel, which
// is far too small for a CAD screenshot. One lightbox serves every row; it is
// handed only the figures of the row that was clicked, so arrowing left and
// right stays inside that decision instead of wandering into the next one.
const lbShots = ref<GalleryShot[]>([]);
const lbIndex = ref<number | null>(null);

function openFig(figures: DesignDecisionFigure[], i: number) {
  lbShots.value = figures;
  lbIndex.value = i;
}
</script>

<style scoped>
.dec { border: 1px solid var(--line-soft); }
.dec-item + .dec-item { border-top: 1px solid var(--line-soft); }

.dec-h { margin: 0; font-size: inherit; font-weight: inherit; letter-spacing: 0; }

.dec-head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 1rem;
  width: 100%;
  padding: 0.9rem 1rem;
  text-align: left;
  transition: background 160ms linear;
}

.dec-head::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--hue);
  opacity: 0;
  transition: opacity 180ms linear;
}

.dec-head:hover { background: var(--bg-2); }
.dec-head:hover::before { opacity: 1; }
.dec-item--open .dec-head { background: var(--bg-2); }
.dec-item--open .dec-head::before { opacity: 1; }

.dec-tag { width: 7.5rem; flex-shrink: 0; color: var(--hue); }
.dec-what { color: var(--fg); font-weight: 600; width: min(20rem, 34vw); flex-shrink: 0; }
.dec-why { color: var(--fg-soft); }
.dec-sign { margin-left: auto; color: var(--dim); flex-shrink: 0; }

@media (max-width: 720px) {
  .dec-head { flex-wrap: wrap; }
  .dec-what { width: auto; }
  .dec-sign { margin-left: 0; }
}

/* Height is animated by the grid-rows 0fr→1fr trick so the panel can size
   itself to its content. A collapsed panel is only clipped, not removed, so
   `inert` (not `hidden`, which would kill the transition) is what keeps it
   out of the tab order and off the accessibility tree. */
.dec-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms cubic-bezier(0.22, 0.9, 0.3, 1);
}

.dec-item--open .dec-panel { grid-template-rows: 1fr; }

.dec-panel-in {
  overflow: hidden;
  min-height: 0;
}

.dec-detail {
  padding: 0.2rem 1rem 1.2rem 1rem;
  border-left: 2px solid var(--hue);
  color: var(--fg-soft);
  margin-left: 1rem;
}

.dec-detail :deep(p) { max-width: 76ch; margin: 0 0 0.8rem; }
.dec-detail :deep(p:last-child) { margin-bottom: 0; }
.dec-detail :deep(h4) {
  color: var(--fg);
  font-size: 0.95rem;
  margin: 1.1rem 0 0.35rem;
}
.dec-detail :deep(ul) { margin: 0 0 0.8rem; padding-left: 1.1rem; }
.dec-detail :deep(li) { margin-bottom: 0.3rem; }
.dec-detail :deep(strong) { color: var(--fg); font-weight: 600; }
.dec-detail :deep(.num) { font-family: var(--mono); color: var(--fg); }

.dec-media {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.9rem;
  padding: 0 1rem 1.3rem 2rem;
}

.dec-fig { margin: 0; }
.dec-fig-btn { display: block; width: 100%; cursor: zoom-in; }
.dec-fig-btn:hover img { opacity: 0.85; }
.dec-fig-btn:focus-visible img { border-color: var(--g2); }

.dec-fig img,
.dec-video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid var(--line-soft);
  background: var(--bg-2);
  transition: opacity 180ms linear, border-color 160ms linear;
}

/* CAD screenshots are white-background drawings: fit them whole on a light
   plate instead of cropping into them like a photograph. */
.dec-fig--paper img {
  object-fit: contain;
  background: #f4f5f7;
}

.dec-fig figcaption { padding-top: 0.5rem; color: var(--dim); }

@media (max-width: 720px) {
  .dec-detail { margin-left: 0; padding-left: 0.9rem; }
  .dec-media { padding-left: 1rem; }
}
</style>
