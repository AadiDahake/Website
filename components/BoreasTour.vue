<template>
  <div ref="hostEl" class="tour" aria-label="Animated walkaround of Boreas: coaxial motors, arms, flight controller, batteries, camera" role="img">
    <div data-stage class="tour-stage">
      <div class="glow tour-glow" aria-hidden="true" />
      <canvas class="tour-canvas" aria-hidden="true" />

      <!-- static poster for no-JS / reduced motion / no-WebGL -->
      <div class="tour-poster" aria-hidden="true">
        <svg class="poster" viewBox="0 0 400 200" fill="none" stroke-width="1.1">
          <g stroke="#3c4152">
            <path pathLength="1" d="M200 82 L224 94 L224 118 L200 130 L176 118 L176 94 Z" />
          </g>
          <g stroke="#694fd4">
            <path pathLength="1" d="M216 90 L304 54 M184 90 L96 54 M216 120 L304 156 M184 120 L96 156" />
          </g>
          <g stroke="#0eabcd">
            <circle pathLength="1" cx="308" cy="52" r="22" />
            <circle pathLength="1" cx="92" cy="52" r="22" />
            <circle pathLength="1" cx="308" cy="158" r="22" />
            <circle pathLength="1" cx="92" cy="158" r="22" />
            <circle pathLength="1" cx="308" cy="52" r="13" />
            <circle pathLength="1" cx="92" cy="52" r="13" />
            <circle pathLength="1" cx="308" cy="158" r="13" />
            <circle pathLength="1" cx="92" cy="158" r="13" />
          </g>
        </svg>
      </div>

      <!-- tour chips: one per stop, windows in ms on the tour clock -->
      <p data-tour-hint class="label tour-hint">Walkaround · arrows step between systems</p>
      <div class="tour-chips" aria-hidden="true">
        <p data-chip="1500,4000" class="tour-chip">
          <span class="label label-hue" data-hue="cyan">01 · Propulsion</span>
          <span class="tour-chip-t">Eight motors, stacked in pairs</span>
          <span class="tour-chip-d">Coaxial pairs on each arm. Lose a motor and the partner keeps that corner flying.</span>
        </p>
        <p data-chip="4000,6800" class="tour-chip">
          <span class="label label-hue" data-hue="violet">02 · Airframe</span>
          <span class="tour-chip-t">Four arms, eight rotors</span>
          <span class="tour-chip-d">The frame is carbon fibre with big props on a compact layout.</span>
        </p>
        <p data-chip="6800,9300" class="tour-chip">
          <span class="label label-hue" data-hue="magenta">03 · The Board</span>
          <span class="tour-chip-t">Pixhawk 5X flight controller</span>
          <span class="tour-chip-d">It plans the route and holds to a few centimetres.</span>
        </p>
        <p data-chip="9300,11800" class="tour-chip">
          <span class="label label-hue" data-hue="cyan">04 · Power</span>
          <span class="tour-chip-t">Dual battery packs</span>
          <span class="tour-chip-d">35 minutes in the air, 11 kg fully loaded</span>
        </p>
        <p data-chip="11800,14100" class="tour-chip">
          <span class="label label-hue" data-hue="violet">05 · Camera</span>
          <span class="tour-chip-t">20 MP self-steadying camera</span>
          <span class="tour-chip-d">It stays nadir when the airframe tilts. Detection runs onboard.</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const hostEl = ref<HTMLElement | null>(null);

onMounted(() => {
  let cleanup: (() => void) | null = null;
  let cancelled = false;

  hostEl.value?.classList.add("tour--js");

  import("~/lib/boreastour").then(({ initBoreasTour }) => {
    if (!cancelled && hostEl.value) cleanup = initBoreasTour(hostEl.value);
  }).catch(() => {
    hostEl.value?.classList.add("tour--static");
  });

  onBeforeUnmount(() => {
    cancelled = true;
    cleanup?.();
  });
});
</script>

<style scoped>
.tour {
  position: relative;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}

.tour-stage {
  position: relative;
  height: min(78svh, 720px);
  overflow: hidden;
}

.tour-glow { opacity: 0.55; }

.tour-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 300ms linear;
}

.tour--static .tour-canvas { display: none; }

.tour-poster {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-soft);
}

.tour--js:not(.tour--static) .tour-poster { display: none; }

.tour-poster svg { width: min(70%, 460px); height: auto; }

.tour-hint {
  position: absolute;
  top: 1.2rem;
  right: var(--gutter);
  margin: 0;
  color: var(--dim);
}

.tour-chips {
  position: absolute;
  left: var(--gutter);
  bottom: 1.6rem;
  right: var(--gutter);
  pointer-events: none;
}

.tour-chip {
  position: absolute;
  left: 0;
  bottom: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: min(44ch, 80vw);
  padding: 0.8rem 1rem;
  background: rgb(var(--bg-rgb) / 0.78);
  border: 1px solid var(--line);
  border-left: 2px solid var(--hue, var(--g3));
  opacity: 0;
  visibility: hidden;
}

.tour-chip .label { letter-spacing: 0.14em; }

.tour-chip-t {
  color: var(--fg);
  font-weight: 600;
  font-size: 1.05rem;
}

.tour-chip-d {
  color: var(--fg-soft);
  font-size: 0.88rem;
}
</style>
