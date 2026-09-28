import { BufferGeometry, Fog, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { animate } from "animejs/animation";
import { createTimeline } from "animejs/timeline";
import { remove } from "animejs/utils";
import { buildDrone } from "./hero/drone";
import { NUM } from "./theme";
import { clamp, smooth, prefersReduced, makeClock, rendererBudget } from "./motion";

/**
 * THE WALKAROUND — the Zephyrus page's component tour. An autoplaying
 * camera inspection that dives INTO the hardware: motor close-up, a
 * lengthwise ride down the carbon arm, the GNSS radome, the power PCB, the
 * Jetson's heatsink, the payload spool — then one violent crash-zoom back
 * out to the whole aircraft, where it PARKS. It plays once; R replays it,
 * and the arrow keys step between stops at any time. Every stop is a real
 * part from the Technical Design Report.
 */

const TOTAL = 20600;

const A = Math.PI;                    // the featured side arm
const ARM_OFF = -0.22;                // its pinwheel tube-line offset (z)
const DIR = new Vector3(Math.cos(A), 0, Math.sin(A));
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
    dur: 2000,
    cam: { dist: 0.34, az: AZ_SIDE + 0.5, el: 0.32, tx: DIR.x * 0.99, ty: 0.33, tz: ARM_OFF },
  },
  {
    key: "arm",
    at: 4300,
    dur: 2300,
    cam: { dist: 0.5, az: AZ_SIDE, el: 0.12, tx: DIR.x * 0.4, ty: 0.27, tz: ARM_OFF },
  },
  {
    key: "gps",
    at: 7000,
    dur: 2000,
    cam: { dist: 0.4, az: AZ_SIDE + 1.1, el: 0.38, tx: -0.197, ty: 0.42, tz: -0.219 },
  },
  {
    key: "pcb",
    at: 9500,
    dur: 2000,
    cam: { dist: 0.36, az: AZ_SIDE + 2.0, el: 0.12, tx: 0, ty: 0.2, tz: 0.03 },
  },
  {
    key: "jetson",
    at: 12000,
    dur: 1900,
    cam: { dist: 0.33, az: AZ_SIDE + 2.7, el: -0.28, tx: 0.1, ty: 0.08, tz: -0.1 },
  },
  {
    key: "payload",
    at: 14400,
    dur: 1900,
    cam: { dist: 0.42, az: AZ_SIDE + 3.4, el: -0.12, tx: 0, ty: -0.08, tz: -0.22 },
  },
  {
    key: "gimbal",
    at: 16700,
    dur: 1900,
    cam: { dist: 0.38, az: AZ_SIDE + 4.2, el: -0.04, tx: 0, ty: -0.01, tz: 0.2 },
  },
];

const CRASH_AT = 18700;

export function initZephTour(host: HTMLElement): () => void {
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

  const drone = buildDrone();
  const sway = new Group();
  sway.add(drone.group);
  scene.add(sway);

  const cam = { dist: 2.6, az: AZ_SIDE + 0.9, el: 0.34, tx: 0, ty: 0, tz: 0 };
  const boot = { v: 0 };
  const dims: Record<string, number> = {
    shell: 1, soft: 1, avionics: 1, accent: 1, props: 1,
  };

  const tl = createTimeline({ autoplay: false, defaults: { ease: "inOut(1.7)" } });
  for (const s of STOPS) {
    tl.add(cam, { ...s.cam, duration: s.dur }, Math.max(0, s.at - s.dur));
  }
  // CRASH ZOOM OUT — the whole inspection reversed in one violent breath,
  // azimuth wound a full turn so the parked pose matches the establish shot.
  tl.add(cam, {
    dist: 2.6, az: AZ_SIDE + 0.9 + Math.PI * 2, el: 0.34, tx: 0, ty: 0, tz: 0,
    duration: 900, ease: "inOut(4)",
  }, CRASH_AT);

  // Focus choreography: each stop dims everything except its system.
  const FOCUS: Record<string, Partial<Record<string, number>>> = {
    motor: { shell: 1, soft: 1, avionics: 0.15, accent: 0.15, props: 0.9 },
    arm: { shell: 1, soft: 1, avionics: 0.15, accent: 0.25, props: 0.5 },
    gps: { shell: 0.25, soft: 0.15, avionics: 1, accent: 0.15, props: 0.25 },
    pcb: { shell: 0.2, soft: 0.15, avionics: 1, accent: 1, props: 0.15 },
    jetson: { shell: 0.2, soft: 0.15, avionics: 1, accent: 0.25, props: 0.15 },
    payload: { shell: 0.35, soft: 1, avionics: 0.15, accent: 0.6, props: 0.15 },
    gimbal: { shell: 1, soft: 0.2, avionics: 0.6, accent: 0.2, props: 0.15 },
  };
  for (const s of STOPS) {
    tl.add(dims, { ...FOCUS[s.key], duration: 700, ease: "linear" }, Math.max(0, s.at - 600));
  }
  tl.add(dims, { shell: 1, soft: 1, avionics: 1, accent: 1, props: 1, duration: 600, ease: "linear" }, CRASH_AT);

  let raf = 0;
  let running = false;
  let firstFrame = true;
  let missionT = 0;
  let done = false;
  let idle = false;
  let frameNo = 0;
  let lastRender = 0;
  let tickNo = 0;
  let lastTick = 0;
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
  // no layout reads here: viewport-relative only
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
    // 60fps pacing (30 parked): full resolution, double the per-frame budget
    // Tick-counted pacing (see lib/hero/index.ts): immune to browsers that
    // coarsen timestamps for fingerprinting protection.
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
    lastRender = now;
    frameNo++;
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
    // fills fade briefly on boot; line work is always complete
    boot.v = idle ? 1 : Math.min(1, smooth(performance.now() - bootAt, 0, 450));

    // attitude toward the cursor, damped, reduced during close-ups
    const attScale = clamp((cam.dist - 0.45) / 1.8, 0.15, 1);
    attYaw += (mx * 0.26 * attScale - attYaw) * 0.045;
    attPitch += (my * 0.14 * attScale - attPitch) * 0.045;
    attRoll += (mx * -0.15 * attScale - attRoll) * 0.045;
    sway.rotation.y = attYaw;
    sway.rotation.z = Math.sin(now / 5200) * 0.006 + attRoll;
    sway.rotation.x = attPitch;
    sway.position.y = Math.sin(now / 4400) * 0.008;

    const spin = dt * 14;
    for (let i = 0; i < drone.props.length; i++) {
      drone.props[i].rotation.y += i % 2 === 0 ? spin : -spin;
    }

    camera.position.set(
      cam.tx + cam.dist * Math.cos(cam.el) * Math.sin(cam.az),
      cam.ty + cam.dist * Math.sin(cam.el),
      cam.tz + cam.dist * Math.cos(cam.el) * Math.cos(cam.az),
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);

    for (let i = 0; i < drone.mats.length; i++) {
      const fm = drone.mats[i];
      if (fm.tag === "beam") { fm.m.opacity = 0; continue; }
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

    // Walkaround complete: light idle — props keep turning, cursor keeps
    // steering the airframe, everything else sleeps.
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

  // R replays; arrow keys step between stops (works parked or mid-flight)
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
    for (const fm of drone.mats) fm.m.dispose();
    renderer.dispose();
  };
}
