import { BufferGeometry, Color, Fog, Group, Matrix4, Mesh, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from "three";
// anime.js v4 bundle optimization: subpath modules per the docs, so only the
// timeline/animation/utils code we actually run ships in this chunk.
import { buildLadybug, BEAM_FAR, ARM_LINE, WINCH_DROP, GIMBAL_POS, WINCH_POS, PROP_R } from "./ladybug-drone";
import { loadLadybugSolid } from "./ladybug-solid";
import type { CadSolidModel } from "../cad";
import { fadeLevel } from "./pen";
import { TrackTimeline } from "./track";
import { buildField, TARGET, FIELD_Y, LIT } from "./field";
import { buildInvert } from "./invert";
import { NUM } from "../theme";
import { clamp, smooth, prefersReduced, makeClock, mulberry32 } from "../motion";

/**
 * THE SEARCH — a LIVE, autoplaying 10-second cinematic. No precompute: the
 * scene renders at native resolution with adaptive quality (resolution
 * steps down only if the machine can't hold frame rate, and back up when
 * it can). Plays once, parks on the found-target close-up, R replays.
 *
 * While parked (and before the gimbal choreography begins) the aircraft is
 * yours: props spin up under the cursor, the airframe leans toward it, and
 * the camera gimbal tracks it.
 *
 * Mission clock (ms):
 *      0- 1000  STANDBY    props spin up; gimbal follows the mouse
 *   1000- 2400  APPROACH   swing to a side-on view of one arm
 *   2400- 4700  AIRFRAME   track lengthwise along the carbon fibre arm
 *   4700- 5800  ORBIT      spin around and pull out
 *   5800- 6900  ACQUIRE    drop below, gimbal + spotlight wake
 *   6900- 8300  SCAN       the beam sweeps; what it touches goes off-white
 *   8300- 9900  TRACK      pan/tilt/zoom onto the find
 *   9900-10600  DELIVER    pull wide — the aircraft and the find in one shot
 *  10600-12900  FLYOVER    it flies itself over the find, banking into the
 *                          move, braking, and settling into a hover
 *  12900-15650  DROP       the winch pays out; the camera rides down with
 *                          the MEDKIT box; touchdown, release, CRASH out
 *  15650-16300  RETRACT    the line reels back in, semi-fast
 *  16300-18600  RTB        home, camera to the opening pose — the parked
 *                          pose is the DRONE
 */

/**
 * Mission length. Every keyframe below is written on the original 13s-act
 * grid and scaled by SPEED, so the whole sequence retimes from one number
 * without redistributing beats.
 */
const RAW_TOTAL = 18600;
const SPEED = 20000 / 13000;
const TOTAL = RAW_TOTAL * SPEED;
/** Scale a keyframe time from the authored grid onto the mission clock. */
const K = (ms: number) => ms * SPEED;

function aimAt(from: Vector3, to: Vector3) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const h = Math.hypot(dx, dz);
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(h, -dy) };
}

const GIMBAL_ORIGIN = new Vector3(GIMBAL_POS.x, GIMBAL_POS.y, GIMBAL_POS.z);
const AIM = aimAt(GIMBAL_ORIGIN, TARGET);

// Delivery hover point: puts the port winch spool directly over the drop
// zone beside the cone.
const FLY_X = TARGET.x + 0.25 - WINCH_POS.x;
const FLY_Z = TARGET.z + 0.12 - WINCH_POS.z;
const FLY_LEN = Math.hypot(FLY_X, FLY_Z) || 1;
const FLY_DX = FLY_X / FLY_LEN;
const FLY_DZ = FLY_Z / FLY_LEN;

// Featured arm: the 180-degree side arm; its tube line runs offset from
// centre (pinwheel geometry), so look-at targets carry that offset too.
const ARM_ANGLE = ARM_LINE.angle;
const ARM_DIR = new Vector3(Math.cos(ARM_ANGLE), 0, Math.sin(ARM_ANGLE));
const ARM_PERP = new Vector3(0, 0, -ARM_LINE.offset);
const ARM_AZ = Math.atan2(-ARM_DIR.x, -ARM_DIR.z);
const ARM_AZ_SIDE = ARM_AZ - Math.PI / 2;

const OPEN = { dist: 3.6, az: 0.72, el: 0.3 };

export interface HeroOpts {
  idleOnly?: boolean;
  hiQuality?: boolean;
}

/**
 * The aircraft mesh is a separate asset, so the hero starts by fetching it and
 * builds the scene once it lands. The poster stays up until then — the same
 * poster that already covers the first frames — so a slow connection sees the
 * still image rather than an empty canvas.
 */
export function initHero(host: HTMLElement, opts: HeroOpts = {}): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;
  loadLadybugSolid().then((cad) => {
    if (!cancelled) stop = startHero(host, opts, cad);
  }).catch(() => {
    host.classList.add("hero--static");
  });
  return () => {
    cancelled = true;
    stop?.();
  };
}

function startHero(host: HTMLElement, opts: HeroOpts, cadModel: CadSolidModel): () => void {
  const stage = host.querySelector<HTMLElement>("[data-stage]");
  const canvas = host.querySelector<HTMLCanvasElement>("canvas");
  const poster = host.querySelector<HTMLElement>("[data-poster]");
  if (!stage || !canvas) return () => {};
  const stageEl = stage;
  const canvasEl = canvas;

  if (prefersReduced()) {
    host.classList.add("hero--static");
    return () => {};
  }

  // Native resolution, no MSAA above 1.4x (DPR supersampling already smooths
  // the line work), opaque canvas (alpha:false skips a blend pass).
  // Hard ceiling: never push more than ~3.6M pixels regardless of DPR — a
  // full-screen Retina window at 2x is over 8M and nothing holds 60 there.
  const MAX_PIXELS = 6_500_000;
  const NATIVE_DPR = Math.min(devicePixelRatio || 1, 2);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: NATIVE_DPR < 1.4,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance",
    });
  } catch {
    host.classList.add("hero--static");
    return () => {};
  }
  // clear to the page ground, not #000 — the canvas has to disappear into
  // the sections that scroll over it
  renderer.setClearColor(NUM.bg, 1);
  // The aircraft is opaque and depth-tested, so it needs no sorting; every
  // other material is additive, and additive blending is commutative, so the
  // per-frame transparent depth sort buys nothing there either.
  renderer.sortObjects = false;
  renderer.info.autoReset = false;

  const scene = new Scene();
  scene.fog = new Fog(NUM.bg, 6, 15);
  const camera = new PerspectiveCamera(42, 1, 0.05, 60);

  const drone = buildLadybug(cadModel);
  const field = buildField();
  const sway = new Group();
  sway.add(drone.group);
  scene.add(sway);
  scene.add(field.group);
  // world-space landed box (takes over when the winch releases)
  scene.add(drone.winch.landed);
  // spotlight inversion quads: added LAST so they draw over everything
  const invert = buildInvert();
  scene.add(invert.group);
  const allMats = [...drone.mats, ...field.mats];

  // ---- scalars the timeline drives ----
  const cam = { dist: OPEN.dist, az: OPEN.az, el: OPEN.el, tx: 0, ty: 0, tz: 0 };
  const gim = { yaw: 0, pitch: 0.08 };
  const env = { drive: 0, beam: 0, field: 0, box: 0, title: 1, pan: 1, invert: 0, narrow: 0 };
  const fly = { x: 0, z: 0, tilt: 0 };
  const win = { drop: 0, landed: 0 };
  // Subsystem levels. These are now literally "how far from the page ground"
  // (the solid shader fades toward the ground, not toward black), so a level
  // near zero is a part that has DISAPPEARED rather than one that has gone
  // dark. The recede floors are set to keep the avionics stack and the legs
  // readable while still sitting behind the shell.
  const dims: Record<string, number> = {
    shell: 1, soft: 0.45, avionics: 0.4, accent: 0.55, props: 1, winch: 0,
  };
  const boot = { v: 0 };
  let landedSet = false;

  /**
   * Smoothed mirror of the camera scalars, plus a velocity per channel.
   * Seeded to the opening pose so the first frame is already correct.
   */
  const sm = {
    dist: OPEN.dist, az: OPEN.az, el: OPEN.el, tx: 0, ty: 0, tz: 0,
    vDist: 0, vAz: 0, vEl: 0, vTx: 0, vTy: 0, vTz: 0,
  };
  /** ~90ms to close most of the gap: kills steps, keeps the shape. */
  const SMOOTH_TIME = 0.09;

  /**
   * Critically damped follow (no overshoot, frame-rate independent). One
   * channel; the exp term is the standard closed-form damper approximation.
   */
  function damp1(cur: number, target: number, vel: number, dt2: number): number {
    const omega = 2 / SMOOTH_TIME;
    const x = omega * dt2;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = cur - target;
    const temp = (vel + omega * change) * dt2;
    dampVel = (vel - omega * temp) * exp;
    return target + (change + temp) * exp;
  }
  let dampVel = 0;

  function smoothDamp(st: typeof sm, target: typeof cam, dt2: number) {
    const d = Math.min(dt2, 0.05);
    st.dist = damp1(st.dist, target.dist, st.vDist, d); st.vDist = dampVel;
    st.az = damp1(st.az, target.az, st.vAz, d); st.vAz = dampVel;
    st.el = damp1(st.el, target.el, st.vEl, d); st.vEl = dampVel;
    st.tx = damp1(st.tx, target.tx, st.vTx, d); st.vTx = dampVel;
    st.ty = damp1(st.ty, target.ty, st.vTy, d); st.vTy = dampVel;
    st.tz = damp1(st.tz, target.tz, st.vTz, d); st.vTz = dampVel;
  }

  // purpose-built scalar engine (see lib/hero/track.ts) — anime.js keeps
  // the DOM captions, where its lifecycle machinery earns its cost
  const tl = new TrackTimeline({ defaults: { ease: "inOut(2)" } });

  tl.add(env, { drive: 1, duration: K(650), ease: "out(2)" }, K(120));
  // the headline holds through the approach and only clears once the camera
  // is settled on the arm — it used to be gone ~2s in, before it could be read
  tl.add(env, { title: 0, duration: K(650), ease: "linear" }, K(2450));

  // lateral pan keeps art opposite the captions
  tl.add(env, { pan: 0, duration: K(800), ease: "inOut(2)" }, K(1900));
  tl.add(env, { pan: 0.1, duration: K(600), ease: "inOut(2)" }, K(4700));
  tl.add(env, { pan: -0.55, duration: K(700), ease: "inOut(2)" }, K(5800));
  tl.add(env, { pan: -0.2, duration: K(600), ease: "inOut(2)" }, K(6900));
  tl.add(env, { pan: 0.5, duration: K(800), ease: "inOut(2)" }, K(8300));

  tl.add(dims, { soft: 1, accent: 1, duration: K(800), ease: "linear" }, K(1300));
  tl.add(dims, { avionics: 0.95, duration: K(700), ease: "linear" }, K(1700));
  tl.add(dims, { soft: 0.68, avionics: 0.62, accent: 0.72, duration: K(800), ease: "linear" }, K(4900));

  // APPROACH — swing to the side of the featured arm (the CAD arm-tube
  // plane sits at y~-0.03 on this airframe; the ride lives down there)
  tl.add(cam, { dist: 0.62, duration: K(1300) }, K(1000));
  tl.add(cam, { el: 0.14, az: ARM_AZ_SIDE, duration: K(1300) }, K(1000));
  tl.add(cam, { tx: ARM_DIR.x * 0.2 + ARM_PERP.x, ty: -0.02, tz: ARM_DIR.z * 0.2 + ARM_PERP.z, duration: K(1300) }, K(1000));

  // AIRFRAME — ride lengthwise along the tube to the motor
  tl.add(cam, {
    tx: ARM_DIR.x * 0.95 + ARM_PERP.x, tz: ARM_DIR.z * 0.95 + ARM_PERP.z, ty: 0.0,
    duration: K(2000), ease: "inOut(1.6)",
  }, K(2450));
  tl.add(cam, { dist: 0.56, duration: K(1000), ease: "inOut(1.6)" }, K(2450));
  tl.add(cam, { dist: 0.48, el: 0.12, ty: 0.08, duration: K(260), ease: "out(2)" }, K(4400));

  // ORBIT — spin around and pull out
  tl.add(cam, { az: ARM_AZ_SIDE + 2.7, duration: K(1100) }, K(4700));
  tl.add(cam, { dist: 3.05, duration: K(1100) }, K(4700));
  tl.add(cam, { tx: 0, ty: -0.02, tz: 0, duration: K(950) }, K(4700));
  tl.add(cam, { el: -0.06, duration: K(1100) }, K(4700));

  // ACQUIRE — below the horizon; gimbal, spotlight and field wake
  tl.add(cam, { el: -0.12, dist: 4.3, duration: K(1000) }, K(5800));
  tl.add(cam, { ty: -1.35, duration: K(1000) }, K(5800));
  tl.add(gim, { pitch: 0.3, yaw: -0.2, duration: K(750), ease: "out(2)" }, K(5900));
  tl.add(env, { beam: 1, duration: K(600), ease: "linear" }, K(6000));
  tl.add(env, { field: 1, duration: K(750), ease: "linear" }, K(5800));

  // SCAN — lawnmower sweep, settling onto the target
  tl.add(gim, { yaw: 0.55, duration: K(420), ease: "inOut(1.5)" }, K(6900));
  tl.add(gim, { pitch: 0.4, duration: K(110), ease: "linear" }, K(7330));
  tl.add(gim, { yaw: AIM.yaw, duration: K(440), ease: "inOut(1.5)" }, K(7440));
  tl.add(gim, { pitch: AIM.pitch, duration: K(230), ease: "out(2)" }, K(7900));
  tl.add(cam, { az: ARM_AZ_SIDE + 3.55, duration: K(1200) }, K(6900));
  tl.add(cam, { el: 0.06, ty: -1.85, dist: 3.9, duration: K(1200) }, K(6900));

  // TRACK — pan, tilt and zoom onto the find, with the beam's screen
  // footprint INVERTING the frame (the spotlight literally develops the
  // picture inside it).
  tl.add(cam, { tx: TARGET.x, ty: FIELD_Y + 0.28, tz: TARGET.z, duration: K(1300) }, K(8300));
  tl.add(cam, { dist: 1.35, duration: K(1300) }, K(8300));
  tl.add(cam, { el: 0.3, az: ARM_AZ_SIDE + 4.1, duration: K(1300) }, K(8300));
  tl.add(env, { box: 1, duration: K(240), ease: "out(3)" }, K(8260));
  tl.add(env, { beam: 0.45, duration: K(500), ease: "linear" }, K(8550));
  tl.add(env, { invert: 0.85, duration: K(140), ease: "out(2)" }, K(6950));
  tl.add(env, { invert: 0, duration: K(400), ease: "linear" }, K(9900));

  // DELIVER — pull wide: aircraft and find in one shot
  tl.add(env, { box: 0, duration: K(300), ease: "linear" }, K(10050));
  tl.add(cam, { dist: 5.0, duration: K(900), ease: "inOut(1.8)" }, K(9900));
  tl.add(cam, { el: 0.2, duration: K(1100) }, K(9900));
  tl.add(cam, { tx: 0.8, ty: -1.1, tz: -0.45, duration: K(1100) }, K(9900));
  tl.add(cam, { az: ARM_AZ_SIDE + 4.55, duration: K(2500), ease: "inOut(1.6)" }, K(9900));
  tl.add(env, { pan: 0.15, duration: K(800), ease: "inOut(2)" }, K(9900));
  tl.add(gim, { pitch: 0.1, yaw: 0, duration: K(800), ease: "inOut(2)" }, K(9950));

  // FLYOVER — it flies itself over the find, banking into the move
  tl.add(fly, { x: FLY_X, z: FLY_Z, duration: K(1900), ease: "inOut(1.7)" }, K(10600));
  tl.add(fly, { tilt: 0.34, duration: K(600), ease: "out(2)" }, K(10600));
  tl.add(fly, { tilt: -0.16, duration: K(700), ease: "inOut(2)" }, K(11800));
  tl.add(fly, { tilt: 0, duration: K(500), ease: "out(2)" }, K(12550));
  tl.add(cam, { dist: 4.4, duration: K(1600), ease: "inOut(1.7)" }, K(10900));
  tl.add(cam, { el: 0.18, duration: K(1500), ease: "inOut(1.7)" }, K(11000));
  tl.add(cam, { tx: FLY_X * 0.75, ty: -0.7, tz: FLY_Z * 0.75, duration: K(1500), ease: "inOut(1.7)" }, K(11000));

  // DROP — winch pays out; the camera rides down with the MEDKIT box
  tl.add(dims, { winch: 1, duration: K(400), ease: "linear" }, K(12450));
  tl.add(win, { drop: 1, duration: K(2100), ease: "inOut(1.6)" }, K(12900));
  tl.add(env, { beam: 0.55, duration: K(500), ease: "linear" }, K(12600));
  tl.add(env, { narrow: 1, duration: K(800), ease: "inOut(2)" }, K(12600));
  tl.add(env, { invert: 0.3, duration: K(140), ease: "out(2)" }, K(12700));
  tl.add(cam, { dist: 1.35, duration: K(700), ease: "inOut(1.8)" }, K(12900));
  tl.add(cam, { el: 0.06, duration: K(900), ease: "inOut(1.8)" }, K(12900));
  // frame the BOX, not the hub: the winch hangs off the port side
  tl.add(cam, { tx: FLY_X + WINCH_POS.x, tz: FLY_Z + WINCH_POS.z - 0.15, duration: K(900), ease: "inOut(1.8)" }, K(12900));
  // the camera target descends in LOCKSTEP with the winch (same window,
  // same ease as win.drop), so the box stays composed in frame all the way
  tl.add(cam, { ty: FIELD_Y + 0.42, duration: K(2100), ease: "inOut(1.6)" }, K(12900));
  tl.add(cam, { dist: 0.9, duration: K(1200), ease: "inOut(1.6)" }, K(13800));
  tl.add(cam, { az: ARM_AZ_SIDE + 4.85, duration: K(2200), ease: "inOut(1.6)" }, K(12900));

  // touchdown: release the box, then CRASH zoom out
  tl.add(win, { landed: 1, duration: K(30), ease: "linear" }, K(15050));
  tl.add(cam, { dist: 5.4, duration: K(480), ease: "out(3)" }, K(15250));
  tl.add(cam, { el: 0.22, duration: K(480), ease: "out(3)" }, K(15250));
  tl.add(cam, { tx: 0.8, ty: -1.4, tz: -0.4, duration: K(480), ease: "out(3)" }, K(15250));
  tl.add(cam, { az: ARM_AZ_SIDE + 5.05, duration: K(480), ease: "out(3)" }, K(15250));

  // RETRACT — the line reels back in, semi-fast
  tl.add(win, { drop: 0, duration: K(800), ease: "in(1.6)" }, K(15650));
  tl.add(env, { beam: 0, duration: K(600), ease: "linear" }, K(15500));
  tl.add(env, { invert: 0, duration: K(400), ease: "linear" }, K(15450));
  tl.add(env, { narrow: 0, duration: K(500), ease: "linear" }, K(15650));

  // RTB — home; camera winds to the opening pose. The parked pose is the
  // DRONE.
  tl.add(fly, { x: 0, z: 0, duration: K(1900), ease: "inOut(1.7)" }, K(16300));
  tl.add(fly, { tilt: -0.3, duration: K(600), ease: "out(2)" }, K(16300));
  tl.add(fly, { tilt: 0.12, duration: K(700), ease: "inOut(2)" }, K(17500));
  tl.add(fly, { tilt: 0, duration: K(350), ease: "out(2)" }, K(18250));
  tl.add(dims, { winch: 0, duration: K(700), ease: "linear" }, K(16600));
  tl.add(cam, {
    tx: 0, ty: 0, tz: 0,
    dist: OPEN.dist, el: OPEN.el, az: OPEN.az + Math.PI * 2,
    duration: K(2300), ease: "inOut(1.8)",
  }, K(16300));
  tl.add(gim, { yaw: 0, pitch: 0.12, duration: K(1100), ease: "inOut(2)" }, K(16600));
  tl.add(env, { field: 0, duration: K(1100), ease: "linear" }, K(16500));
  tl.add(env, { pan: 1, duration: K(1600), ease: "inOut(2)" }, K(16800));
  tl.add(env, { title: 1, duration: K(700), ease: "linear" }, K(18100));
  tl.add(dims, { soft: 0.55, avionics: 0.5, accent: 0.62, duration: K(900), ease: "linear" }, K(16800));

  // ---- captions ----
  interface Cap {
    el: HTMLElement;
    a: number;
    b: number;
    shown: boolean;
    words: HTMLElement[];
    rule: HTMLElement | null;
    flip: boolean;
  }
  const caps: Cap[] = Array.from(host.querySelectorAll<HTMLElement>("[data-w]")).map((el) => {
    // markup windows are authored on the 13s grid; scale onto the mission clock
    const [ra, rb] = (el.dataset.w || "0,0").split(",").map(Number);
    const a = K(ra);
    const b = K(rb);
    return { el, a, b, shown: false, flip: false, words: splitWords(el), rule: el.querySelector("[data-rule]") };
  });

  /**
   * Captions run on CSS keyframes, not a JS animation library.
   *
   * The old path fired ~10 simultaneous animations on word spans that had
   * just become visible; resolving their start values means reading computed
   * style, which forces synchronous layout at exactly the instant the text
   * appears. The jitter correlated with text popping up because the text
   * popping up was causing it.
   *
   * A class toggle hands the whole reveal to the compositor. The per-word
   * stagger is a CSS delay derived from an index set once at build time, so
   * showing a caption costs one class write and no per-frame main-thread
   * work at all.
   */
  function showCap(c: Cap) {
    // Rearm by ALTERNATING between two identical keyframe classes. The
    // obvious way to restart a CSS animation is to strip the class and read
    // offsetWidth to force a reflow — but that is a synchronous whole-
    // document layout fired at the exact instant the text appears, which is
    // precisely the stall. Two equivalent animations swapped turn-by-turn
    // restart cleanly with no layout at all.
    c.flip = !c.flip;
    c.el.classList.remove("cap--out", c.flip ? "cap--in-b" : "cap--in-a");
    c.el.classList.add(c.flip ? "cap--in-a" : "cap--in-b");
  }

  function hideCap(c: Cap) {
    c.el.classList.remove("cap--in-a", "cap--in-b");
    c.el.classList.add("cap--out");
  }

  const titleEl = host.querySelector<HTMLElement>("[data-title]");
  const hintEl = host.querySelector<HTMLElement>("[data-hint]");

  // ---- playback controls ----
  const pauseBtn = host.querySelector<HTMLButtonElement>("[data-hero-pause]");
  const replayBtn = host.querySelector<HTMLButtonElement>("[data-hero-replay]");
  let paused = false;

  const detEl = host.querySelector<HTMLElement>("[data-detect]");
  let detShown = false;
  let detFlip = false;
  const DETECT_AT = K(8250);
  const DETECT_END = K(10000);

  // ---- HUD ----
  const hudPhase = host.querySelector<HTMLElement>("[data-hud-phase]");
  const hudAlt = host.querySelector<HTMLElement>("[data-hud-alt]");
  const hudGim = host.querySelector<HTMLElement>("[data-hud-gimbal]");
  const PHASES: [number, string][] = [
    [0, "STANDBY"], [K(1000), "APPROACH"], [K(2400), "AIRFRAME"], [K(4700), "ORBIT"],
    [K(5800), "ACQUIRE"], [K(6900), "SCAN"], [K(8250), "TRACK"], [K(9900), "DELIVER"],
    [K(12900), "DROP"], [K(15650), "RTB"],
  ];
  let lastPhase = "";
  let lastAlt = -1;
  let lastGimY = 999;
  let lastGimP = 999;

  // ---- pointer state: attitude, prop hover, gimbal aim ----
  let mx = 0, my = 0;
  let ndcX = 0, ndcY = 0;
  let attYaw = 0, attPitch = 0, attRoll = 0;
  let aimYaw = 0, aimPitch = 0.08;
  let handover = 0;
  // The handler must do NO layout work. getBoundingClientRect() here forces
  // a synchronous reflow on every pointer event — with a high-polling mouse
  // that is hundreds of forced layouts per second, which shows up exactly as
  // "fine at rest, spikes while moving the mouse". Cache the rect instead
  // and refresh it only when geometry can actually change.
  let rectL = 0, rectT = 0, rectW = 1, rectH = 1;
  function readRect() {
    const r = stageEl.getBoundingClientRect();
    rectL = r.left;
    rectT = r.top;
    rectW = r.width || 1;
    rectH = r.height || 1;
  }
  readRect();
  const onPointer = (e: PointerEvent) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
    ndcX = ((e.clientX - rectL) / rectW) * 2 - 1;
    ndcY = -(((e.clientY - rectT) / rectH) * 2 - 1);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const onScrollResize = () => readRect();
  window.addEventListener("scroll", onScrollResize, { passive: true });
  window.addEventListener("resize", onScrollResize, { passive: true });

  // Analytic rotor picking. A raycast against four 28-triangle discs tests
  // 112 triangles and allocates a results array on every pointer move. Each
  // disc is a known circle on a known plane, so a ray-plane solve plus a
  // radius compare answers it exactly: four iterations, zero allocation.
  const rayOrigin = new Vector3();
  const rayDir = new Vector3();
  const discC = new Vector3();
  const discN = new Vector3();
  const hitP = new Vector3();
  const invM = new Matrix4();
  const PROP_R2 = PROP_R * PROP_R;   // real 22in props at pack scale

  function pickProp(): number {
    // build the pick ray from the pointer without Raycaster's bookkeeping
    rayOrigin.copy(camera.position);
    rayDir.set(ndcX, ndcY, 0.5).unproject(camera).sub(rayOrigin).normalize();
    let best = -1;
    let bestT = Infinity;
    for (let i = 0; i < drone.propDiscs.length; i++) {
      const m = drone.propDiscs[i];
      if (!m.visible) continue;
      m.updateWorldMatrix(true, false);
      discC.setFromMatrixPosition(m.matrixWorld);
      // disc normal: the mesh's local +Z (CircleGeometry) in world space
      discN.set(0, 0, 1).transformDirection(m.matrixWorld);
      const denom = rayDir.dot(discN);
      if (Math.abs(denom) < 1e-5) continue;
      const t = (discC.dot(discN) - rayOrigin.dot(discN)) / denom;
      if (t <= 0 || t >= bestT) continue;
      hitP.copy(rayDir).multiplyScalar(t).add(rayOrigin).sub(discC);
      if (hitP.lengthSq() <= PROP_R2) { bestT = t; best = i; }
    }
    return best;
  }

  const spinBoost = [1, 1, 1, 1];
  /**
   * Parked rotor speed. The mission flies at ~460 RPM; once it parks the
   * rotors wind down to a slow idle rather than freezing, because a stopped
   * prop reads as a broken aircraft and a blurred one reads as still flying.
   */
  const PARKED_RPM = 50;
  const PARKED_SPIN = (PARKED_RPM / 60) * Math.PI * 2;   // rad/s
  let spinRate = 2.2;
  let hoverIdx = -1;
  let lastRayX = 99;
  let lastRayY = 99;
  let lastDiscsOn = true;

  let dtAcc = 0;
  let dtN = 0;
  let dtMax = 0;
  let jsMax = 0;
  let gpuMax = 0;
  const dtRing = new Float32Array(60);

  let stageW = 1;
  let stageH = 1;
  function applySize() {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (!w || !h) return;
    stageW = w;
    stageH = h;
    readRect();
    const capDpr = Math.min(NATIVE_DPR, Math.sqrt(MAX_PIXELS / (w * h)));
    renderer.setPixelRatio(Math.max(1, capDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(applySize);
  ro.observe(stageEl);
  applySize();

  // ---- the mission clock ----
  const search = new URLSearchParams(location.search);
  let statsEl: HTMLElement | null = null;
  if (search.get("stats") !== null) {
    statsEl = document.createElement("div");
    statsEl.style.cssText = "position:fixed;bottom:8px;left:8px;z-index:99;font:11px monospace;color:#0eabcd;background:rgba(0,0,0,.7);padding:4px 8px;pointer-events:none";
    statsEl.textContent = "measuring...";
    document.body.appendChild(statsEl);
  }
  const pin = search.get("heroT");
  const pinned = pin !== null ? clamp(parseFloat(pin), 0, 1) : null;

  let missionT = pinned !== null ? pinned * TOTAL : (opts.idleOnly ? TOTAL : 0);
  let done = !!opts.idleOnly;
  let idle = !!opts.idleOnly;
  let frameNo = 0;
  let lastRender = 0;
  let tickNo = 0;
  let lastTick = 0;
  let dtEma = 0;
  /** display-cadence probe: fixed divisor beats threshold comparison */
  const CADENCE_SAMPLES = 24;
  const cadenceRing = new Float64Array(CADENCE_SAMPLES);
  let cadenceN = 0;
  let ticksPerRender = 1;
  let baseTicks = 1;
  let medianTick = 16.7;
  /** cadence stability governor: see the comment in frame() */
  let missCount = 0;
  let cadenceSamples2 = 0;
  let badWindows = 0;
  const bootAt = performance.now();
  let raf = 0;
  let running = false;
  let firstFrame = true;
  const clock = makeClock();
  const v3 = new Vector3();
  const right = new Vector3();
  const beamOrigin = new Vector3();
  const beamDir = new Vector3();
  const beamQuat = new Quaternion();
  const targetBase = new Color(NUM.fg);
  const targetLit = new Color(LIT);
  const shakeRnd = mulberry32(1337);
  let detFlipAt = -1;

  const CALLOUT_WINDOWS: Record<string, [number, number]> = {
    arm: [K(2600), K(4600)],
    motor: [K(3600), K(4700)],
    gimbal: [K(5950), K(6950)],
    target: [K(8260), K(9950)],
    drop: [K(13100), K(15500)],
  };
  // Precomputed once: Object.entries() in the frame loop allocated five
  // objects per frame, which is what drives GC spikes at 120fps.
  interface CalloutRec {
    el: HTMLElement;
    marker: Object3D;
    a: number;
    b: number;
    vis: boolean;
  }
  const calloutRecs: CalloutRec[] = [];
  for (const key of ["arm", "motor", "gimbal", "target", "drop"]) {
    const el = host.querySelector<HTMLElement>(`[data-callout='${key}']`);
    const marker = key === "target" ? field.marker : drone.markers[key];
    const win = CALLOUT_WINDOWS[key];
    if (el && marker && win) calloutRecs.push({ el, marker, a: win[0], b: win[1], vis: false });
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);

    // FRAME PACING, timestamp-independent.
    //
    // Rendering every other tick halves GPU load on a 120Hz panel while
    // keeping full resolution. The obvious implementation — compare
    // now - lastRender against a threshold — assumes precise timestamps,
    // and some browsers deliberately coarsen them: Brave's fingerprinting
    // protection quantizes performance.now()/rAF timestamps, so a threshold
    // comparison starts skipping ticks erratically and the animation
    // visibly stutters even though nothing is slow.
    //
    // Counting ticks instead is immune to that. The display cadence is
    // measured once from the median tick interval, then the divisor is
    // fixed: 2 on a 120Hz panel, 1 on 60Hz.
    tickNo++;
    if (cadenceN < CADENCE_SAMPLES) {
      if (lastTick > 0) {
        cadenceRing[cadenceN] = now - lastTick;
        cadenceN++;
        if (cadenceN === CADENCE_SAMPLES) {
          const sorted = cadenceRing.slice().sort();
          medianTick = sorted[CADENCE_SAMPLES >> 1];
          // 120Hz (~8.3ms) renders every 2nd tick; 60Hz every tick
          ticksPerRender = medianTick < 11 ? 2 : 1;
          baseTicks = ticksPerRender;
        }
      }
      lastTick = now;
      // measure every tick, but RENDER conservatively while probing: the
      // probe coincides with page hydration, and rendering all 24 probe
      // ticks at panel rate was the start-of-mission stutter
      if (tickNo % 2 !== 0) return;
    } else if (tickNo % ticksPerRender !== 0) {
      // Cadence stays CONSTANT across the mission-to-hover handover. Halving
      // it when the mission parked made the motion visibly coarsen at that
      // exact moment; the parked scene is cheap (about 20 draw calls), so
      // there is nothing to save by doing it.
      return;
    }
    const step = lastRender > 0 ? now - lastRender : medianTick * ticksPerRender;
    lastRender = now;

    // CADENCE STABILITY GOVERNOR.
    //
    // When the browser cannot deliver our target cadence — extensions,
    // shields and compositing all compete for the main thread, and none of
    // that is reachable from here — the result is an uneven frame rate,
    // which the eye reads as stutter far more readily than a lower but
    // EVEN one. So when frames are consistently arriving late, back off to
    // a longer, achievable cadence and hold it steady; recover only when
    // there is real headroom. Resolution is never touched.
    if (cadenceN >= CADENCE_SAMPLES && !idle) {
      const expected = medianTick * ticksPerRender;
      if (step > expected * 1.45) missCount++;
      cadenceSamples2++;
      if (cadenceSamples2 >= 90) {
        const missRate = missCount / cadenceSamples2;
        // Back off RELUCTANTLY and never past one step. js and gpu both
        // measure clean, so the misses come from the browser — and skipping
        // more frames cannot fix a browser stall, it only makes the motion
        // coarser. Two consecutive bad windows are required, the ceiling is
        // base + 1, and recovery is quick.
        if (missRate > 0.3 && ticksPerRender < baseTicks + 1) {
          if (++badWindows >= 2) { ticksPerRender++; badWindows = 0; }
        } else {
          badWindows = 0;
          if (missRate < 0.06 && ticksPerRender > baseTicks) ticksPerRender--;
        }
        missCount = 0;
        cadenceSamples2 = 0;
      }
    }

    frameNo++;

    // Smoothed delta. With coarsened or jittery timestamps the raw delta
    // alternates (e.g. 0ms, 17ms, 0ms, 17ms), which reads as judder even at
    // a perfect frame rate. An EMA tracks real time while removing that
    // alternation from the motion.
    const rawDt = clock(now);
    dtEma = dtEma > 0 ? dtEma * 0.82 + rawDt * 0.18 : rawDt;
    const dt = clamp(dtEma, 0.001, 0.05);

    // Quality NEVER drops (user directive): full resolution always; speed
    // comes from bundle and scene optimization. ?stats=1 reports frame time.
    if (statsEl) {
      dtAcc += dt;
      if (dt > dtMax) dtMax = dt;
      dtRing[dtN % dtRing.length] = dt;
      dtN++;
      if (dtN >= 60) {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const heap = mem ? ` · ${(mem.usedJSHeapSize / 1048576).toFixed(0)}MB` : "";
        // draw calls reported PER FRAME (info accumulates between resets)
        const perFrame = Math.round(renderer.info.render.calls / dtN);
        // "step" is the paced interval between rendered frames (60fps target,
        // 30 parked) — NOT a cost. "js" is this engine's actual per-frame
        // work. If js stays low while you see stutter, the time is going to
        // the browser/GPU, not to the animation.
        const fps = dtAcc > 0 ? dtN / dtAcc : 0;
        statsEl.textContent =
          `step ${((dtAcc / dtN) * 1000).toFixed(1)}ms (${fps.toFixed(0)}fps)`
          + ` · worst ${(dtMax * 1000).toFixed(1)}ms · js ${(jsMax * 1000).toFixed(1)}ms`
          + ` gpu ${(gpuMax * 1000).toFixed(1)}ms`
          + ` · ${renderer.getPixelRatio().toFixed(2)}x · ${perFrame} calls/f`
          + ` · 1/${ticksPerRender} tick${heap}`;
        renderer.info.reset();
        dtAcc = 0;
        dtN = 0;
        dtMax = 0;
        jsMax = 0;
        gpuMax = 0;
      }
    }
    const jsT0 = statsEl ? performance.now() : 0;

    // The mission clock is the ONLY thing pausing stops. The scene keeps
    // rendering, so the props keep turning and the gimbal keeps following the
    // cursor — a paused hero should look like an aircraft holding station,
    // not like a crashed tab.
    if (pinned === null && !done && !paused && frameNo > 8) {
      missionT += dt * 1000;
      if (missionT >= TOTAL) {
        missionT = TOTAL;
        done = true;
      }
    }
    tl.seek(missionT);
    const t = missionT;
    boot.v = idle ? 1 : Math.min(1, smooth(performance.now() - bootAt, 0, 420));

    // ---- motion smoothing layer ----
    // The schedule is authored as discrete segments, so a track can hold
    // still and then start moving under an ease like out(2) that begins at
    // maximum velocity. Measured, that produced instantaneous camera speed
    // changes up to 471% between consecutive frames — read as jitter even
    // at a locked frame rate. Every camera scalar is therefore followed by a
    // critically damped spring rather than used raw: it cannot overshoot,
    // it is frame-rate independent, and it turns those steps into continuous
    // motion while preserving the choreography's shape.
    if (pinned === null) {
      smoothDamp(sm, cam, dt);
    } else {
      sm.dist = cam.dist; sm.az = cam.az; sm.el = cam.el;
      sm.tx = cam.tx; sm.ty = cam.ty; sm.tz = cam.tz;
    }

    // ---- camera ----
    const drift = Math.sin(now / 5100) * 0.006;
    const az = sm.az + drift;
    const el = clamp(sm.el, -1.2, 1.2);
    camera.position.set(
      sm.tx + sm.dist * Math.cos(el) * Math.sin(az),
      sm.ty + sm.dist * Math.sin(el),
      sm.tz + sm.dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(sm.tx, sm.ty, sm.tz);

    if (Math.abs(env.pan) > 0.001 && window.innerWidth > 860) {
      const amt = -0.3 * env.pan * sm.dist;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(amt);
      camera.position.add(right);
      camera.lookAt(sm.tx + right.x, sm.ty + right.y, sm.tz + right.z);
    }

    if (detFlipAt > 0) {
      const since = (now - detFlipAt) / 1000;
      if (since < 0.5) {
        const k = (1 - since / 0.5) * 0.012;
        camera.position.x += (shakeRnd() - 0.5) * k;
        camera.position.y += (shakeRnd() - 0.5) * k;
      }
    }

    // ---- attitude toward the cursor ----
    const attScale = clamp((sm.dist - 0.5) / 1.6, 0.2, 1);
    attYaw += (mx * 0.3 * attScale - attYaw) * 0.045;
    attPitch += (my * 0.16 * attScale - attPitch) * 0.045;
    attRoll += (mx * -0.18 * attScale - attRoll) * 0.045;
    sway.rotation.y = attYaw;
    sway.rotation.z = Math.sin(now / 4700) * 0.007 + attRoll;
    sway.rotation.x = Math.sin(now / 6100) * 0.005 + attPitch;
    sway.position.y = Math.sin(now / 5400) * 0.012;

    // ---- delivery flight: translate + bank into the travel direction ----
    drone.group.position.x = fly.x;
    drone.group.position.z = fly.z;
    drone.group.rotation.z = -fly.tilt * FLY_DX;
    drone.group.rotation.x = fly.tilt * FLY_DZ;

    // ---- winch: cable pays out, the box rides its end ----
    const payout = win.drop * WINCH_DROP;
    drone.winch.cable.scale.y = Math.max(0.02, payout + 0.1);
    drone.winch.boxG.position.y = -0.155 - payout;
    if (landedSet) drone.winch.landed.visible = dims.winch > 0.005;
    if (win.landed > 0.5) {
      if (!landedSet) {
        landedSet = true;
        drone.winch.boxG.getWorldPosition(drone.winch.landed.position);
        drone.winch.landed.rotation.set(0, sway.rotation.y, 0);
        drone.winch.landed.visible = true;
      }
      drone.winch.boxG.visible = false;
    } else if (landedSet) {
      landedSet = false;
      drone.winch.landed.visible = false;
      drone.winch.boxG.visible = true;
    }

    // ---- prop hover: point at a rotor and it spins up ----
    if (Math.abs(ndcX - lastRayX) > 0.002 || Math.abs(ndcY - lastRayY) > 0.002) {
      lastRayX = ndcX;
      lastRayY = ndcY;
      hoverIdx = pickProp();
    }
    for (let i = 0; i < 4; i++) {
      const boostTarget = i === hoverIdx ? 4.2 : 1;
      spinBoost[i] += (boostTarget - spinBoost[i]) * 0.08;
    }

    // Eased, not switched: dropping 460 RPM to 50 in one frame looks like a
    // dropped frame. ~1.5s to wind down, which is about how long a 24-inch
    // disc takes to lose that much energy anyway.
    const spinTarget = idle ? PARKED_SPIN : 2.2 + env.drive * 46;
    spinRate += (spinTarget - spinRate) * Math.min(1, dt * 1.6);
    const baseSpin = dt * spinRate;
    for (let i = 0; i < drone.props.length; i++) {
      drone.props[i].rotation.y += (i % 2 === 0 ? baseSpin : -baseSpin) * spinBoost[i];
    }

    // ---- overdraw cull: the rotor discs are large additive quads. Close
    // in they can each cover the viewport (4x full-screen blend), which is
    // what makes tight camera beats expensive. They only read as rotor blur
    // from a distance, so hide them when the camera is inside that range.
    // A blur disc is only honest at flight RPM. Parked at 50 you can count the
    // blades, so the disc follows the speed and not just the camera distance.
    const discsOn = sm.dist > 1.15 && spinRate > 20;
    if (discsOn !== lastDiscsOn) {
      lastDiscsOn = discsOn;
      for (let i = 0; i < drone.propDiscs.length; i++) drone.propDiscs[i].visible = discsOn;
    }

    // ---- gimbal: choreographed during the mission, yours AFTER it ----
    if (idle) {
      const wantYaw = clamp(ndcX * 1.1, -1.4, 1.4);
      const wantPitch = clamp(0.35 - ndcY * 0.55, -0.1, 1.1);
      aimYaw += (wantYaw - aimYaw) * 0.07;
      aimPitch += (wantPitch - aimPitch) * 0.07;
      // Blend in over the first second of hover instead of switching
      // authority in one frame: handing the gimbal to the pointer instantly
      // snapped it whenever the cursor sat far from its parked angle.
      handover = Math.min(1, handover + dt * 1.1);
      const k = handover * handover * (3 - 2 * handover);
      gim.yaw = gim.yaw + (aimYaw - gim.yaw) * k;
      gim.pitch = gim.pitch + (aimPitch - gim.pitch) * k;
    } else {
      aimYaw = gim.yaw;
      aimPitch = gim.pitch;
      handover = 0;
    }
    drone.gimbalYaw.rotation.y = gim.yaw;
    drone.gimbalPitch.rotation.x = gim.pitch;
    const reach = (GIMBAL_ORIGIN.y - FIELD_Y) / Math.max(0.2, Math.cos(gim.pitch));
    // the spotlight TIGHTENS onto the drop zone while the winch runs
    const spread = 0.3 * (1 - 0.55 * env.narrow);
    const bs = reach / BEAM_FAR;
    drone.beam.scale.set(bs * (1 - 0.55 * env.narrow), bs, bs * (1 - 0.55 * env.narrow));
    field.boxGroup.quaternion.copy(camera.quaternion);

    // ---- spotlight ground stamp ----
    drone.beam.getWorldQuaternion(beamQuat);
    beamDir.set(0, -1, 0).applyQuaternion(beamQuat);
    drone.beam.getWorldPosition(beamOrigin);
    let litOnTarget = 0;
    if (beamDir.y < -0.1) {
      const k = (FIELD_Y - beamOrigin.y) / beamDir.y;
      const hx = beamOrigin.x + beamDir.x * k;
      const hz = beamOrigin.z + beamDir.z * k;
      field.litGroup.position.x = hx;
      field.litGroup.position.z = hz;
      const footR = reach * spread;
      field.litGroup.scale.setScalar(Math.max(0.2, footR));
      litOnTarget = clamp(1 - Math.hypot(hx - TARGET.x, hz - TARGET.z) / (footR + 0.35), 0, 1);
    }

    // ---- spotlight inversion: everything the cone covers flips ----
    invert.update(camera, beamOrigin, beamDir, reach, spread, env.invert * Math.min(1, env.beam * 2));

    // ---- opacity envelopes ----
    for (let i = 0; i < drone.mats.length; i++) {
      const fm = drone.mats[i];
      if (fm.tag === "beam") continue;
      const o = fadeLevel(fm, dims[fm.tag ?? "shell"] ?? 1, boot.v);
      fm.m.opacity = o;
      // a fill contributing under half a percent still costs a full
      // transparent blend pass over its screen area: skip it entirely
      const mesh = drone.fillMeshes.get(fm);
      if (mesh) mesh.visible = o > 0.005;
    }
    drone.beamMat.m.opacity = 0.5 * env.beam;
    drone.beamFillMat.m.opacity = 0.34 * env.beam;

    for (const fm of field.mats) {
      if (fm.tag === "lit") continue;
      const gate = fm.tag === "box" ? env.box
        : fm.tag === "target" ? Math.max(0.35, env.field)
          : env.field;
      fm.m.opacity = fm.base * gate;
    }
    // Inside the inverted wedge the additive glow flips to pale mush unless
    // the lit stamp carries the read: raise its ink while the invert is on,
    // so the wedge shows crisp dark line art on warm paper.
    const litGate = env.beam;
    field.litMats[0].m.opacity = (0.6 + 0.35 * env.invert) * litGate;
    field.litMats[1].m.opacity = (0.5 + 0.3 * env.invert) * litGate;
    field.litMats[2].m.opacity = 0.1 * litGate;
    const warmed = litOnTarget * litGate;
    if (field.targetMat.m.color) {
      field.targetMat.m.color.copy(targetBase).lerp(targetLit, warmed);
    }
    field.targetMat.m.opacity = (0.75 + 0.25 * warmed) * Math.max(0.35, env.field);
    field.group.visible = env.field > 0.01;

    if (titleEl) {
      // opacity only — visibility flips forced a full re-raster of the
      // headline at the exact moment the mission parks
      const o = env.title.toFixed(3);
      if (titleEl.style.opacity !== o) titleEl.style.opacity = o;
    }

    // ---- captions + detect ----
    for (const c of caps) {
      const want = t >= c.a && t < c.b;
      if (want !== c.shown) {
        c.shown = want;
        if (want) showCap(c);
        else hideCap(c);
      }
    }
    const wantDet = t >= DETECT_AT && t < DETECT_END;
    if (wantDet !== detShown) {
      detShown = wantDet;
      if (detEl) {
        if (wantDet) {
          detFlip = !detFlip;
          detEl.classList.remove("detect--out", detFlip ? "detect--in-b" : "detect--in-a");
          detEl.classList.add(detFlip ? "detect--in-a" : "detect--in-b");
          detFlipAt = now;
        } else {
          detEl.classList.remove("detect--in-a", "detect--in-b");
          detEl.classList.add("detect--out");
          detFlipAt = -1;
        }
      }
    }

    // ---- HUD ----
    if (hudPhase) {
      let ph = PHASES[0][1];
      for (const [at, name] of PHASES) if (t >= at) ph = name;
      if (ph !== lastPhase) { hudPhase.textContent = ph; lastPhase = ph; }
    }
    // compare integers first: building a template literal every frame is an
    // allocation, even when the text is unchanged
    if (hudAlt) {
      const agl = Math.max(0, Math.round(((camera.position.y - FIELD_Y) / -FIELD_Y) * 110));
      if (agl !== lastAlt) { hudAlt.textContent = `${agl} FT`; lastAlt = agl; }
    }
    if (hudGim) {
      const gy = Math.round(gim.yaw * 57.2958);
      const gp = Math.round(gim.pitch * 57.2958);
      if (gy !== lastGimY || gp !== lastGimP) {
        hudGim.textContent = `${gy}° / ${gp}°`;
        lastGimY = gy;
        lastGimP = gp;
      }
    }

    // ---- projected callouts ----
    for (let i = 0; i < calloutRecs.length; i++) {
      const rec = calloutRecs[i];
      const want = t >= rec.a && t < rec.b;
      if (!want) {
        if (rec.vis) { rec.el.style.opacity = "0"; rec.vis = false; }
        continue;
      }
      rec.marker.getWorldPosition(v3).project(camera);
      if (v3.z > 1) {
        if (rec.vis) { rec.el.style.opacity = "0"; rec.vis = false; }
        continue;
      }
      rec.el.style.transform = `translate3d(${((v3.x * 0.5 + 0.5) * stageW).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * stageH).toFixed(1)}px, 0)`;
      if (!rec.vis) { rec.el.style.opacity = "1"; rec.vis = true; }
    }

    if (statsEl) {
      const jsMs = (performance.now() - jsT0) / 1000;
      if (jsMs > jsMax) jsMax = jsMs;
    }

    // Time the GPU submit separately. If js and gpu are both tiny while the
    // step is long, the browser simply is not calling us back on cadence —
    // that time belongs to the browser (extensions, shields, compositor),
    // not to this scene, and no scene-side optimization can reclaim it.
    const gpuT0 = statsEl ? performance.now() : 0;
    renderer.render(scene, camera);
    if (statsEl) {
      const g = (performance.now() - gpuT0) / 1000;
      if (g > gpuMax) gpuMax = g;
    }

    if (firstFrame) {
      firstFrame = false;
      canvasEl.style.opacity = "1";
      if (poster && !opts.idleOnly) {
        // CSS transition rather than an animation instance: the hero engine
        // imports no animation library at all now
        poster.style.transition = "opacity 380ms linear";
        poster.style.opacity = "0";
        setTimeout(() => poster.remove(), 420);
      }
    }

    // Mission complete: drop to the light idle — parked on the find,
    // props spinning, gimbal and attitude following the cursor.
    if (done && pinned === null && !idle) {
      idle = true;
      if (hintEl) hintEl.textContent = "Mission complete · press R to replay";
      // Nothing left to pause once it has parked; Replay is the only useful
      // control from here.
      if (pauseBtn) pauseBtn.hidden = true;
    }
  }

  /**
   * GPU WARM-UP.
   *
   * three.js compiles a material's shader program and uploads its geometry
   * the first time that object is actually drawn. Several materials only
   * become visible partway in — the interior detail fades up as the camera
   * closes on the airframe — so those compiles landed mid-flight, right at
   * the first dive toward the propeller. That is a multi-millisecond stall
   * at a fixed point in the sequence, which is exactly how it read.
   *
   * Drawing one throwaway frame with everything visible pays all of it
   * before the mission starts.
   */
  function warmUp() {
    const hidden: Array<{ o: { visible: boolean }; v: boolean }> = [];
    scene.traverse((o) => {
      hidden.push({ o, v: o.visible });
      o.visible = true;
    });
    const restoreOpacity = allMats.map((fm) => fm.m.opacity);
    // a hair above zero: the driver must actually rasterize to compile
    for (const fm of allMats) fm.m.opacity = 0.002;
    try {
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
    } catch { /* warm-up is best effort */ }
    for (let i = 0; i < allMats.length; i++) allMats[i].m.opacity = restoreOpacity[i];
    for (const h of hidden) h.o.visible = h.v;
    renderer.info.reset();
  }
  warmUp();

  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  };

  const watched = document.querySelectorAll("[data-hero-watch]");
  const inView = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) inView.add(e.target);
      else inView.delete(e.target);
    }
    setRunning(inView.size > 0 && !document.hidden);
  }, { threshold: 0 });
  for (const el of watched) io.observe(el);
  const onVis = () => setRunning(inView.size > 0 && !document.hidden);
  document.addEventListener("visibilitychange", onVis);

  function restart() {
    missionT = 0;
    done = false;
    idle = false;
    paused = false;
    handover = 0;
    sm.dist = OPEN.dist; sm.az = OPEN.az; sm.el = OPEN.el;
    sm.tx = 0; sm.ty = 0; sm.tz = 0;
    sm.vDist = 0; sm.vAz = 0; sm.vEl = 0; sm.vTx = 0; sm.vTy = 0; sm.vTz = 0;
    if (hintEl) hintEl.textContent = "Mission in flight";
    if (pauseBtn) pauseBtn.hidden = false;
    syncPause();
    setRunning(!document.hidden);
  }

  function syncPause() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? "Play" : "Pause";
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    pauseBtn.setAttribute(
      "aria-label",
      paused ? "Resume the mission animation" : "Pause the mission animation",
    );
    if (hintEl && !done) {
      hintEl.textContent = paused ? "Mission held · press P to resume" : "Mission in flight";
    }
  }

  function togglePause() {
    if (done) return;
    paused = !paused;
    syncPause();
  }

  const onPauseClick = () => togglePause();
  const onReplayClick = () => restart();
  pauseBtn?.addEventListener("click", onPauseClick);
  replayBtn?.addEventListener("click", onReplayClick);
  // Only reveal the controls now that they are wired to a running engine —
  // the markup ships with them hidden so a static or reduced-motion hero
  // never shows a button that does nothing.
  if (!opts.idleOnly) host.classList.add("hero--playable");
  if (opts.idleOnly && pauseBtn) pauseBtn.hidden = true;

  const onKey = (e: KeyboardEvent) => {
    const isReplay = e.key === "r" || e.key === "R";
    const isPause = e.key === "p" || e.key === "P";
    if (!isReplay && !isPause) return;
    if (inView.size === 0) return;
    const tEl = e.target as HTMLElement | null;
    if (tEl && (tEl.tagName === "INPUT" || tEl.tagName === "TEXTAREA")) return;
    if (isPause) {
      togglePause();
      return;
    }
    restart();
  };
  window.addEventListener("keydown", onKey);
  setRunning(true);

  return () => {
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("keydown", onKey);
    pauseBtn?.removeEventListener("click", onPauseClick);
    replayBtn?.removeEventListener("click", onReplayClick);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScrollResize);
    window.removeEventListener("resize", onScrollResize);
    tl.pause();
    scene.traverse((o) => {
      const g = (o as unknown as { geometry?: BufferGeometry }).geometry;
      if (g) g.dispose();
    });
    for (const fm of allMats) fm.m.dispose();
    renderer.dispose();
    statsEl?.remove();
  };
}

/** Wrap text nodes in spans so words can stagger; accent spans survive. */
function splitWords(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const heading = root.querySelector<HTMLElement>("[data-split]");
  if (!heading) return out;
  if (!heading.getAttribute("aria-label")) {
    heading.setAttribute("aria-label", heading.textContent?.trim() || "");
  }
  const walk = (node: Node) => {
    for (const k of Array.from(node.childNodes)) {
      if (k.nodeType === Node.TEXT_NODE) {
        const parts = (k.textContent || "").split(/(\s+)/).filter((p) => p.length);
        if (!parts.length) continue;
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          const sp = document.createElement("span");
          sp.className = "cap-w";
          sp.textContent = p;
          sp.setAttribute("aria-hidden", "true");
          if (/^\s+$/.test(p)) sp.style.whiteSpace = "pre";
          else out.push(sp);
          frag.appendChild(sp);
        }
        node.replaceChild(frag, k);
      } else if (k.nodeType === Node.ELEMENT_NODE && (k as HTMLElement).tagName !== "BR") {
        walk(k);
      }
    }
  };
  walk(heading);
  return out;
}
