import {
  BufferGeometry, Fog, LineSegments, Mesh, PerspectiveCamera,
  Scene, ShaderMaterial, Vector3, WebGLRenderTarget, WebGLRenderer,
} from "three";
import { buildLadybug, ARM_LINE } from "./hero/ladybug-drone";
import { loadLadybugSolid } from "./hero/ladybug-solid";
import { setSolidAlpha, makePickMat, type FadeMat } from "./hero/pen";
import type { CadSolidModel } from "./cad";
import { LADYBUG_PARTS } from "./ladybug-parts";
import { NUM } from "./theme";
import { clamp, rendererBudget } from "./motion";

/**
 * THE EXPLORER — Ladybug in full colour, and pickable.
 *
 * The same solid CAD the hero flies: Onshape geometry carrying the real part
 * colours and baked occlusion, under the flat illustration rig. Nothing moves
 * on its own. The reader orbits it, and clicking a part ghosts everything else
 * so that part can be seen alone — including the parts buried inside the
 * airframe, which is why the rest goes genuinely translucent rather than
 * merely dim. Dim would still hide the Pixhawk behind a plate.
 *
 * Two things worth knowing:
 *
 *  - Picking runs on the GPU, not by raycasting. The CAD ships int16 positions
 *    that are dequantized in the vertex shader, so the CPU-side position
 *    attribute holds quantized integers and every ray test would miss.
 *  - There is no animation loop at rest. Frames are rendered when the view
 *    changes or a selection is easing, and not otherwise.
 */

const A = ARM_LINE.angle;
const DIR = new Vector3(Math.cos(A), 0, Math.sin(A));
const AZ_OUT = Math.atan2(-DIR.x, -DIR.z);

/** The parked three-quarter pose: whole aircraft, arms readable, tilted down
 *  far enough that the belly hardware is not hidden. */
const HOME = { dist: 2.95, az: AZ_OUT - Math.PI / 2 + 0.9, el: 0.28 };
const TARGET = { x: 0, y: -0.05, z: 0 };

const EL_MIN = -0.5;
const EL_MAX = 1.05;

/** How much of a de-emphasized subsystem survives: low enough to see the
 *  isolated part through it, high enough that the aircraft still reads as a
 *  whole machine rather than as a floating component. */
const GHOST_SOLID = 0.13;
const GHOST_LINE = 0.1;
/** Selection ease, in milliseconds. */
const EASE_MS = 260;

export interface ExplorerOpts {
  /** fires whenever the isolated subsystem changes, null when cleared */
  onSelect?: (key: string | null) => void;
  /** fires when the subsystem under the cursor changes */
  onHover?: (key: string | null) => void;
  /** fires once the aircraft is on screen */
  onReady?: () => void;
}

export interface ExplorerHandle {
  /** select from outside the canvas — the part list drives this */
  select(key: string | null): void;
  dispose(): void;
}

export function initLadybugExplorer(host: HTMLElement, opts: ExplorerOpts = {}): ExplorerHandle {
  let inner: ExplorerHandle | null = null;
  let disposed = false;
  let queued: string | null | undefined;

  loadLadybugSolid()
    .then((cad) => {
      if (disposed) return;
      inner = start(host, opts, cad);
      // the reader can reach the part list before the mesh has landed
      if (queued !== undefined) inner.select(queued);
    })
    .catch(() => {
      if (!disposed) host.classList.add("lbx--static");
    });

  return {
    select(key) {
      if (inner) inner.select(key);
      else queued = key;
    },
    dispose() {
      disposed = true;
      inner?.dispose();
    },
  };
}

function start(host: HTMLElement, opts: ExplorerOpts, cad: CadSolidModel): ExplorerHandle {
  const stage = host.querySelector<HTMLElement>("[data-stage]");
  const canvas = host.querySelector<HTMLCanvasElement>("canvas");
  if (!stage || !canvas) return { select() {}, dispose() {} };
  const stageEl = stage;
  const canvasEl = canvas;
  const grabEl = host.querySelector<HTMLElement>("[data-orbit]");

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: rendererBudget(window.innerWidth, window.innerHeight).antialias,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance",
    });
  } catch {
    host.classList.add("lbx--static");
    return { select() {}, dispose() {} };
  }
  // Clear to the page ground. The solid shader fogs and fades toward the same
  // colour, so parts recede into the section rather than into a black hole.
  renderer.setClearColor(NUM.bg, 1);

  const scene = new Scene();
  scene.fog = new Fog(NUM.bg, 6, 15);
  const camera = new PerspectiveCamera(42, 1, 0.05, 60);

  const drone = buildLadybug(cad);
  scene.add(drone.group);

  for (const fm of drone.mats) fm.m.opacity = fm.tag === "beam" ? 0 : fm.base;
  // A prop blur disc is a lie on an aircraft that is not turning, and the
  // search beam belongs to the hero's mission, not to a parts drawing.
  for (const disc of drone.propDiscs) disc.visible = false;
  drone.beam.visible = false;
  // A parked aircraft carries its payload stowed, not swinging on a paid-out
  // line that runs off the bottom of the frame.
  drone.winch.cable.scale.y = 0.02;
  drone.winch.boxG.position.y = -0.155;
  drone.winch.landed.visible = false;

  // ---- subsystem index -----------------------------------------------------
  const KEYS = LADYBUG_PARTS.map(p => p.key);
  /** every material belonging to each pickable subsystem */
  const byPart = new Map<string, FadeMat[]>();
  for (const fm of drone.mats) {
    if (!fm.part || !KEYS.includes(fm.part)) continue;
    const arr = byPart.get(fm.part);
    if (arr) arr.push(fm);
    else byPart.set(fm.part, [fm]);
  }

  // ---- GPU picking ---------------------------------------------------------
  // One flat-colour material per solid material — each needs its own int16
  // dequantization — all carrying the id of the subsystem they belong to.
  const pickMats = new Map<Mesh, ShaderMaterial>();
  const realMats = new Map<Mesh, Mesh["material"]>();
  const meshPart = new Map<Mesh, string>();
  for (const [fm, meshes] of drone.solidMeshes ?? []) {
    const id = fm.part ? KEYS.indexOf(fm.part) + 1 : 0;
    if (id <= 0 || !fm.part) continue;
    const u = (fm.m as unknown as ShaderMaterial).uniforms;
    const pm = makePickMat(id, {
      qs: (u.uQS.value as Vector3).toArray(),
      qo: (u.uQO.value as Vector3).toArray(),
    });
    for (const mesh of meshes) {
      pickMats.set(mesh, pm);
      realMats.set(mesh, mesh.material);
      meshPart.set(mesh, fm.part);
    }
  }
  const pickRT = new WebGLRenderTarget(1, 1);
  const pixel = new Uint8Array(4);

  /**
   * Which subsystem is under this canvas-relative point.
   *
   * Ghosted parts are excluded from the pass while something is isolated. If
   * they were not, clicking the part you just isolated would return whatever
   * plate happens to sit in front of it — you would be clicking a thing you
   * cannot see. Excluding them makes "click anywhere else" mean "go back",
   * which is the behaviour the ghosting already implies.
   */
  function pickAt(cx: number, cy: number): string | null {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (!w || !h) return null;
    const dpr = renderer.getPixelRatio();

    const restore: Mesh[] = [];
    for (const [mesh, pm] of pickMats) {
      if (selected && meshPart.get(mesh) !== selected) {
        if (mesh.visible) {
          mesh.visible = false;
          restore.push(mesh);
        }
        continue;
      }
      mesh.material = pm;
    }
    // Lines and translucent fills are not pick targets, and left visible they
    // would paint their own id-less colour over whatever sits behind them.
    const hidden: LineSegments[] = [];
    scene.traverse((o) => {
      if ((o as LineSegments).isLineSegments && o.visible) {
        o.visible = false;
        hidden.push(o as LineSegments);
      }
    });

    // Render ONLY the pixel under the cursor: a 1x1 viewport onto the same
    // frustum. Exact, and it costs a rounding error of a frame.
    camera.setViewOffset(
      Math.round(w * dpr), Math.round(h * dpr),
      Math.round(cx * dpr), Math.round(cy * dpr), 1, 1,
    );
    renderer.setRenderTarget(pickRT);
    renderer.setClearColor(0x000000, 1);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(pickRT, 0, 0, 1, 1, pixel);
    renderer.setRenderTarget(null);
    renderer.setClearColor(NUM.bg, 1);
    camera.clearViewOffset();

    for (const o of hidden) o.visible = true;
    for (const mesh of restore) mesh.visible = true;
    for (const [mesh, mat] of realMats) mesh.material = mat;

    const id = pixel[0];
    return id > 0 && id <= KEYS.length ? KEYS[id - 1] : null;
  }

  // ---- selection, eased ----------------------------------------------------
  let selected: string | null = null;
  let hovered: string | null = null;
  /** per-part emphasis: 1 = full, 0 = ghosted */
  const level = new Map<string, number>(KEYS.map(k => [k, 1]));
  const from = new Map<string, number>(KEYS.map(k => [k, 1]));
  const to = new Map<string, number>(KEYS.map(k => [k, 1]));
  let easing = false;
  let easeStart = 0;

  function applyLevels() {
    for (const [key, mats] of byPart) {
      const v = level.get(key) ?? 1;
      for (const fm of mats) {
        if (fm.solid) setSolidAlpha(fm, GHOST_SOLID + (1 - GHOST_SOLID) * v);
        else fm.m.opacity = fm.base * (GHOST_LINE + (1 - GHOST_LINE) * v);
      }
    }
  }

  function setSelected(key: string | null) {
    const next = key && byPart.has(key) ? key : null;
    if (next === selected) return;
    selected = next;
    for (const k of KEYS) {
      from.set(k, level.get(k) ?? 1);
      to.set(k, next === null || k === next ? 1 : 0);
    }
    easeStart = performance.now();
    easing = true;
    invalidate();
    opts.onSelect?.(selected);
  }

  // ---- render on demand ----------------------------------------------------
  const cam = { ...HOME };
  let raf = 0;
  let first = true;

  function draw() {
    raf = 0;
    if (easing) {
      const t = clamp((performance.now() - easeStart) / EASE_MS, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      for (const k of KEYS) {
        const a = from.get(k) ?? 1;
        const b = to.get(k) ?? 1;
        level.set(k, a + (b - a) * e);
      }
      applyLevels();
      if (t >= 1) easing = false;
      else raf = requestAnimationFrame(draw);
    }

    camera.position.set(
      TARGET.x + cam.dist * Math.cos(cam.el) * Math.sin(cam.az),
      TARGET.y + cam.dist * Math.sin(cam.el),
      TARGET.z + cam.dist * Math.cos(cam.el) * Math.cos(cam.az),
    );
    camera.lookAt(TARGET.x, TARGET.y, TARGET.z);
    renderer.render(scene, camera);

    if (first) {
      first = false;
      canvasEl.style.opacity = "1";
      opts.onReady?.();
    }
  }

  function invalidate() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function orbit(dAz: number, dEl: number) {
    cam.az += dAz;
    cam.el = clamp(cam.el + dEl, EL_MIN, EL_MAX);
    invalidate();
  }

  function resize() {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(rendererBudget(w, h).dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);
  resize();

  // ---- pointer: a drag orbits, a tap selects -------------------------------
  let dragId: number | null = null;
  let lx = 0;
  let ly = 0;
  let travel = 0;
  let hoverAt = 0;

  const local = (e: PointerEvent) => {
    const r = canvasEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: PointerEvent) => {
    if (dragId !== null) return;
    dragId = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
    travel = 0;
    grabEl?.setPointerCapture(e.pointerId);
    host.classList.add("lbx--dragging");
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId === dragId) {
      const w = stageEl.clientWidth || 1;
      travel += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      orbit(((e.clientX - lx) / w) * -3.2, ((e.clientY - ly) / w) * 2.2);
      lx = e.clientX;
      ly = e.clientY;
      return;
    }
    // Hover picking costs a GPU sync, so it is rate-limited rather than run
    // per event — high-polling mice fire far faster than this matters.
    if (e.pointerType !== "mouse") return;
    const now = performance.now();
    if (now - hoverAt < 90) return;
    hoverAt = now;
    const p = local(e);
    const key = pickAt(p.x, p.y);
    if (key === hovered) return;
    hovered = key;
    host.classList.toggle("lbx--over", key !== null);
    opts.onHover?.(key);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    grabEl?.releasePointerCapture?.(e.pointerId);
    host.classList.remove("lbx--dragging");
    // a drag is an orbit, a tap is a selection — 5px of slop between them
    if (travel > 5) return;
    const p = local(e);
    setSelected(pickAt(p.x, p.y));
  };

  const onLeave = () => {
    if (hovered === null) return;
    hovered = null;
    host.classList.remove("lbx--over");
    opts.onHover?.(null);
  };

  // ---- keyboard: orbit, and Escape drops the isolation ---------------------
  const STEP = 0.22;
  const onKey = (e: KeyboardEvent) => {
    switch (e.key) {
    case "ArrowLeft": orbit(STEP, 0); break;
    case "ArrowRight": orbit(-STEP, 0); break;
    case "ArrowUp": orbit(0, STEP * 0.6); break;
    case "ArrowDown": orbit(0, -STEP * 0.6); break;
    case "Escape": setSelected(null); break;
    case "r": case "R": case "Home":
      cam.az = HOME.az;
      cam.el = HOME.el;
      invalidate();
      break;
    default: return;
    }
    e.preventDefault();
  };

  if (grabEl) {
    grabEl.addEventListener("pointerdown", onDown);
    grabEl.addEventListener("pointermove", onMove);
    grabEl.addEventListener("pointerup", onUp);
    grabEl.addEventListener("pointercancel", onUp);
    grabEl.addEventListener("pointerleave", onLeave);
    grabEl.addEventListener("keydown", onKey);
  }

  return {
    select: setSelected,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      if (grabEl) {
        grabEl.removeEventListener("pointerdown", onDown);
        grabEl.removeEventListener("pointermove", onMove);
        grabEl.removeEventListener("pointerup", onUp);
        grabEl.removeEventListener("pointercancel", onUp);
        grabEl.removeEventListener("pointerleave", onLeave);
        grabEl.removeEventListener("keydown", onKey);
      }
      pickRT.dispose();
      for (const pm of new Set(pickMats.values())) pm.dispose();
      scene.traverse((o) => {
        const g = (o as unknown as { geometry?: BufferGeometry }).geometry;
        if (g) g.dispose();
      });
      for (const fm of drone.mats) fm.m.dispose();
      renderer.dispose();
    },
  };
}
