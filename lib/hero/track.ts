/**
 * A purpose-built scalar keyframe engine for the hero's 3D choreography.
 *
 * Why not anime.js here: the mission drives ~40 numeric tracks (camera,
 * gimbal, envelopes, dim groups) that are seeked every single frame. A
 * general timeline engine has to walk its child animations, resolve targets,
 * dispatch per-property setters and manage tween lifecycle on every seek —
 * work that scales with tween count and changes as tweens start and finish,
 * which is exactly what produced intermittent multi-millisecond spikes.
 *
 * This engine exploits what we know that a general one cannot assume:
 *   - every target is a plain object of numbers
 *   - every track is a sequence of NON-OVERLAPPING segments
 *   - the schedule is fixed at build time and never mutates
 *   - time advances monotonically almost always (replay is the exception)
 *
 * So the whole schedule compiles into flat typed arrays, and evaluation is a
 * cursor walk with an inlined ease — zero allocation, no megamorphic property
 * access, no lifecycle bookkeeping, and a cost that does not change with how
 * many segments happen to be active.
 *
 * Easing matches anime.js v4.5.0 exactly (verified against
 * node_modules/animejs/dist/modules/easings/eases/parser.js):
 *   in(p)    = t^p
 *   out(p)   = 1 - (1-t)^p
 *   inOut(p) = t < .5 ? (2t)^p / 2 : 1 - (2-2t)^p / 2
 * anime.js keeps DOM duty (captions), where it earns its cost.
 */

const EASE_LINEAR = 0;
const EASE_IN = 1;
const EASE_OUT = 2;
const EASE_IN_OUT = 3;

interface Parsed { type: number; power: number }

/** Parse an ease string once, at build time. */
function parseEase(spec: string | undefined, fallback: Parsed): Parsed {
  if (!spec) return fallback;
  if (spec === "linear") return { type: EASE_LINEAR, power: 1 };
  const m = /^(in|out|inOut)\(([\d.]+)\)$/.exec(spec);
  if (!m) return fallback;
  const type = m[1] === "in" ? EASE_IN : m[1] === "out" ? EASE_OUT : EASE_IN_OUT;
  return { type, power: parseFloat(m[2]) };
}

/**
 * Squaring is bit-identical to Math.pow(x, 2) and cheaper, so it is worth
 * special-casing. Higher powers are NOT expanded: Math.pow(x, 3) differs
 * from x*x*x in the last ulp for roughly a quarter of inputs, and matching
 * anime.js exactly matters more here than saving a few nanoseconds on ~40
 * calls per frame.
 */
function ipow(x: number, p: number): number {
  if (p === 2) return x * x;
  return Math.pow(x, p);
}

function applyEase(u: number, type: number, p: number): number {
  switch (type) {
    case EASE_LINEAR: return u;
    case EASE_IN: return ipow(u, p);
    case EASE_OUT: return 1 - ipow(1 - u, p);
    default: {
      // inOut
      if (u < 0.5) return ipow(u * 2, p) / 2;
      return 1 - ipow(2 - u * 2, p) / 2;
    }
  }
}

interface Seg { at: number; end: number; to: number; type: number; power: number }

class Track {
  readonly obj: Record<string, number>;
  readonly key: string;
  readonly base: number;
  n = 0;
  t0!: Float64Array;
  t1!: Float64Array;
  v0!: Float64Array;
  v1!: Float64Array;
  et!: Uint8Array;
  ep!: Float64Array;
  cursor = 0;
  private pending: Seg[] = [];

  constructor(obj: Record<string, number>, key: string) {
    this.obj = obj;
    this.key = key;
    this.base = obj[key];
  }

  push(seg: Seg) {
    this.pending.push(seg);
  }

  /**
   * Compile: sort segments and resolve each one's start value. Because
   * segments never overlap on a track, a segment's "from" is simply the
   * value the track holds when it begins — the previous segment's end, or
   * the initial value. That matches anime's runtime resolution for this
   * schedule while being fully deterministic under replay and seeking.
   */
  compile() {
    const segs = this.pending.sort((a, b) => a.at - b.at);
    const n = segs.length;
    this.n = n;
    this.t0 = new Float64Array(n);
    this.t1 = new Float64Array(n);
    this.v0 = new Float64Array(n);
    this.v1 = new Float64Array(n);
    this.et = new Uint8Array(n);
    this.ep = new Float64Array(n);
    let prev = this.base;
    for (let i = 0; i < n; i++) {
      const s = segs[i];
      this.t0[i] = s.at;
      this.t1[i] = s.end;
      this.v0[i] = prev;
      this.v1[i] = s.to;
      this.et[i] = s.type;
      this.ep[i] = s.power;
      prev = s.to;
    }
    this.pending.length = 0;
  }

  /** Evaluate at mission time t and write the result. No allocation. */
  eval(t: number) {
    const n = this.n;
    if (n === 0) return;
    if (t <= this.t0[0]) {
      this.cursor = 0;
      this.obj[this.key] = this.base;
      return;
    }
    let i = this.cursor;
    if (i >= n) i = n - 1;
    // rewind (replay / backward seek)
    while (i > 0 && t < this.t0[i]) i--;
    // advance past finished segments
    while (i < n - 1 && t >= this.t1[i] && t >= this.t0[i + 1]) i++;
    this.cursor = i;

    const a = this.t0[i];
    const b = this.t1[i];
    if (t >= b) { this.obj[this.key] = this.v1[i]; return; }   // held / gap
    if (t <= a) { this.obj[this.key] = this.v0[i]; return; }   // gap before
    const u = (t - a) / (b - a);
    const e = applyEase(u, this.et[i], this.ep[i]);
    const from = this.v0[i];
    this.obj[this.key] = from + (this.v1[i] - from) * e;
  }
}

export interface TrackTimelineOpts {
  defaults?: { ease?: string };
}

/**
 * Drop-in shape for the subset of the anime.js timeline API this scene used:
 *   tl.add(targetObject, { prop: value, duration, ease }, atMs)
 *   tl.seek(ms)
 */
export class TrackTimeline {
  private tracks: Track[] = [];
  private index = new Map<Record<string, number>, Map<string, Track>>();
  private def: Parsed;
  private compiled = false;

  constructor(opts: TrackTimelineOpts = {}) {
    this.def = parseEase(opts.defaults?.ease, { type: EASE_IN_OUT, power: 2 });
  }

  add(
    target: Record<string, number>,
    props: Record<string, number | string | undefined>,
    at = 0,
  ): this {
    const duration = (props.duration as number) ?? 0;
    const ease = parseEase(props.ease as string | undefined, this.def);
    let byKey = this.index.get(target);
    if (!byKey) {
      byKey = new Map();
      this.index.set(target, byKey);
    }
    for (const key in props) {
      if (key === "duration" || key === "ease") continue;
      const to = props[key];
      if (typeof to !== "number") continue;
      let track = byKey.get(key);
      if (!track) {
        track = new Track(target, key);
        byKey.set(key, track);
        this.tracks.push(track);
      }
      track.push({ at, end: at + duration, to, type: ease.type, power: ease.power });
    }
    return this;
  }

  private ensure() {
    if (this.compiled) return;
    for (let i = 0; i < this.tracks.length; i++) this.tracks[i].compile();
    this.compiled = true;
  }

  /** Evaluate every track at mission time t. Allocation-free. */
  seek(t: number) {
    this.ensure();
    const tr = this.tracks;
    for (let i = 0; i < tr.length; i++) tr[i].eval(t);
  }

  /** API parity with the timeline this replaced; nothing to stop. */
  pause() { /* stateless: the render loop owns the clock */ }

  get trackCount() {
    return this.tracks.length;
  }
}
