<template>
  <div ref="hostEl" class="lbx">
    <div data-stage class="lbx-stage">
      <div class="glow lbx-glow" aria-hidden="true" />
      <canvas class="lbx-canvas" aria-hidden="true" />

      <!-- static poster for no-JS / no-WebGL -->
      <div class="lbx-poster" aria-hidden="true">
        <svg class="poster" viewBox="0 0 400 200" fill="none" stroke-width="1.1">
          <g stroke="#3c4152">
            <path pathLength="1" d="M200 78 L226 92 L226 118 L200 132 L174 118 L174 92 Z" />
          </g>
          <g stroke="#694fd4">
            <path pathLength="1" d="M218 88 L306 52 M182 88 L94 52 M218 122 L306 158 M182 122 L94 158" />
          </g>
          <g stroke="#0eabcd">
            <circle pathLength="1" cx="310" cy="50" r="26" />
            <circle pathLength="1" cx="90" cy="50" r="26" />
            <circle pathLength="1" cx="310" cy="160" r="26" />
            <circle pathLength="1" cx="90" cy="160" r="26" />
          </g>
        </svg>
      </div>

      <!-- The canvas is decorative to assistive tech; this is the model's
           actual text equivalent. The part list below is the operable
           equivalent of clicking the aircraft itself. -->
      <p class="sr-only">
        Interactive colour model of Ladybug. The plate stack holds a Pixhawk 6X and a Pi 5 and the 6S4P pack.
        Four latched arms run out to MN7005s on 24-inch folding props. Twin winches and a SIYI A8 hang under the belly
        on twistlock legs with printed skis.
      </p>

      <!-- Transparent orbit and pick surface. A real button, so it is
           focusable and named without inventing an ARIA pattern. -->
      <button
        data-orbit
        type="button"
        class="lbx-grab"
        aria-label="Ladybug model. Click a part to isolate it, drag to rotate, arrow keys to rotate, R to reset the view, Escape to show the whole aircraft."
      />

      <p class="label lbx-hint" aria-hidden="true">
        Click a part to isolate it · drag to rotate · R resets
      </p>

      <!-- what is isolated, or what the cursor is over -->
      <div class="lbx-read" :data-hue="active?.hue" :class="active && 'lbx-read--on'">
        <p class="label lbx-read-tag">{{ selected ? "Isolated" : "Under cursor" }}</p>
        <p class="lbx-read-t">{{ active?.label || "–" }}</p>
        <p class="lbx-read-d">{{ active?.spec || "" }}</p>
      </div>

    </div>

    <div class="lbx-side">
      <p id="lbx-side-h" class="label lbx-side-h">Isolate a system</p>
      <ul class="lbx-list" aria-labelledby="lbx-side-h">
        <li v-for="p in PARTS" :key="p.key">
          <button
            type="button"
            class="label lbx-item"
            :data-hue="p.hue"
            :class="selected === p.key && 'lbx-item--on'"
            :aria-pressed="selected === p.key"
            @click="toggle(p.key)"
          >
            <span class="lbx-dot" aria-hidden="true" />
            {{ p.label }}
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="label lbx-clear"
        :disabled="!selected"
        @click="toggle(null)"
      >
        Show whole aircraft
      </button>
    </div>

    <p class="sr-only" aria-live="polite">{{ liveText }}</p>
  </div>
</template>

<script setup lang="ts">
import { LADYBUG_PARTS as PARTS } from "~/lib/ladybug-parts";
import type { ExplorerHandle } from "~/lib/ladybugexplorer";

const hostEl = ref<HTMLElement | null>(null);
const selected = ref<string | null>(null);
const hovered = ref<string | null>(null);

// what the caption reads: the isolated part wins, the cursor fills in
const active = computed(() =>
  PARTS.find(p => p.key === (selected.value ?? hovered.value)) ?? null);

const liveText = computed(() => {
  const p = PARTS.find(x => x.key === selected.value);
  return p ? `${p.label} isolated. ${p.spec}` : "Whole aircraft shown.";
});

let handle: ExplorerHandle | null = null;

function toggle(key: string | null) {
  const next = key !== null && selected.value === key ? null : key;
  selected.value = next;
  handle?.select(next);
}

onMounted(() => {
  let cancelled = false;
  hostEl.value?.classList.add("lbx--js");

  import("~/lib/ladybugexplorer").then(({ initLadybugExplorer }) => {
    if (cancelled || !hostEl.value) return;
    handle = initLadybugExplorer(hostEl.value, {
      onSelect: (key) => { selected.value = key; },
      onHover: (key) => { hovered.value = key; },
    });
  }).catch(() => {
    hostEl.value?.classList.add("lbx--static");
  });

  onBeforeUnmount(() => {
    cancelled = true;
    handle?.dispose();
    handle = null;
  });
});
</script>

<style scoped>
.lbx {
  position: relative;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}

.lbx-stage {
  position: relative;
  height: min(76svh, 700px);
  overflow: hidden;
}

.lbx-glow { opacity: 0.4; }

.lbx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 300ms linear;
}

.lbx--static .lbx-canvas { display: none; }

.lbx-poster {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-soft);
}

.lbx--js:not(.lbx--static) .lbx-poster { display: none; }
.lbx-poster svg { width: min(70%, 460px); height: auto; }

.lbx-grab {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  /* the drag owns both axes; without this a horizontal drag on a phone is
     handed to the page scroller mid-gesture */
  touch-action: none;
}

.lbx--over .lbx-grab { cursor: pointer; }
.lbx--dragging .lbx-grab { cursor: grabbing; }
.lbx--static .lbx-grab { display: none; }

/* no visible control to outline, so the outline goes on the stage edge */
.lbx-grab:focus-visible {
  outline: 2px solid var(--g3-lift);
  outline-offset: -3px;
}

.lbx-hint {
  position: absolute;
  top: 1.2rem;
  left: var(--gutter);
  margin: 0;
  color: var(--dim);
  pointer-events: none;
}

.lbx--static .lbx-hint { display: none; }

/* ---- the caption: what is isolated, bottom left ---- */
.lbx-read {
  position: absolute;
  left: var(--gutter);
  bottom: 1.4rem;
  max-width: min(42ch, 60vw);
  padding: 0.9rem 1.2rem;
  background: rgb(var(--bg-rgb) / 0.82);
  border: 1px solid var(--line);
  border-left: 2px solid var(--hue, var(--line));
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 180ms linear, transform 180ms cubic-bezier(0.22, 0.9, 0.3, 1);
}

.lbx-read--on { opacity: 1; transform: translateY(0); }
.lbx-read-tag { color: var(--hue, var(--dim)); margin: 0 0 0.35rem; }
.lbx-read-t { color: var(--fg); font-weight: 600; font-size: 1.15rem; margin: 0 0 0.2rem; }
.lbx-read-d { color: var(--fg-soft); margin: 0; }

.lbx--static .lbx-read { display: none; }

/* ---- the part list: the operable twin of clicking the model ---- */
.lbx-side {
  position: absolute;
  top: 50%;
  right: var(--gutter);
  transform: translateY(-50%);
  width: 15rem;
  max-width: 42vw;
  background: rgb(var(--bg-rgb) / 0.78);
  border: 1px solid var(--line-soft);
  padding: 0.9rem;
}

.lbx-side-h { margin: 0 0 0.7rem; }

.lbx-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.lbx-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  text-align: left;
  color: var(--fg-soft);
  transition: background 140ms linear, color 140ms linear;
}

.lbx-item:hover { background: var(--bg-2); color: var(--fg); }
.lbx-item--on { background: var(--bg-3); color: var(--fg); }

.lbx-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  background: var(--hue);
  opacity: 0.45;
  transition: opacity 140ms linear;
}

.lbx-item:hover .lbx-dot,
.lbx-item--on .lbx-dot { opacity: 1; }

.lbx-clear {
  margin-top: 0.8rem;
  padding: 0.4rem 0.5rem;
  width: 100%;
  text-align: left;
  color: var(--g3-lift);
  transition: color 140ms linear;
}

.lbx-clear:disabled { color: var(--faint); cursor: default; }

/* no renderer, nothing to isolate */
.lbx--static .lbx-side { display: none; }

/* Narrow: the panel stops floating over the aircraft and becomes a strip of
   chips under it, which is also the only layout that fits nine labels. */
@media (max-width: 900px) {
  .lbx-stage { height: min(62svh, 520px); }

  .lbx-side {
    position: static;
    transform: none;
    width: auto;
    max-width: none;
    border: 0;
    border-top: 1px solid var(--line-soft);
    background: none;
    padding: 1rem var(--gutter) 1.2rem;
  }

  .lbx-list { flex-direction: row; flex-wrap: wrap; gap: 0.4rem; }
  .lbx-item { width: auto; border: 1px solid var(--line-soft); }
  .lbx-clear { width: auto; }
  .lbx-read { max-width: none; right: var(--gutter); }
}
</style>
