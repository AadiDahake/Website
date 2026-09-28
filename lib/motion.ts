/** House motion vocabulary. Reuse these; do not invent new values. */

export const EASE = {
  entrance: "out(3)",
  entranceSoft: "out(2)",
  pop: "out(4)",
  exit: "in(2)",
  mech: "inOut(2)",
  violent: "inOut(4)",
  linear: "linear",
} as const;

export const DUR = {
  pop: 180,
  entrance: 380,
  entranceLong: 750,
  exit: 240,
  mech: 700,
  camera: 1200,
} as const;

export function prefersReduced(): boolean {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep between edges a and b. */
export function smooth(x: number, a: number, b: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Seeded PRNG — same scatter every load, so every state is reproducible. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth's multiplier spreads small seeds. */
export const seedFrom = (i: number) => (i * 2654435761 + 97) >>> 0;

/**
 * The universal off-screen gating idiom: nothing animates when it cannot be seen.
 * Returns a cleanup that disconnects everything.
 */
export function gateToView(
  el: Element,
  onRun: (running: boolean) => void,
  threshold = 0.2,
): () => void {
  let inView = false;
  let running = false;

  const set = (on: boolean) => {
    if (on === running) return;
    running = on;
    onRun(on);
  };

  const io = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false;
    set(inView && !document.hidden);
  }, { threshold });
  io.observe(el);

  const onVis = () => set(inView && !document.hidden);
  document.addEventListener("visibilitychange", onVis);

  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    set(false);
  };
}

/**
 * Renderer resolution policy. Retina fullscreen at DPR 2 with MSAA is the
 * single biggest source of lag, so: cap DPR, and cap total pixels so huge
 * windows never exceed a fixed budget. Antialiasing is only worth paying
 * for at low DPR — additive line glow hides the jaggies anyway.
 */
export function rendererBudget(w: number, h: number) {
  let dpr = Math.min(devicePixelRatio || 1, w < 820 ? 1.15 : 1.35);
  const MAX_PIXELS = 3_000_000;
  if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
  return { dpr, antialias: (devicePixelRatio || 1) <= 1.1 };
}

/** Frame-delta clamp: no physics explosions after a tab sleeps. */
export function makeClock() {
  let last = 0;
  return (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000 || 0.016) : 0.016;
    last = now;
    return dt;
  };
}
