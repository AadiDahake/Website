<template>
  <div ref="hostEl" class="tour" aria-label="Animated component tour of Zephyrus: motors, arm, GNSS, Pixhawk 6X, Jetson, payload, SIYI A8 mini gimbal" role="img">
    <div data-stage class="tour-stage">
      <div class="glow tour-glow" aria-hidden="true" />
      <canvas class="tour-canvas" aria-hidden="true" />

      <!-- static poster for no-JS / reduced motion / no-WebGL -->
      <div class="tour-poster" aria-hidden="true">
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

      <!-- tour chips: one per stop, windows in ms on the tour clock -->
      <p data-tour-hint class="label tour-hint">Walkaround · arrows step between systems</p>
      <div class="tour-chips" aria-hidden="true">
        <p data-chip="1500,4300" class="tour-chip">
          <span class="label label-hue" data-hue="cyan">01 · Propulsion</span>
          <span class="tour-chip-t">T-Motor MN 601-S, 320 KV</span>
          <span class="tour-chip-d">The motors run FOC through Zubax Myxa A0s. Each one is tuned on its own.</span>
        </p>
        <p data-chip="4300,7000" class="tour-chip">
          <span class="label label-hue" data-hue="violet">02 · Airframe</span>
          <span class="tour-chip-t">22 in carbon fibre arms</span>
          <span class="tour-chip-d">The plugs are epoxied and the clamps latch. Phase leads run in the tube.</span>
        </p>
        <p data-chip="7000,9500" class="tour-chip">
          <span class="label label-hue" data-hue="cyan">03 · Navigation</span>
          <span class="tour-chip-t">H-RTK F9P GNSS</span>
          <span class="tour-chip-d">A helical antenna sits under the radome.</span>
        </p>
        <p data-chip="9500,12000" class="tour-chip">
          <span class="label label-hue" data-hue="magenta">04 · Flight Controller</span>
          <span class="tour-chip-t">Pixhawk 6X</span>
          <span class="tour-chip-d">PX4 runs on triple-redundant IMUs and flies the whole mission.</span>
        </p>
        <p data-chip="12000,14400" class="tour-chip">
          <span class="label label-hue" data-hue="cyan">05 · Compute</span>
          <span class="tour-chip-t">Jetson Orin NX</span>
          <span class="tour-chip-d">YOLOWorld runs at about 20 FPS. DBSCAN localizes. Then it takes offboard.</span>
        </p>
        <p data-chip="14400,16700" class="tour-chip">
          <span class="label label-hue" data-hue="magenta">06 · Payload</span>
          <span class="tour-chip-t">MG90 spool drop</span>
          <span class="tour-chip-d">Directional winding brakes the payload in freefall.</span>
        </p>
        <p data-chip="16700,18700" class="tour-chip">
          <span class="label label-hue" data-hue="violet">07 · Camera</span>
          <span class="tour-chip-t">SIYI A8 mini gimbal</span>
          <span class="tour-chip-d">It is a 4K zoom camera on a three-axis mount under the nose.</span>
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

  import("~/lib/zephtour").then(({ initZephTour }) => {
    if (!cancelled && hostEl.value) cleanup = initZephTour(hostEl.value);
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
  gap: 0.35rem;
  max-width: min(52ch, 86vw);
  padding: 1.1rem 1.4rem;
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
  font-size: 1.3rem;
}

.tour-chip-d {
  color: var(--fg-soft);
  font-size: 1rem;
}
</style>
