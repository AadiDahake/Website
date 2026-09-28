<template>
  <div ref="hostEl" class="hero-root">
    <!-- One self-contained section, structured like every other section on
         the site: media absolutely positioned INSIDE it, overlays above.
         No sibling full-viewport layer stack — that structure ghosted. -->
    <section data-stage data-hero-watch class="hero-view">
      <div class="hero-media" aria-hidden="true">
        <canvas class="hero-canvas" />
        <!-- glow paints OVER the opaque canvas: additive on black reads the
             same, and the opaque canvas (alpha:false) renders faster -->
        <div class="glow hero-glow" />
      </div>
      <!-- SSR poster: LCP element and the no-JS / reduced-motion / no-WebGL state -->
      <div data-poster class="hero-poster">
        <svg
          class="poster"
          viewBox="0 0 400 300"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
          role="img"
          aria-label="Line drawing of Ladybug, a custom quadcopter built by AmadorUAVs, seen from above"
        >
          <g stroke="#3c4152">
            <path pathLength="1" d="M200 118 L226 132 L226 168 L200 182 L174 168 L174 132 Z" />
            <path pathLength="1" d="M186 126 L214 126" />
            <path pathLength="1" d="M186 174 L214 174" />
          </g>
          <g stroke="#694fd4">
            <path pathLength="1" d="M218 128 L296 82" />
            <path pathLength="1" d="M182 128 L104 82" />
            <path pathLength="1" d="M218 172 L296 218" />
            <path pathLength="1" d="M182 172 L104 218" />
          </g>
          <g stroke="#0eabcd">
            <circle pathLength="1" cx="300" cy="80" r="42" />
            <circle pathLength="1" cx="100" cy="80" r="42" />
            <circle pathLength="1" cx="300" cy="220" r="42" />
            <circle pathLength="1" cx="100" cy="220" r="42" />
          </g>
          <g stroke="#ce2a7f">
            <path pathLength="1" d="M200 182 L200 196" />
            <circle pathLength="1" cx="200" cy="202" r="7" />
          </g>
        </svg>
      </div>

      <!-- projected callouts -->
      <div class="callouts" aria-hidden="true">
        <span data-callout="arm" class="callout"><i class="callout-dot" />CARBON FIBRE ARM</span>
        <span data-callout="motor" class="callout"><i class="callout-dot" />MOTOR</span>
        <span data-callout="gimbal" class="callout"><i class="callout-dot" />CAMERA</span>
        <span data-callout="target" class="callout callout-hot"><i class="callout-dot" />FOUND IT</span>
        <span data-callout="drop" class="callout callout-hot"><i class="callout-dot" />SUPPLY DROP</span>
      </div>

      <!-- diegetic HUD -->
      <div class="hud" aria-hidden="true">
        <div class="hud-row"><span class="hud-k">PHASE</span><span data-hud-phase class="hud-v">STANDBY</span></div>
        <div class="hud-row"><span class="hud-k">AGL</span><span data-hud-alt class="hud-v num">0 FT</span></div>
        <div class="hud-row"><span class="hud-k">GIMBAL</span><span data-hud-gimbal class="hud-v num">0° / 5°</span></div>
      </div>

      <!-- title: SSR markup, faded by a timeline scalar -->
      <div data-title class="hero-title">
        <p class="label">AmadorUAVs · Pleasanton, CA</p>
        <h1>We build our own <span class="grad-text">aircraft</span>.</h1>
        <p class="hero-sub">
          We compete at SUAS from Amador Valley High.
        </p>
        <p data-hint class="hero-hint label"><span class="hero-live" />Mission in flight</p>
      </div>

      <!-- captions cycle with the mission -->
      <!-- Caption windows are authored on the 13s grid and scaled onto the
           mission clock. Each one runs until shortly before the next one
           starts rather than ending with its camera beat: the beat is over
           long before the paragraph can be read, and the per-word stagger
           eats the first ~1s of every window. -->
      <figure data-w="2700,5900" class="cap cap-top">
        <p class="label label-hue" data-hue="violet">Airframe</p>
        <h2 data-split>Every part is ours.</h2>
        <i data-rule class="cap-rule" />
        <p>
          We built the carbon arms and the printed fittings. The flight code is ours too. Latch the arms on and the aircraft is ready.
        </p>
      </figure>

      <figure data-w="6100,8450" class="cap cap-right">
        <p class="label label-hue" data-hue="cyan">Search</p>
        <h2 data-split>Nobody on the sticks.</h2>
        <i data-rule class="cap-rule" />
        <p>
          It plans the route. The camera looks for targets.
        </p>
      </figure>

      <figure data-w="8700,12600" class="cap cap-left">
        <p class="label label-hue" data-hue="magenta">Found</p>
        <h2 data-split>It marks the spot.</h2>
        <i data-rule class="cap-rule" />
        <p>
          It holds to a centimetre. We built it in a classroom.
        </p>
      </figure>

      <figure data-w="12950,17600" class="cap cap-right">
        <p class="label label-hue" data-hue="cyan">Deliver</p>
        <h2 data-split>Then it drops the box.</h2>
        <i data-rule class="cap-rule" />
        <p>
          It hovers and winches the box down. Then it reels the line and flies home.
        </p>
      </figure>

      <!-- detection readout -->
      <div data-detect class="detect">
        <span class="detect-k label">FOUND</span>
        <span class="detect-v">A TRAINING CONE</span>
        <span class="detect-c label num">94%</span>
      </div>

      <!-- Playback controls. The mission narrates itself in four captions and
           it does not wait for anybody; holding it still is the only way to
           finish reading one. Rendered but hidden until the engine boots, so
           a no-JS or reduced-motion visitor is never offered a dead button. -->
      <div class="hero-ctl">
        <button
          data-hero-pause
          type="button"
          class="label hero-btn"
          aria-pressed="false"
          aria-label="Pause the mission animation"
        >
          Pause
        </button>
        <button
          data-hero-replay
          type="button"
          class="label hero-btn"
          aria-label="Replay the mission animation from the start"
        >
          Replay
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const hostEl = ref<HTMLElement | null>(null);

onMounted(() => {
  let cleanup: (() => void) | null = null;
  let cancelled = false;

  hostEl.value?.classList.add("hero--js");

  // Seed the styles the mission loop will manage BEFORE the heavy chunk
  // arrives: the loop's first guarded write is then a no-op, so booting the
  // 3D scene never repaints the title (which would re-register it as a new,
  // later LCP entry).
  const title = hostEl.value?.querySelector<HTMLElement>("[data-title]");
  if (title) {
    title.style.opacity = "1.000";
    title.style.visibility = "visible";
  }

  import("~/lib/hero").then(({ initHero }) => {
    if (!cancelled && hostEl.value) cleanup = initHero(hostEl.value);
  }).catch(() => {
    hostEl.value?.classList.add("hero--static");
  });

  onBeforeUnmount(() => {
    cancelled = true;
    cleanup?.();
  });
});
</script>

<style scoped>
.hero-media {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.hero-glow {
  opacity: 0.55;
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 300ms linear;
}

.hero--static .hero-canvas { display: none; }
.hero--static .hero-poster { opacity: 1 !important; }

/* controls appear only once the engine has actually taken them over */
.hero-ctl {
  position: absolute;
  right: var(--gutter);
  bottom: clamp(0.9rem, 3.5vh, 1.8rem);
  z-index: 3;
  display: none;
  gap: 0.5rem;
}

.hero--playable .hero-ctl { display: flex; }
.hero--static .hero-ctl { display: none !important; }

.hero-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--line);
  background: rgb(var(--bg-rgb) / 0.82);
  color: var(--fg-soft);
  min-width: 5rem;
  transition: border-color 160ms linear, color 160ms linear;
}

.hero-btn:hover { border-color: var(--g2); color: var(--fg); }
.hero-btn[hidden] { display: none; }

/* bake mode: the section becomes a fixed 1920x1080 media-only frame —
   the offline recorder screenshots .hero-view */
.hero--bare .hero-view {
  width: 1920px;
  height: 1080px;
  background: var(--bg);
}

.hero--bare .hero-view > :not(.hero-media) { display: none !important; }

.hero-view {
  position: relative;
  z-index: 1;
  height: 100svh;
  overflow: hidden;
  /* hard clip + own compositing group: overlays can never paint outside
     the hero viewport, whatever the compositor is doing with the video */
  contain: paint;
}

.hero-poster {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-soft);
  pointer-events: none;
}

.hero-poster svg {
  width: min(64vw, 480px);
  height: auto;
}

.hero-title {
  position: absolute;
  left: var(--gutter);
  bottom: clamp(2rem, 10vh, 6rem);
  /* never grow up into the nav/HUD band, whatever the zoom */
  top: calc(var(--nav-h) + 5.5rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  max-width: min(44ch, 80vw);
  pointer-events: none;
  /* one radial panel for contrast instead of stacked blurred text-shadows:
     unhiding a 44px-blur shadow block rasterized the whole headline at the
     exact mission->parked handover, which read as a lag spike */
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.9);
  will-change: opacity;
}

.hero-title::before {
  content: "";
  position: absolute;
  inset: 30% -14% -12% -18%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 30% 72%,
    rgb(var(--bg-rgb) / 0.9),
    rgb(var(--bg-rgb) / 0.55) 55%,
    transparent 80%
  );
}

.hero-title h1 {
  font-size: var(--size-huge);
  letter-spacing: -0.03em;
  line-height: 1.02;
  text-wrap: balance;
  margin: 0.5rem 0 1rem;
}

.hero-sub {
  max-width: 42ch;
  color: var(--fg-soft);
}

.hero-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 1.4rem 0 0;
  color: var(--dim);
}

.hero-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--g3);
}

.callouts {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.callout {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.55rem;
  white-space: nowrap;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-soft);
  background: rgb(var(--bg-rgb) / 0.72);
  border: 1px solid var(--line);
  opacity: 0;
  will-change: transform, opacity;
}

.callout-hot { color: var(--g1); border-color: var(--g1); }
.callout-dot { width: 4px; height: 4px; background: currentColor; }

.hud {
  position: absolute;
  top: calc(var(--nav-h) + 1.2rem);
  left: var(--gutter);
  border-left: 1px solid var(--line);
  padding-left: 0.8rem;
}

.hud-row {
  display: flex;
  gap: 0.8rem;
  align-items: baseline;
  line-height: 1.9;
}

.hud-k {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--dim);
  width: 4.5rem;
}

.hud-v {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--g3);
  font-variant-numeric: tabular-nums;
}

.cap {
  position: absolute;
  bottom: clamp(3rem, 14vh, 8rem);
  max-width: min(38ch, 76vw);
  margin: 0;
  padding: clamp(0.85rem, 1.5vw, 1.15rem) clamp(1rem, 2vw, 1.5rem);
  z-index: 2;
  /* Hidden from first paint: captions are mission narration that only the
     running loop may show. Without this, SSR paints every caption stacked
     over the title while the chunk loads — the "broken load" bug. */
}

.cap-left { left: var(--gutter); }
.cap-right { right: var(--gutter); text-align: right; }

/* the airframe beat: a 2D annotation sitting ON TOP of the lengthwise arm */
.cap-top {
  left: 50%;
  transform: translateX(-50%);
  top: calc(var(--nav-h) + clamp(2rem, 9vh, 5rem));
  bottom: auto;
  text-align: center;
  max-width: min(52ch, 86vw);
}

.cap-top .cap-rule {
  transform-origin: center;
  position: relative;
}

/* dimension-line end ticks */
.cap-top .cap-rule::before,
.cap-top .cap-rule::after {
  content: "";
  position: absolute;
  top: -4px;
  width: 1px;
  height: 9px;
  background: var(--g3);
}

.cap-top .cap-rule::before { left: 0; background: var(--g1); }
.cap-top .cap-rule::after { right: 0; }

.cap h2 {
  font-size: var(--size-head);
  margin: 0.4rem 0 0.8rem;
  text-wrap: balance;
}

.cap p:last-child { margin: 0; color: var(--fg); }

.cap-rule {
  display: block;
  height: 1px;
  background: var(--grad);
  margin: 0 0 0.9rem;
  transform-origin: left center;
}

.cap-right .cap-rule { transform-origin: right center; }

/* ---- caption reveal: pure CSS, compositor-driven ----
   No JS animation objects and no computed-style reads, so the text appearing
   costs the main thread nothing. --i is the word index, written once when
   the words are split. */
/* Captions are kept PAINTED and PROMOTED from load: opacity 0 rather than
   visibility hidden, with will-change on the animated properties. A hidden
   element has no layer and no rasterized glyphs, so revealing it forces
   layer creation plus a full text rasterization at that instant — the
   shudder. Paying it once up front costs nothing at reveal. */
.cap {
  opacity: 0;
  will-change: transform, opacity;
  contain: layout paint;
}

.cap :deep(.cap-w) {
  display: inline-block;
  opacity: 0;
  transform: translateY(26px);
  will-change: transform, opacity;
}

/* Two identical reveal animations, alternated, so a repeat restarts without
   the forced reflow that class-stripping requires. */
.cap--in-a,
.cap--in-b { animation: cap-in 300ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }

.cap--out { animation: cap-out 260ms cubic-bezier(0.55, 0, 0.68, 0.19) both; }

.cap--in-a :deep(.cap-w) {
  animation: word-in-a 560ms cubic-bezier(0.16, 0.84, 0.31, 1) both;
  animation-delay: calc(var(--i, 0) * 38ms);
}

.cap--in-b :deep(.cap-w) {
  animation: word-in-b 560ms cubic-bezier(0.16, 0.84, 0.31, 1) both;
  animation-delay: calc(var(--i, 0) * 38ms);
}

.cap--out :deep(.cap-w) {
  animation: none;
  opacity: 1;
  transform: none;
}

.cap--in-a :deep([data-rule]),
.cap--in-b :deep([data-rule]) {
  animation: rule-in 520ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes cap-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cap-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
}

@keyframes word-in-a {
  from { opacity: 0; transform: translateY(26px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes word-in-b {
  from { opacity: 0; transform: translateY(26px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes rule-in {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.detect {
  position: absolute;
  right: var(--gutter);
  top: calc(var(--nav-h) + 1.2rem);
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--g1);
  background: rgb(var(--bg-rgb) / 0.8);
  opacity: 0;
  z-index: 2;
}

.detect { opacity: 0; will-change: transform, opacity; }

.detect--in-a,
.detect--in-b { animation: detect-in 240ms cubic-bezier(0.16, 0.84, 0.31, 1) both; }

.detect--out { animation: detect-out 200ms linear both; }

@keyframes detect-in {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes detect-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.detect-v {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--fg);
}

.detect-c { color: var(--g1); }

/* The HUD and the headline share the left edge. On a short viewport the
   headline is the important one, so the HUD steps aside rather than
   overlapping — the collision seen at browser zoom. */
@media (max-height: 780px), (max-width: 1100px) {
  .hud { display: none; }
}

@media (max-width: 860px) {
  .cap-right { text-align: left; right: auto; left: var(--gutter); }
  .cap, .hero-title { max-width: calc(100vw - 2 * var(--gutter)); }
}
</style>
