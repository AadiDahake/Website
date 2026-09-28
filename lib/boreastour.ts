import { BoxGeometry, BufferGeometry, CylinderGeometry, Fog, Group, LineSegments, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { animate } from "animejs/animation";
import { createTimeline } from "animejs/timeline";
import { remove } from "animejs/utils";
import { decodeBoreas } from "./boreas-model";
import { cadLineGeo } from "./cad";
import { Pen, makeMat, makeCadMat, makeFresnelMat, type FadeMat } from "./hero/pen";
import { NUM } from "./theme";
import { clamp, smooth, prefersReduced, makeClock, rendererBudget } from "./motion";

/**
 * BOREAS WALKAROUND — the 2022 competition airframe, drawn from its real
 * CAD assembly (Boreas Cleaned up.glb through the same extraction pipeline
 * as the hero). A coaxial X8: eight motors stacked in pairs on four arms,
 * both prop planes spinning opposite ways. Autoplaying inspection with
 * stops at the coax pairs, the arms, the Pixhawk 5X, the packs and the
 * camera gimbal, ending in a crash-zoom back to the whole aircraft.
 * R replays; arrow keys step between stops.
 */

const TOTAL = 15600;

// featured arm: the coax pair at station 0 (scene x 0.99, z -0.17)
const A0 = Math.atan2(-0.17, 0.99);
const DIR = new Vector3(Math.cos(A0), 0, Math.sin(A0));
const AZ_OUT = Math.atan2(-DIR.x, -DIR.z);
const AZ_SIDE = AZ_OUT - Math.PI / 2;

interface Stop {
  key: string;
  at: number;
  dur: number;
  cam: { dist: number; az: number; el: number; tx: number; ty: number; tz: number };
}

const STOPS: Stop[] = [
  {
    key: "motor",
    at: 1500,
    dur: 1800,
    cam: { dist: 0.55, az: AZ_SIDE + 0.45, el: 0.12, tx: DIR.x * 0.95, ty: 0.13, tz: DIR.z * 0.95 },
  },
  {
    key: "arm",
    at: 4000,
    dur: 2000,
    cam: { dist: 0.62, az: AZ_SIDE, el: 0.14, tx: DIR.x * 0.45, ty: 0.1, tz: DIR.z * 0.45 },
  },
  {
    key: "board",
    at: 6800,
    dur: 1900,
    cam: { dist: 0.42, az: AZ_SIDE + 1.6, el: 0.4, tx: 0, ty: 0.11, tz: 0.01 },
  },
  {
    key: "power",
    at: 9300,
    dur: 1800,
    cam: { dist: 0.52, az: AZ_SIDE + 2.4, el: 0.42, tx: 0.05, ty: 0.22, tz: 0 },
  },
  {
    key: "camera",
    at: 11800,
    dur: 1800,
    cam: { dist: 0.5, az: AZ_SIDE + 3.2, el: -0.12, tx: 0, ty: -0.1, tz: 0.12 },
  },
];

const CRASH_AT = 14100;

interface Boreas {
  group: Group;
  props: Group[];
  propDirs: number[];
  mats: FadeMat[];
}

function buildBoreas(): Boreas {
  const group = new Group();
  const mats: FadeMat[] = [];
  const cad = decodeBoreas();

  const cadShell = makeCadMat(0.6, "shell");
  const cadMotor = makeCadMat(0.9, "motor");
  const cadPix = makeCadMat(0.9, "avionics");
  const cadProp = makeCadMat(0.85, "props");
  mats.push(cadShell, cadMotor, cadPix, cadProp);

  group.add(new LineSegments(cadLineGeo(cad.groups.frame, NUM.fg, 0.34, NUM.g1, NUM.g3), cadShell.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.motor, NUM.g3), cadMotor.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.pixhawk, NUM.g1), cadPix.m));

  // both coax prop planes, spinning opposite ways
  const props: Group[] = [];
  const propDirs: number[] = [];
  const geoCW = cadLineGeo(cad.groups.propcw, NUM.g2);
  const geoCCW = cadLineGeo(cad.groups.propccw, NUM.g2);
  for (const [cat, geo, dir] of [["propcw", geoCW, 1], ["propccw", geoCCW, -1]] as const) {
    for (const inst of cad.instances[cat] || []) {
      const holder = new Group();
      holder.matrixAutoUpdate = false;
      holder.matrix.fromArray(inst.m);
      const spinner = new Group();
      spinner.add(new LineSegments(geo, cadProp.m));
      holder.add(spinner);
      group.add(holder);
      props.push(spinner);
      propDirs.push(dir);
    }
  }

  // soft detail: prop tip paths at both coax planes
  const S = new Pen();
  const soft = makeMat(NUM.fgSoft, 0.3, "soft");
  mats.push(soft);
  const STATIONS: Array<[number, number]> = [[0.99, -0.17], [-0.17, -0.99], [-0.99, 0.17], [0.17, 0.99]];
  for (const [sx, sz] of STATIONS) {
    S.circle(sx, 0.055, sz, 0.36, "xz", 32);
    S.circle(sx, 0.215, sz, 0.36, "xz", 32);
  }

  // The arm tubes and motor cans are smooth cylinders in the CAD — no
  // crease edges survive extraction — so the structure that CONNECTS the
  // hub to the motor stations is drawn here, matched to the real geometry.
  const T = new Pen();
  const arms = makeMat(NUM.fg, 0.55, "shell");
  mats.push(arms);
  for (const [sx, sz] of STATIONS) {
    const L = Math.hypot(sx, sz);
    const ux = sx / L;
    const uz = sz / L;
    const px = -uz * 0.022;
    const pz = ux * 0.022;
    // twin-edge arm tube from the hub clamp to the motor mount
    for (const sgn of [1, -1]) {
      T.seg([ux * 0.24 + px * sgn, 0.125, uz * 0.24 + pz * sgn], [ux * 0.97 + px * sgn, 0.125, uz * 0.97 + pz * sgn]);
    }
    T.circle(ux * 0.26, 0.125, uz * 0.26, 0.028, "yz", 8);
    T.circle(ux * 0.62, 0.125, uz * 0.62, 0.024, "yz", 8);
    // coax stack: bells above and below the motor plate, joined by rails
    for (const my of [0.075, 0.185]) {
      T.circle(sx, my, sz, 0.05, "xz", 14);
    }
    T.circle(sx, 0.13, sz, 0.058, "xz", 10);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      T.seg(
        [sx + Math.cos(a) * 0.05, 0.075, sz + Math.sin(a) * 0.05],
        [sx + Math.cos(a) * 0.05, 0.185, sz + Math.sin(a) * 0.05],
      );
    }
    // prop shafts poking through to each plane
    T.seg([sx, 0.185, sz], [sx, 0.215, sz]);
    T.seg([sx, 0.075, sz], [sx, 0.045, sz]);
  }

  // landing legs at the real CAD positions (vertical tubes are smooth —
  // nothing survives extraction) + foot pads
  const LEGS: Array<[number, number]> = [[0.173, -0.267], [-0.263, -0.173], [-0.172, 0.267], [0.263, 0.172]];
  for (const [lx, lz] of LEGS) {
    const ll = Math.hypot(lx, lz) || 1;
    const px = (-lz / ll) * 0.012;
    const pz = (lx / ll) * 0.012;
    for (const sgn of [1, -1]) {
      T.seg([lx * 0.92 + px * sgn, 0.07, lz * 0.92 + pz * sgn], [lx + px * sgn, -0.31, lz + pz * sgn]);
    }
    T.circle(lx * 0.93, 0.075, lz * 0.93, 0.022, "xz", 8);
    T.circle(lx, -0.31, lz, 0.02, "xz", 8);
    T.circle(lx, -0.326, lz, 0.036, "xz", 10);   // foot pad
  }
  group.add(new LineSegments(T.lines(), arms.m));

  // real screws / nuts / standoffs from the CAD (kept quiet — hardware
  // texture, not a headline)
  if (cad.groups.screw && cad.groups.screw.count > 0) {
    const cadScrew = makeCadMat(0.45, "soft");
    mats.push(cadScrew);
    group.add(new LineSegments(cadLineGeo(cad.groups.screw, 0xcfd5e2), cadScrew.m));
  }

  // battery packs: the CAD LiPos are smooth shrink-wrap (no feature edges
  // survive extraction), so the two packs are drawn to their real bounds
  const BT = new Pen();
  const power = makeMat(NUM.g1, 0.7, "power");
  mats.push(power);
  for (const bx of [-0.002, 0.098]) {
    BT.box(bx, 0.276, 0, 0.086, 0.108, 0.255);
    // hold-down straps
    for (const bz of [-0.08, 0.08]) {
      BT.rect(bx, 0.332, bz, 0.09, 0.03, "xz");
      BT.seg([bx - 0.045, 0.222, bz], [bx - 0.045, 0.332, bz]);
      BT.seg([bx + 0.045, 0.222, bz], [bx + 0.045, 0.332, bz]);
    }
    // balance-lead stub curving off the pack face
    BT.poly([[bx + 0.02, 0.3, 0.128], [bx + 0.05, 0.29, 0.16], [bx + 0.06, 0.26, 0.15]]);
  }
  group.add(new LineSegments(BT.lines(), power.m));

  // Pixhawk 5X detail over the CAD mockup: heading arrow + connector combs
  const AV = new Pen();
  const avionics = makeMat(NUM.g1, 0.85, "avionics");
  mats.push(avionics);
  const PX = { x: 0, y: 0.125, z: 0.01 };
  AV.rect(PX.x, PX.y, PX.z, 0.13, 0.09, "xz");
  AV.poly([[PX.x - 0.018, PX.y + 0.001, PX.z + 0.018], [PX.x, PX.y + 0.001, PX.z - 0.022], [PX.x + 0.018, PX.y + 0.001, PX.z + 0.018]], true);
  for (let k = 0; k < 6; k++) {
    AV.seg([PX.x - 0.055 + k * 0.022, PX.y - 0.012, PX.z + 0.047], [PX.x - 0.055 + k * 0.022, PX.y, PX.z + 0.047]);
    AV.seg([PX.x - 0.055 + k * 0.022, PX.y - 0.012, PX.z - 0.045], [PX.x - 0.055 + k * 0.022, PX.y, PX.z - 0.045]);
  }
  AV.circle(PX.x + 0.045, PX.y + 0.001, PX.z + 0.03, 0.006, "xz", 8);

  // camera gimbal under the belly (the 20 MP self-leveling mount)
  const G = new Pen();
  const primary = makeMat(NUM.fg, 0.62, "avionics");
  mats.push(primary);
  G.push().translate(0, -0.02, 0.12);
  G.seg([-0.028, 0.1, 0], [-0.028, 0.024, 0]);   // mount struts to the plate
  G.seg([0.028, 0.1, 0], [0.028, 0.024, 0]);
  G.tube(0, 0, 0, 0.04, 0.045, "y", 2, 6, 12);
  G.seg([-0.07, -0.02, 0], [0.07, -0.02, 0]);
  G.seg([-0.07, -0.02, 0], [-0.07, -0.085, 0]);
  G.seg([0.07, -0.02, 0], [0.07, -0.085, 0]);
  G.box(0, -0.085, 0, 0.085, 0.065, 0.07);
  G.tube(0, -0.085, 0.052, 0.026, 0.045, "z", 3, 8, 14);
  G.circle(0, -0.085, 0.078, 0.021, "xy", 12);
  G.circle(0, -0.085, 0.078, 0.012, "xy", 10);
  G.pop();

  group.add(new LineSegments(S.lines(), soft.m));
  group.add(new LineSegments(AV.lines(), avionics.m));
  group.add(new LineSegments(G.lines(), primary.m));

  // shading fills: deck plates, packs, coax motor columns, camera body
  const fillShell = makeFresnelMat(0xbfc7d8, 0.14, "shell");
  const fillMotor = makeFresnelMat(NUM.g3, 0.16, "motor");
  const fillPower = makeFresnelMat(NUM.g1, 0.13, "power");
  const fillCam = makeFresnelMat(NUM.g3, 0.13, "avionics");
  mats.push(fillShell, fillMotor, fillPower, fillCam);
  const put = (geo: BufferGeometry, fm: FadeMat, x: number, y: number, z: number) => {
    const mesh = new Mesh(geo, fm.m);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  put(new BoxGeometry(0.4, 0.045, 0.4), fillShell, 0, 0.095, 0);
  put(new BoxGeometry(0.19, 0.12, 0.28), fillPower, 0.048, 0.276, 0);
  for (const [sx, sz] of STATIONS) {
    put(new CylinderGeometry(0.055, 0.055, 0.15, 14), fillMotor, sx, 0.13, sz);
  }
  put(new BoxGeometry(0.083, 0.063, 0.068), fillCam, 0, -0.105, 0.12);

  return { group, props, propDirs, mats };
}

export function initBoreasTour(host: HTMLElement): () => void {
  const stage = host.querySelector<HTMLElement>("[data-stage]");
  const canvas = host.querySelector<HTMLCanvasElement>("canvas");
  if (!stage || !canvas) return () => {};
  const stageEl = stage;
  const canvasEl = canvas;

  const chips = Array.from(host.querySelectorAll<HTMLElement>("[data-chip]"));
  const chipWindows = chips.map((el) => {
    const [a, b] = (el.dataset.chip || "0,0").split(",").map(Number);
    return { el, a, b, shown: false };
  });
  for (const c of chipWindows) {
    c.el.style.opacity = "0";
    c.el.style.visibility = "hidden";
  }
  const hintEl = host.querySelector<HTMLElement>("[data-tour-hint]");

  if (prefersReduced()) {
    host.classList.add("tour--static");
    return () => {};
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: rendererBudget(window.innerWidth, window.innerHeight).antialias,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    host.classList.add("tour--static");
    return () => {};
  }

  const scene = new Scene();
  scene.fog = new Fog(NUM.bg, 5, 12);
  const camera = new PerspectiveCamera(40, 1, 0.03, 40);

  const craft = buildBoreas();
  const sway = new Group();
  sway.add(craft.group);
  scene.add(sway);

  const cam = { dist: 3.1, az: AZ_SIDE + 0.9, el: 0.3, tx: 0, ty: 0, tz: 0 };
  const boot = { v: 0 };
  const dims: Record<string, number> = {
    shell: 1, soft: 1, motor: 1, avionics: 1, power: 1, props: 1,
  };

  const tl = createTimeline({ autoplay: false, defaults: { ease: "inOut(1.7)" } });
  for (const s of STOPS) {
    tl.add(cam, { ...s.cam, duration: s.dur }, Math.max(0, s.at - s.dur));
  }
  tl.add(cam, {
    dist: 3.1, az: AZ_SIDE + 0.9 + Math.PI * 2, el: 0.3, tx: 0, ty: 0, tz: 0,
    duration: 900, ease: "inOut(4)",
  }, CRASH_AT);

  const FOCUS: Record<string, Partial<Record<string, number>>> = {
    motor: { shell: 0.35, soft: 1, motor: 1, avionics: 0.15, power: 0.15, props: 1 },
    arm: { shell: 1, soft: 0.6, motor: 0.5, avionics: 0.15, power: 0.15, props: 0.4 },
    board: { shell: 0.18, soft: 0.12, motor: 0.12, avionics: 1, power: 0.2, props: 0.12 },
    power: { shell: 0.6, soft: 0.2, motor: 0.2, avionics: 0.3, power: 1, props: 0.2 },
    camera: { shell: 0.2, soft: 0.12, motor: 0.12, avionics: 1, power: 0.15, props: 0.15 },
  };
  for (const s of STOPS) {
    tl.add(dims, { ...FOCUS[s.key], duration: 700, ease: "linear" }, Math.max(0, s.at - 600));
  }
  tl.add(dims, { shell: 1, soft: 1, motor: 1, avionics: 1, power: 1, props: 1, duration: 600, ease: "linear" }, CRASH_AT);

  let raf = 0;
  let running = false;
  let firstFrame = true;
  let missionT = 0;
  let done = false;
  let idle = false;
  let lastTick = 0;
  let tickNo = 0;
  let dtEma = 0;
  let cadenceSum = 0;
  let cadenceN = 0;
  let ticksPerRender = 1;
  const bootAt = performance.now();
  let mx = 0;
  let my = 0;
  let attYaw = 0;
  let attPitch = 0;
  let attRoll = 0;
  const onPointer = (e: PointerEvent) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const clock = makeClock();
  const pin = new URLSearchParams(location.search).get("tourT");
  const pinned = pin !== null ? clamp(parseFloat(pin), 0, 1) : null;
  if (pinned !== null) missionT = pinned * TOTAL;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    tickNo++;
    if (cadenceN < 24) {
      if (lastTick > 0) {
        cadenceSum += now - lastTick;
        cadenceN++;
        if (cadenceN === 24) ticksPerRender = cadenceSum / 24 < 11 ? 2 : 1;
      }
      lastTick = now;
    } else if (tickNo % (idle ? ticksPerRender * 2 : ticksPerRender) !== 0) {
      return;
    }
    const rawDt = clock(now);
    dtEma = dtEma > 0 ? dtEma * 0.82 + rawDt * 0.18 : rawDt;
    const dt = clamp(dtEma, 0.001, 0.05);
    if (pinned === null && !done) {
      missionT += dt * 1000;
      if (missionT >= TOTAL) {
        missionT = TOTAL;
        done = true;
      }
    }
    tl.seek(missionT);
    const t = missionT;
    boot.v = idle ? 1 : Math.min(1, smooth(performance.now() - bootAt, 0, 450));

    const attScale = clamp((cam.dist - 0.45) / 1.8, 0.15, 1);
    attYaw += (mx * 0.26 * attScale - attYaw) * 0.045;
    attPitch += (my * 0.14 * attScale - attPitch) * 0.045;
    attRoll += (mx * -0.15 * attScale - attRoll) * 0.045;
    sway.rotation.y = attYaw;
    sway.rotation.z = Math.sin(now / 5200) * 0.006 + attRoll;
    sway.rotation.x = attPitch;
    sway.position.y = Math.sin(now / 4400) * 0.008;

    const spin = dt * 13;
    for (let i = 0; i < craft.props.length; i++) {
      // this CAD authors props flat in their local Z (zeph uses local Y) —
      // the spin axis follows the model's own convention
      craft.props[i].rotation.z += spin * craft.propDirs[i];
    }

    camera.position.set(
      cam.tx + cam.dist * Math.cos(cam.el) * Math.sin(cam.az),
      cam.ty + cam.dist * Math.sin(cam.el),
      cam.tz + cam.dist * Math.cos(cam.el) * Math.cos(cam.az),
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);

    for (let i = 0; i < craft.mats.length; i++) {
      const fm = craft.mats[i];
      const isFill = "uniforms" in fm.m;
      fm.m.opacity = fm.base * (dims[fm.tag ?? "shell"] ?? 1) * (isFill ? boot.v : 1);
    }

    for (const c of chipWindows) {
      const want = t >= c.a && t < c.b;
      if (want !== c.shown) {
        c.shown = want;
        remove(c.el);
        if (want) {
          c.el.style.visibility = "visible";
          animate(c.el, { opacity: [0, 1], translateY: [8, 0], duration: 240, ease: "out(3)" });
        } else {
          animate(c.el, {
            opacity: 0, translateY: -8, duration: 180, ease: "in(2)",
            onComplete: () => { c.el.style.visibility = "hidden"; },
          });
        }
      }
    }

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      canvasEl.style.opacity = "1";
    }

    if (done && pinned === null && !idle) {
      idle = true;
      if (hintEl) hintEl.textContent = "Walkaround complete · R replays · arrows step";
    }
  }

  function resize() {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(rendererBudget(w, h).dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);
  resize();

  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  };

  let inView = false;
  const io = new IntersectionObserver((e) => {
    inView = e[0]?.isIntersecting ?? false;
    setRunning(inView && !document.hidden);
  }, { threshold: 0.15 });
  io.observe(host);
  const onVis = () => setRunning(inView && !document.hidden);
  document.addEventListener("visibilitychange", onVis);

  const onKey = (e: KeyboardEvent) => {
    if (!inView) return;
    const tEl = e.target as HTMLElement | null;
    if (tEl && (tEl.tagName === "INPUT" || tEl.tagName === "TEXTAREA")) return;
    if (e.key === "r" || e.key === "R") {
      missionT = 0;
      done = false;
      idle = false;
      if (hintEl) hintEl.textContent = "Walkaround · arrows step between systems";
      setRunning(!document.hidden);
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const idx = e.key === "ArrowRight"
        ? STOPS.findIndex((s) => s.at > missionT + 40)
        : (() => {
            let i = -1;
            for (let k = STOPS.length - 1; k >= 0; k--) {
              if (STOPS[k].at < missionT - 700) { i = k; break; }
            }
            return i;
          })();
      const stop = idx >= 0 ? STOPS[idx] : (e.key === "ArrowRight" ? null : STOPS[0]);
      if (stop) {
        missionT = stop.at;
        done = false;
        idle = false;
        setRunning(!document.hidden);
      }
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("pointermove", onPointer);
    tl.pause();
    remove(chipWindows.map((c) => c.el));
    scene.traverse((o) => {
      const g = (o as unknown as { geometry?: BufferGeometry }).geometry;
      if (g) g.dispose();
    });
    for (const fm of craft.mats) fm.m.dispose();
    renderer.dispose();
  };
}
