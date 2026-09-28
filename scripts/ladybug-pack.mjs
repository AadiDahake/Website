/**
 * GLB -> packed CAD line-art pipeline for LADYBUG (the 2026 aircraft).
 *
 * Recreates the glb2/pack2 pipeline that produced lib/hero/zeph.ts, in one
 * script: parse the Onshape GLB export, weld each mesh across its primitives,
 * extract feature edges (boundary + dihedral crease), chain-merge collinear
 * runs, bake a per-segment light response, quantize int16 over each group's
 * bbox, and emit lib/hero/ladybug.ts in the decodeCad() format.
 *
 * Scene convention (matches the Zephyrus pack): Y-up, centered on the hub at
 * the arm-tube plane, prop-station radius = 1.0.
 *
 * The NS24x7.2 blades are re-emitted as an instanced, spinnable "prop"
 * group (one template blade pair, stamped at all four MN7005 stations
 * with a synthesized hub). The bottom gimbal-placeholder
 * cylinder (an 80mm can under the nose) is EXCLUDED — the site draws a real
 * SIYI A8 mini there procedurally.
 *
 * Usage: node scripts/ladybug-pack.mjs "/path/to/Main Assembly.glb"
 */

import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node scripts/ladybug-pack.mjs <Main Assembly.glb>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// GLB parsing
// ---------------------------------------------------------------------------
const buf = readFileSync(SRC);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binOff = 20 + jsonLen + 8;
const bin = buf.subarray(binOff, binOff + buf.readUInt32LE(20 + jsonLen));

function accessor(idx) {
  const a = gltf.accessors[idx];
  const bv = gltf.bufferViews[a.bufferView];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const n = a.count * comps;
  const ab = bin.buffer;
  const base = bin.byteOffset + off;
  switch (a.componentType) {
    case 5126: return new Float32Array(ab, base, n);
    case 5125: return new Uint32Array(ab, base, n);
    case 5123: return new Uint16Array(ab, base, n);
    case 5121: return new Uint8Array(ab, base, n);
    default: throw new Error(`componentType ${a.componentType}`);
  }
}

// ---------------------------------------------------------------------------
// Node graph -> world transforms + classification
// ---------------------------------------------------------------------------
const nodes = gltf.nodes;

function matFromNode(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0];
  const q = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Classify a node by its ancestry path. First match wins; the gimbal
 * placeholder cylinder is dropped entirely.
 */
function classify(path) {
  const p = path.join("/");
  // the NS24x7.2 folding blades: pulled OUT of the static frame and
  // re-emitted as the spinning, instanced "prop" group below
  if (/NS24/.test(p)) return "propcad";
  if (/MN70/.test(p)) return "motor";
  if (/Pixhawk/.test(p)) return "pixhawk";
  if (/battery pack assembly/.test(p)) return "battery";
  if (/Glonkytwisty/.test(p)) return "winch";
  return "frame";
}

/** Mesh-node instances: { mesh, world, group } */
const meshInstances = [];
// The bottom-cylinder gimbal placeholder: a direct root child whose only
// mesh is the 80mm can (mesh bbox is a cylinder profile). Identified by
// subtree — one mesh, 4 primitives, ~228 tris, 100mm tall / 80mm dia.
function isGimbalPlaceholder(nodeIdx) {
  const n = nodes[nodeIdx];
  const kids = n.children || [];
  if (kids.length !== 1) return false;
  const k = nodes[kids[0]];
  if (k.mesh === undefined || (k.children || []).length) return false;
  const prims = gltf.meshes[k.mesh].primitives || [];
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], tris = 0;
  for (const p of prims) {
    const a = gltf.accessors[p.attributes.POSITION];
    for (let i = 0; i < 3; i++) {
      mn[i] = Math.min(mn[i], a.min[i]);
      mx[i] = Math.max(mx[i], a.max[i]);
    }
    if (p.indices !== undefined) tris += gltf.accessors[p.indices].count / 3;
  }
  const sz = mx.map((v, i) => v - mn[i]);
  const round = Math.abs(sz[0] - sz[1]) < 0.005;
  return tris < 600 && round && sz[0] > 0.05 && sz[0] < 0.12 && sz[2] > 0.06 && sz[2] < 0.14;
}

function walk(idx, parentM, path, dropped) {
  const n = nodes[idx];
  const wm = mul(parentM, matFromNode(n));
  const name = n.name || "";
  const p = [...path, name];
  if (path.length === 1 && isGimbalPlaceholder(idx)) {
    dropped.push(`#${idx} ${name}`);
    return;
  }
  if (n.mesh !== undefined) meshInstances.push({ mesh: n.mesh, world: wm, group: classify(p) });
  for (const c of n.children || []) walk(c, wm, p, dropped);
}

const droppedNodes = [];
walk(gltf.scenes[0].nodes[0], IDENT, [], droppedNodes);
console.log("dropped placeholder:", droppedNodes.join(", ") || "(none!)");

// ---------------------------------------------------------------------------
// Feature-edge extraction per unique mesh (welded across primitives)
// ---------------------------------------------------------------------------
const CREASE_DEG = 28;
const CREASE_COS = Math.cos((CREASE_DEG * Math.PI) / 180);
const MIN_EDGE = 0.0012; // metres — thread/facet dust below this never reads

const meshEdgeCache = new Map();

/** -> { segs: [x0,y0,z0,x1,y1,z1,nx,ny,nz,importance] flat array of records } */
function extractMesh(meshIdx) {
  if (meshEdgeCache.has(meshIdx)) return meshEdgeCache.get(meshIdx);
  const prims = gltf.meshes[meshIdx].primitives || [];

  // ---- weld all primitives into one indexed soup ----
  const weld = new Map();
  const verts = [];
  const tris = [];
  const key = (x, y, z) => `${Math.round(x * 5e4)},${Math.round(y * 5e4)},${Math.round(z * 5e4)}`;
  for (const p of prims) {
    if (p.mode !== undefined && p.mode !== 4) continue;
    const pos = accessor(p.attributes.POSITION);
    const idx = p.indices !== undefined ? accessor(p.indices) : null;
    const count = idx ? idx.length : pos.length / 3;
    const remap = new Map();
    const vid = (i) => {
      let r = remap.get(i);
      if (r !== undefined) return r;
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const k = key(x, y, z);
      let w = weld.get(k);
      if (w === undefined) {
        w = verts.length / 3;
        verts.push(x, y, z);
        weld.set(k, w);
      }
      remap.set(i, w);
      return w;
    };
    for (let i = 0; i < count; i += 3) {
      const a = vid(idx ? idx[i] : i);
      const b = vid(idx ? idx[i + 1] : i + 1);
      const c = vid(idx ? idx[i + 2] : i + 2);
      if (a !== b && b !== c && a !== c) tris.push(a, b, c);
    }
  }

  // ---- face normals ----
  const nf = tris.length / 3;
  const fn = new Float32Array(nf * 3);
  for (let f = 0; f < nf; f++) {
    const a = tris[f * 3] * 3, b = tris[f * 3 + 1] * 3, c = tris[f * 3 + 2] * 3;
    const ux = verts[b] - verts[a], uy = verts[b + 1] - verts[a + 1], uz = verts[b + 2] - verts[a + 2];
    const vx = verts[c] - verts[a], vy = verts[c + 1] - verts[a + 1], vz = verts[c + 2] - verts[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[f * 3] = nx / l; fn[f * 3 + 1] = ny / l; fn[f * 3 + 2] = nz / l;
  }

  // ---- edge map ----
  const edges = new Map(); // "a,b" -> [f0, f1?]
  for (let f = 0; f < nf; f++) {
    for (let e = 0; e < 3; e++) {
      const a = tris[f * 3 + e];
      const b = tris[f * 3 + ((e + 1) % 3)];
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      const arr = edges.get(k);
      if (arr) arr.push(f);
      else edges.set(k, [f]);
    }
  }

  // ---- keep boundary + crease edges ----
  const kept = [];
  for (const [k, faces] of edges) {
    let imp;
    let nx, ny, nz;
    if (faces.length === 1) {
      imp = 1.0;
      const f = faces[0] * 3;
      nx = fn[f]; ny = fn[f + 1]; nz = fn[f + 2];
    } else if (faces.length === 2) {
      const f0 = faces[0] * 3, f1 = faces[1] * 3;
      const d = fn[f0] * fn[f1] + fn[f0 + 1] * fn[f1 + 1] + fn[f0 + 2] * fn[f1 + 2];
      if (d > CREASE_COS) continue;
      imp = Math.min(1, Math.acos(Math.max(-1, Math.min(1, d))) / Math.PI);
      nx = fn[f0] + fn[f1]; ny = fn[f0 + 1] + fn[f1 + 1]; nz = fn[f0 + 2] + fn[f1 + 2];
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
    } else {
      continue; // non-manifold junk
    }
    const [a, b] = k.split(",").map(Number);
    const ax = verts[a * 3], ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
    const bx = verts[b * 3], by = verts[b * 3 + 1], bz = verts[b * 3 + 2];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    if (len < MIN_EDGE) continue;
    kept.push({ a, b, ax, ay, az, bx, by, bz, nx, ny, nz, imp, len });
  }

  // ---- chain-merge collinear runs (same direction, similar normal) ----
  const byVert = new Map();
  for (let i = 0; i < kept.length; i++) {
    for (const v of [kept[i].a, kept[i].b]) {
      const arr = byVert.get(v);
      if (arr) arr.push(i);
      else byVert.set(v, [i]);
    }
  }
  const dead = new Uint8Array(kept.length);
  const dir = (e) => {
    const l = e.len || 1;
    return [(e.bx - e.ax) / l, (e.by - e.ay) / l, (e.bz - e.az) / l];
  };
  let mergedCount = 0;
  for (let i = 0; i < kept.length; i++) {
    if (dead[i]) continue;
    let e = kept[i];
    let grew = true;
    while (grew) {
      grew = false;
      for (const endVert of [e.a, e.b]) {
        const cands = byVert.get(endVert) || [];
        for (const j of cands) {
          if (j === i || dead[j]) continue;
          const o = kept[j];
          const d1 = dir(e), d2 = dir(o);
          const dot = Math.abs(d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2]);
          const ndot = e.nx * o.nx + e.ny * o.ny + e.nz * o.nz;
          if (dot < 0.9995 || ndot < 0.98) continue;
          // splice o into e at the shared endpoint
          const shared = endVert;
          const oFar = o.a === shared ? o.b : o.a;
          const oFarP = o.a === shared ? [o.bx, o.by, o.bz] : [o.ax, o.ay, o.az];
          if (e.a === shared) {
            e.a = oFar; [e.ax, e.ay, e.az] = oFarP;
          } else {
            e.b = oFar; [e.bx, e.by, e.bz] = oFarP;
          }
          e.len = Math.hypot(e.bx - e.ax, e.by - e.ay, e.bz - e.az);
          e.imp = Math.max(e.imp, o.imp);
          dead[j] = 1;
          mergedCount++;
          const arr = byVert.get(oFar);
          if (arr) arr.push(i);
          grew = true;
          break;
        }
        if (grew) break;
      }
    }
  }
  const segs = kept.filter((_, i) => !dead[i]);
  const out = { segs };
  meshEdgeCache.set(meshIdx, out);
  return out;
}

// ---------------------------------------------------------------------------
// Assemble world-space segments per group (Z-up CAD -> Y-up scene)
// ---------------------------------------------------------------------------
function xfp(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}
function xfn(m, x, y, z) {
  // rigid transforms only (Onshape assembly): rotate, renormalize
  const o = [
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  ];
  const l = Math.hypot(o[0], o[1], o[2]) || 1;
  return [o[0] / l, o[1] / l, o[2] / l];
}

const groups = new Map(); // name -> [{p0,p1,n,imp,len}]
const propCadInstances = [];
for (const inst of meshInstances) {
  if (inst.group === "propcad") { propCadInstances.push(inst); continue; }
  const { segs } = extractMesh(inst.mesh);
  let arr = groups.get(inst.group);
  if (!arr) { arr = []; groups.set(inst.group, arr); }
  for (const s of segs) {
    arr.push({
      p0: xfp(inst.world, s.ax, s.ay, s.az),
      p1: xfp(inst.world, s.bx, s.by, s.bz),
      n: xfn(inst.world, s.nx, s.ny, s.nz),
      imp: s.imp,
      len: s.len,
    });
  }
}

// ---- locate the four MN7005 rotors for stations + normalization ----
const rotorCenters = [];
for (const inst of meshInstances) {
  const name = gltf.meshes[inst.mesh]?.primitives ? (nodesNameOfMesh(inst.mesh) || "") : "";
  void name;
}
function nodesNameOfMesh() { return null; }
// rotor nodes: name "MN7005_rotor:1" — find via node walk
{
  const stack = [[gltf.scenes[0].nodes[0], IDENT]];
  while (stack.length) {
    const [idx, pm] = stack.pop();
    const n = nodes[idx];
    const wm = mul(pm, matFromNode(n));
    if (/MN7005_rotor/.test(n.name || "") && n.mesh !== undefined) {
      // FULL mesh bbox: Onshape splits every face into its own primitive, so
      // primitive 0 alone is one arbitrary face and its centre sits millimetres
      // off the true rotor axis — which visibly misaligns everything derived
      // from the stations (props, hub rings, blur discs, motor glow).
      const mn = [1e9, 1e9, 1e9];
      const mx = [-1e9, -1e9, -1e9];
      for (const p of gltf.meshes[n.mesh].primitives || []) {
        const a = gltf.accessors[p.attributes.POSITION];
        for (let k = 0; k < 3; k++) {
          mn[k] = Math.min(mn[k], a.min[k]);
          mx[k] = Math.max(mx[k], a.max[k]);
        }
      }
      const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      const w = xfp(wm, c[0], c[1], c[2]);
      const wt = xfp(wm, c[0], c[1], mx[2]);
      rotorCenters.push({ c: w, top: wt });
    }
    for (const k of n.children || []) stack.push([k, wm]);
  }
}
if (rotorCenters.length !== 4) throw new Error(`expected 4 rotors, found ${rotorCenters.length}`);

const hub = [0, 0];
for (const r of rotorCenters) { hub[0] += r.c[0] / 4; hub[1] += r.c[1] / 4; }
const stationR = rotorCenters.reduce((s, r) => s + Math.hypot(r.c[0] - hub[0], r.c[1] - hub[1]), 0) / 4;
const SCALE = 1 / stationR;
// vertical centre: the arm-tube plane (rotor centre height, near enough)
const zc = rotorCenters.reduce((s, r) => s + r.c[2], 0) / 4 - 0.03;

/** CAD Z-up world -> scene Y-up normalized */
function toScene(p) {
  return [(p[0] - hub[0]) * SCALE, (p[2] - zc) * SCALE, -(p[1] - hub[1]) * SCALE];
}
function toSceneN(n) {
  return [n[0], n[2], -n[1]];
}

const STATIONS = rotorCenters.map((r) => {
  const s = toScene([r.c[0], r.c[1], r.top[2] + 0.006]);
  return [s[0], s[1], s[2]];
});

// ---------------------------------------------------------------------------
// Baked lighting + per-group budgets
// ---------------------------------------------------------------------------
const L = (() => {
  const v = [0.42, 0.86, 0.28];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

const BUDGET = { frame: 9000, motor
: 2600, pixhawk: 4200, battery: 1600, winch: 2600 };

const packedGroups = {};
const stats = [];
for (const [name, arr] of groups) {
  // importance: crease sharpness x world length; keeps structure, drops dust
  for (const s of arr) s.rank = s.imp * Math.pow(s.len, 0.7);
  arr.sort((a, b) => b.rank - a.rank);
  const cap = BUDGET[name] ?? 4000;
  const keep = arr.slice(0, cap);
  const n = keep.length;
  const pos = new Float32Array(n * 6);
  const shade = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const s = keep[i];
    const a = toScene(s.p0);
    const b = toScene(s.p1);
    pos.set(a, i * 6);
    pos.set(b, i * 6 + 3);
    const wn = toSceneN(s.n);
    const d = wn[0] * L[0] + wn[1] * L[1] + wn[2] * L[2];
    shade[i] = Math.max(0, Math.min(255, Math.round((0.5 + 0.5 * d) * 255)));
  }
  // group bbox + int16 quantization
  const mn = [1e9, 1e9, 1e9];
  const mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n * 2; i++) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i * 3 + k];
      if (v < mn[k]) mn[k] = v;
      if (v > mx[k]) mx[k] = v;
    }
  }
  const ext = mx.map((v, k) => Math.max(1e-6, v - mn[k]));
  const q = new Int16Array(n * 6);
  for (let i = 0; i < n * 2; i++) {
    for (let k = 0; k < 3; k++) {
      q[i * 3 + k] = Math.round(((pos[i * 3 + k] - mn[k]) / ext[k]) * 65534 - 32767);
    }
  }
  packedGroups[name] = {
    n,
    mn: mn.map((v) => +v.toFixed(5)),
    ext: ext.map((v) => +v.toFixed(5)),
    p: Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString("base64"),
    s: Buffer.from(shade).toString("base64"),
  };
  stats.push(`${name}: ${arr.length} -> ${n} segs`);
}

// ---------------------------------------------------------------------------
// Prop group: the REAL NS24x7.2 blades from CAD, one instance per station
// ---------------------------------------------------------------------------
// One arm's blade unit becomes the template: extract its edges, express them
// relative to its own rotor station, and stamp that geometry at all four
// stations so each prop can spin around its own axis.
if (propCadInstances.length === 0) throw new Error("no NS24 blade instances found");
const tpl = propCadInstances[0];
const { segs: bladeSegs } = extractMesh(tpl.mesh);
const worldBlade = bladeSegs.map((s) => ({
  p0: toScene(xfp(tpl.world, s.ax, s.ay, s.az)),
  p1: toScene(xfp(tpl.world, s.bx, s.by, s.bz)),
  n: toSceneN(xfn(tpl.world, s.nx, s.ny, s.nz)),
  imp: s.imp,
  len: s.len,
}));
// spin centre: the ROTOR AXIS — the station nearest the blade centroid.
// (The blade pair's own centroid is off-axis: folding blades mount on
// offset pivots and edge density differs per blade.)
const bctr = [0, 0, 0];
for (const s of worldBlade) {
  for (let k = 0; k < 3; k++) bctr[k] += (s.p0[k] + s.p1[k]) / (2 * worldBlade.length);
}
let tplStation = STATIONS[0];
for (const st of STATIONS) {
  if (Math.hypot(st[0] - bctr[0], st[2] - bctr[2]) < Math.hypot(tplStation[0] - bctr[0], tplStation[2] - bctr[2])) tplStation = st;
}
let PROP_R = 0;
for (const s of worldBlade) {
  PROP_R = Math.max(PROP_R, Math.hypot(s.p0[0] - tplStation[0], s.p0[2] - tplStation[2]), Math.hypot(s.p1[0] - tplStation[0], s.p1[2] - tplStation[2]));
}
{
  const segs = [];
  const add = (a, b, n) => segs.push({ p0: a, p1: b, n });
  for (const s of worldBlade) {
    add(
      [s.p0[0] - tplStation[0], s.p0[1] - tplStation[1], s.p0[2] - tplStation[2]],
      [s.p1[0] - tplStation[0], s.p1[1] - tplStation[1], s.p1[2] - tplStation[2]],
      s.n,
    );
  }
  // hub: cap circle + bolt ring
  const hubSegs = (r, y, n) => {
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = [Math.cos(a) * r, y, Math.sin(a) * r];
      if (prev) add(prev, p, [0, 1, 0]);
      prev = p;
    }
  };
  // folding-prop hub: pivot plate + spinner cap over the blade roots
  const HUB_R = 0.033 * SCALE;
  hubSegs(HUB_R, 0.02, 16);
  hubSegs(HUB_R, 0.0, 16);
  hubSegs(HUB_R * 0.4, 0.026, 10);
  const n = segs.length;
  const pos = new Float32Array(n * 6);
  const shade = new Uint8Array(n);
  const mn = [1e9, 1e9, 1e9];
  const mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) {
    pos.set(segs[i].p0, i * 6);
    pos.set(segs[i].p1, i * 6 + 3);
    const d = segs[i].n[0] * L[0] + segs[i].n[1] * L[1] + segs[i].n[2] * L[2];
    shade[i] = Math.max(0, Math.min(255, Math.round((0.55 + 0.45 * d) * 255)));
  }
  for (let i = 0; i < n * 2; i++) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i * 3 + k];
      if (v < mn[k]) mn[k] = v;
      if (v > mx[k]) mx[k] = v;
    }
  }
  const ext = mx.map((v, k) => Math.max(1e-6, v - mn[k]));
  const q = new Int16Array(n * 6);
  for (let i = 0; i < n * 2; i++) {
    for (let k = 0; k < 3; k++) {
      q[i * 3 + k] = Math.round(((pos[i * 3 + k] - mn[k]) / ext[k]) * 65534 - 32767);
    }
  }
  packedGroups.prop = {
    n,
    mn: mn.map((v) => +v.toFixed(5)),
    ext: ext.map((v) => +v.toFixed(5)),
    p: Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString("base64"),
    s: Buffer.from(shade).toString("base64"),
  };
  stats.push(`prop: ${n} segs (NS24x7.2 from CAD + hub), R=${PROP_R.toFixed(4)}`);
}

const instances = {
  prop: STATIONS.map((st, i) => ({
    name: `prop${i}`,
    // column-major: yaw each prop differently so the parked pose reads
    m: (() => {
      const a = (i * Math.PI) / 3 + 0.35;
      const c = Math.cos(a), s = Math.sin(a);
      return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, +st[0].toFixed(4), +st[1].toFixed(4), +st[2].toFixed(4), 1];
    })(),
  })),
};

// ---------------------------------------------------------------------------
// Emit lib/hero/ladybug.ts + an anchor report for the drone builder
// ---------------------------------------------------------------------------
const DATA = { groups: packedGroups, instances };
const stationsLit = JSON.stringify(STATIONS.map((s) => s.map((v) => +v.toFixed(4))));

const ts = `/* AUTO-GENERATED by scripts/ladybug-pack.mjs from the real Ladybug CAD
 * assembly — do not edit. Feature edges, welded + crease-filtered + chain-
 * merged, with per-segment baked lighting, quantized int16 over each group's
 * bbox. Scene convention: Y-up, centered, prop-station radius = 1.0.
 * The CAD's gimbal-placeholder cylinder is excluded (the SIYI A8 mini is
 * drawn procedurally); the props are the real NS24x7.2 blades, instanced.
 */
import { decodeCad, type CadModel } from "../cad";

export const LADYBUG_STATIONS: Array<[number, number, number]> = ${stationsLit};

const DATA = ${JSON.stringify(DATA)};

export function decodeLadybug(): CadModel {
  return decodeCad(DATA);
}
`;
writeFileSync(new URL("../lib/hero/ladybug.ts", import.meta.url), ts);

console.log(stats.join("\n"));
console.log("stationR(m):", stationR.toFixed(4), "scale:", SCALE.toFixed(4), "zc(m):", zc.toFixed(4));
console.log("stations:", stationsLit);

// ---- anchor report: key hardware, in scene units, for ladybug-drone.ts ----
function subtreeSceneBox(re) {
  const stack = [[gltf.scenes[0].nodes[0], IDENT, false]];
  const mn = [1e9, 1e9, 1e9];
  const mx = [-1e9, -1e9, -1e9];
  while (stack.length) {
    const [idx, pm, hit] = stack.pop();
    const n = nodes[idx];
    const wm = mul(pm, matFromNode(n));
    const nowHit = hit || re.test(n.name || "");
    if (nowHit && n.mesh !== undefined) {
      for (const p of gltf.meshes[n.mesh].primitives || []) {
        const a = gltf.accessors[p.attributes.POSITION];
        if (!a.min) continue;
        for (const cx of [a.min[0], a.max[0]]) {
          for (const cy of [a.min[1], a.max[1]]) {
            for (const cz of [a.min[2], a.max[2]]) {
              const w = xfp(wm, cx, cy, cz);
              const s = toScene(w);
              for (let k = 0; k < 3; k++) {
                mn[k] = Math.min(mn[k], s[k]);
                mx[k] = Math.max(mx[k], s[k]);
              }
            }
          }
        }
      }
    }
    for (const c of n.children || []) stack.push([c, wm, nowHit]);
  }
  if (mn[0] > 1e8) return null;
  return {
    ctr: mn.map((v, k) => +((v + mx[k]) / 2).toFixed(4)),
    size: mn.map((v, k) => +(mx[k] - v).toFixed(4)),
  };
}

for (const [label, re] of [
  ["pixhawk", /Pixhawk/],
  ["battery", /battery pack assembly/],
  ["winchA", /Glonkytwisty Mount Assembly <1>/],
  ["winchB", /Glonkytwisty Mount Assembly <2>/],
  ["gimbalMount", /Gimbal Mount Assembly/],
  ["legs", /twistlock leg/],
  ["upperPlate", /Upper Plate/],
  ["lowerPlate", /Lower Plate/],
  ["batteryPlate", /^occurrence of Battery Plate$/],
  ["armTube", /arm tube/],
  ["core", /Core </],
]) {
  console.log(label, JSON.stringify(subtreeSceneBox(re)));
}
