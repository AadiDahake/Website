/**
 * Renders the packed Ladybug CAD line art into a static isometric SVG
 * component: components/LadybugPackedIso.vue.
 * Brand-colored stroke groups, two opacity bands from the baked shading —
 * the 2D twin of the 3D walkaround, in the ZephPackedIso style.
 *
 * Two sources, because neither is complete on its own:
 *
 *   lib/hero/ladybug.ts       the line-art pack — frame, motors, avionics,
 *                             battery, winches, props. It has NO arm group,
 *                             which is why the first version of this drawing
 *                             showed four motor pods floating unattached.
 *   public/ladybug-solid.bin  the solid pack the hero renders, which does
 *                             carry the arms and their four instances.
 *
 * The arms are drawn as the projected convex hull of the real arm mesh. An
 * arm assembly is convex to within a rounding error — a tube with a fitting on
 * each end — so its hull IS its silhouette, and one polygon per arm keeps the
 * drawing sparse instead of turning 64k triangles into scribble.
 *
 * Framing is measured, not hard-coded: everything is projected first, then the
 * result is scaled and centred into the viewBox. The fixed origin and scale
 * this replaced put the aircraft low and right, with one prop clipped off the
 * edge and the top-left third of the frame empty.
 *
 * Usage: node scripts/ladybug-iso.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const VIEW_W = 420;
const VIEW_H = 340;
/** Breathing room around the aircraft, in viewBox units. */
const MARGIN = 12;

const src = readFileSync(new URL("../lib/hero/ladybug.ts", import.meta.url), "utf8");
const DATA = JSON.parse(src.match(/const DATA = (.*);/)[1]);

function decode(g) {
  const raw = Buffer.from(g.p, "base64");
  const q = new Int16Array(raw.buffer, raw.byteOffset, g.n * 6);
  const sb = Buffer.from(g.s, "base64");
  const pos = new Float32Array(g.n * 6);
  const shade = new Float32Array(g.n);
  for (let i = 0; i < g.n * 2; i++) {
    for (let k = 0; k < 3; k++) {
      pos[i * 3 + k] = ((q[i * 3 + k] + 32767) / 65534) * g.ext[k] + g.mn[k];
    }
  }
  for (let i = 0; i < g.n; i++) shade[i] = sb[i] / 255;
  return { pos, shade, n: g.n };
}

// Isometric-ish projection, matched to the site's schematic language. Output
// is in unit space; the fit pass below turns it into viewBox coordinates.
//
// The azimuth is a quarter turn on purpose. The four arms sit 90 degrees
// apart, so viewing down a diagonal is the only angle at which all four read
// as the same part at the same length — off-axis, two arms foreshorten into
// the body and the aircraft stops looking like a quad.
const az = Math.PI * 0.25;
const el = 0.46;
const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
function proj(x, y, z) {
  const px = x * ca - z * sa;
  const pz = x * sa + z * ca;
  const py = y * ce - pz * se;
  return [px, -py];
}

const GROUP_COLOR = {
  frame: "#694fd4",
  motor: "#0eabcd",
  prop: "#0eabcd",
  pixhawk: "#ce2a7f",
  battery: "#ce2a7f",
  winch: "#694fd4",
  arm: "#694fd4",
};

/** color -> band -> [x0, y0, x1, y1], in unfitted projection space */
const buckets = new Map();
function emit(color, band, a, b) {
  let byBand = buckets.get(color);
  if (!byBand) { byBand = new Map(); buckets.set(color, byBand); }
  let arr = byBand.get(band);
  if (!arr) { arr = []; byBand.set(band, arr); }
  arr.push([a[0], a[1], b[0], b[1]]);
}

/** column-major 4x4 applied to a point */
function transform(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function addGroup(name, matrices) {
  const g = decode(DATA.groups[name]);
  const color = GROUP_COLOR[name];
  for (const m of matrices) {
    for (let i = 0; i < g.n; i++) {
      let p0 = [g.pos[i * 6], g.pos[i * 6 + 1], g.pos[i * 6 + 2]];
      let p1 = [g.pos[i * 6 + 3], g.pos[i * 6 + 4], g.pos[i * 6 + 5]];
      if (m) { p0 = transform(m, p0); p1 = transform(m, p1); }
      emit(color, g.shade[i] > 0.52 ? "hi" : "lo", proj(...p0), proj(...p1));
    }
  }
}

addGroup("frame", [null]);
addGroup("motor", [null]);
addGroup("battery", [null]);
addGroup("pixhawk", [null]);
addGroup("winch", [null]);
addGroup("prop", DATA.instances.prop.map((p) => p.m));

// ---------------------------------------------------------------------------
// arms, from the solid pack
// ---------------------------------------------------------------------------

/** Monotone-chain hull; returns points in order without the closing repeat. */
function hull2d(pts) {
  const p = pts.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return chain(p).concat(chain(p.slice().reverse()));
}

function addSolidArms() {
  const buf = readFileSync(new URL("../public/ladybug-solid.bin", import.meta.url));
  if (buf.toString("ascii", 0, 4) !== "LBS1") throw new Error("ladybug-solid.bin: bad magic");
  const headerLen = buf.readUInt32LE(4);
  const head = JSON.parse(buf.toString("utf8", 8, 8 + headerLen));
  const base = 8 + headerLen;
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const g = head.groups.arm;
  if (!g) throw new Error("ladybug-solid.bin: no arm group");
  const pos = new Int16Array(ab, base + g.p, g.v * 3);

  for (const inst of head.instances.arm) {
    const pts = new Array(g.v);
    for (let i = 0; i < g.v; i++) {
      pts[i] = proj(...transform(inst.m, [
        pos[i * 3] * g.qs[0] + g.qo[0],
        pos[i * 3 + 1] * g.qs[1] + g.qo[1],
        pos[i * 3 + 2] * g.qs[2] + g.qo[2],
      ]));
    }
    const h = hull2d(pts);
    for (let i = 0; i < h.length; i++) {
      emit(GROUP_COLOR.arm, "hi", h[i], h[(i + 1) % h.length]);
    }
  }
}

addSolidArms();

// ---------------------------------------------------------------------------
// fit: measure everything drawn, then scale and centre it into the viewBox
// ---------------------------------------------------------------------------

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const byBand of buckets.values()) {
  for (const arr of byBand.values()) {
    for (const s of arr) {
      minX = Math.min(minX, s[0], s[2]);
      maxX = Math.max(maxX, s[0], s[2]);
      minY = Math.min(minY, s[1], s[3]);
      maxY = Math.max(maxY, s[1], s[3]);
    }
  }
}

const SC = Math.min(
  (VIEW_W - MARGIN * 2) / (maxX - minX),
  (VIEW_H - MARGIN * 2) / (maxY - minY),
);
const OX = (VIEW_W - (maxX + minX) * SC) / 2;
const OY = (VIEW_H - (maxY + minY) * SC) / 2;

const r1 = (v) => Math.round(v * 2) / 2;
const fit = (x, y) => [r1(OX + x * SC), r1(OY + y * SC)];

let body = "";
let kept = 0;
let dropped = 0;
for (const [color, byBand] of buckets) {
  let g = "";
  for (const [band, arr] of byBand) {
    const chunks = [];
    for (const s of arr) {
      const a = fit(s[0], s[1]);
      const b = fit(s[2], s[3]);
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      if (dx * dx + dy * dy < 1.4) { dropped++; continue; }   // sub-pixel dust
      chunks.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
      kept++;
    }
    if (!chunks.length) continue;
    const opacity = band === "hi" ? "0.92" : "0.34";
    g += `      <path pathLength="1" opacity="${opacity}" d="${chunks.join("")}" />\n`;
  }
  if (!g) continue;
  body += `    <g stroke="${color}">\n${g}    </g>\n`;
}

const vue = `<template>
  <!-- AUTO-GENERATED isometric line-art of Ladybug from the packed CAD
       extraction (lib/hero/ladybug.ts, plus the arms out of
       public/ladybug-solid.bin). Regenerate with scripts/ladybug-iso.mjs
       rather than editing by hand. -->
  <svg class="poster" viewBox="0 0 ${VIEW_W} ${VIEW_H}" fill="none" stroke-width="0.7" stroke-linecap="round" aria-hidden="true">
${body.trimEnd()}
  </svg>
</template>
`;
writeFileSync(new URL("../components/LadybugPackedIso.vue", import.meta.url), vue);
console.log(
  `wrote components/LadybugPackedIso.vue ${Math.round(vue.length / 1024)} KB`
  + ` · ${kept} segments (${dropped} sub-pixel dropped) · fit scale ${SC.toFixed(1)}`,
);
