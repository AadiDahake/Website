/**
 * GLB -> packed SOLID-MESH pipeline for LADYBUG (the 2026 aircraft).
 *
 * The line-art pipeline (scripts/ladybug-pack.mjs) throws the surfaces away
 * and keeps the creases. This one keeps the surfaces: it reads the same
 * Onshape assembly export and emits a small, well-conditioned triangle mesh
 * that can be shaded for real at runtime.
 *
 * The CAD is not usable as-is — 5.5M instanced triangles, tessellation dust
 * on every fillet, McMaster fasteners modelled down to the thread. So the
 * mesh is REBUILT rather than merely subsampled:
 *
 *   1. SUBASSEMBLY INSTANCING. The four arm assemblies, the two winches, the
 *      two legs and the four props are congruent rigid copies. Each is packed
 *      once, in its own local frame, and stamped by matrix — so the payload
 *      carries one arm, not four.
 *   2. WELD. Onshape splits every face into its own primitive; vertices are
 *      merged back across primitives so the mesh is actually connected.
 *   3. QUADRIC DECIMATION. Garland-Heckbert edge collapse with boundary and
 *      material-seam constraint planes, an error budget in real millimetres,
 *      and a normal-flip guard. Coplanar tessellation collapses to nothing;
 *      curvature and silhouettes survive. ~50:1 with no visible change.
 *   4. CREASE-SPLIT NORMALS. Vertex normals are re-derived from the decimated
 *      mesh, area-weighted, and split where the dihedral exceeds the crease
 *      angle — so cylinders are smooth and plate edges are razor sharp. This
 *      is the single biggest reason the result reads as machined metal and
 *      not as a melted blob.
 *   5. BAKED AO. A BVH over the fully assembled aircraft, cosine-weighted
 *      hemisphere sampling per vertex. Every cavity, every bolt recess and
 *      every plate underside is darkened offline, at zero runtime cost.
 *   6. PART COLOURS. Onshape's per-part baseColor is carried through as a
 *      one-byte palette index per vertex. The flat grade only uses it as a
 *      hint of hue over the greys, but it is what separates the battery wrap
 *      from the carbon plate from the PCBs.
 *
 * Scene convention (identical to the line pack): Y-up, centered on the hub at
 * the arm-tube plane, prop-station radius = 1.0.
 *
 * Usage: node scripts/ladybug-solid-pack.mjs "/path/to/Main Assembly.glb"
 */

import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2] || `${process.env.HOME}/Downloads/Main Assembly.glb`;

// ---------------------------------------------------------------------------
// GLB parsing
// ---------------------------------------------------------------------------
const buf = readFileSync(SRC);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binOff = 20 + jsonLen + 8;
const bin = buf.subarray(binOff, binOff + buf.readUInt32LE(20 + jsonLen));
const nodes = gltf.nodes;

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
// Small matrix helpers (column-major 4x4, glTF convention)
// ---------------------------------------------------------------------------
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

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

/** Rigid-transform inverse (the Onshape assembly has no scale or shear). */
function invRigid(m) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 4 + r] = m[r * 4 + c];
  // -R^T t: row r of R^T is COLUMN r of R, i.e. m[r*4 + k]
  for (let r = 0; r < 3; r++) {
    o[12 + r] = -(m[r * 4] * m[12] + m[r * 4 + 1] * m[13] + m[r * 4 + 2] * m[14]);
  }
  o[15] = 1;
  return o;
}

function xfp(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// ---------------------------------------------------------------------------
// Assembly decomposition
// ---------------------------------------------------------------------------
/** +90 about X: sends the frame's +Y onto the CAD's +Z (the rotor axis). */
const RX90 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

/**
 * `pinwheel` marks subassemblies Onshape FLATTENED on export: the four Arm
 * Assembly nodes (and both legs, both winches) all carry identity transforms,
 * with every leaf part holding its own absolute placement. Node-level
 * instancing therefore collapses them all onto one another. They are still
 * genuine rigid copies though — a pinwheel about the hub axis — so the
 * placements are synthesized below from the rotor geometry instead.
 */
const INSTANCED = [
  { group: "arm", re: /^Arm Assembly </, pinwheel: true },
  { group: "leg", re: /^twistlock leg assembly </, pinwheel: true },
  { group: "winch", re: /^Glonkytwisty Mount Assembly </, pinwheel: true },
  // the props DO carry real node transforms; they are packed in a frame whose
  // +Y is the rotor axis, so the hero spins them with a plain rotation.y
  { group: "prop", re: /^occurrence of NS24/, fix: RX90 },
];
/** Singleton subassemblies pulled out of the frame so they can shade apart. */
const SINGLETON = [
  { group: "pixhawk", re: /^Pixhawk 6X/ },
  { group: "battery", re: /^battery pack assembly/ },
];

/**
 * The bottom gimbal-placeholder cylinder: an 80mm can under the nose with no
 * detail on it. The site draws a real SIYI A8 mini there instead, so the
 * placeholder is dropped exactly as the line pack drops it.
 */
function isGimbalPlaceholder(nodeIdx) {
  const n = nodes[nodeIdx];
  const kids = n.children || [];
  if (kids.length !== 1) return false;
  const k = nodes[kids[0]];
  if (k.mesh === undefined || (k.children || []).length) return false;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  let tris = 0;
  for (const p of gltf.meshes[k.mesh].primitives || []) {
    const a = gltf.accessors[p.attributes.POSITION];
    for (let i = 0; i < 3; i++) {
      mn[i] = Math.min(mn[i], a.min[i]);
      mx[i] = Math.max(mx[i], a.max[i]);
    }
    if (p.indices !== undefined) tris += gltf.accessors[p.indices].count / 3;
  }
  const sz = mx.map((v, i) => v - mn[i]);
  return tris < 600 && Math.abs(sz[0] - sz[1]) < 0.005
    && sz[0] > 0.05 && sz[0] < 0.12 && sz[2] > 0.06 && sz[2] < 0.14;
}

/**
 * One walk collects, per group, the mesh instances expressed in that group's
 * OWN frame (the first occurrence's frame for instanced groups), plus the
 * world matrix of every occurrence.
 */
const parts = new Map();   // group -> { local: [{mesh, m}], roots: [worldMatrix] }
function part(group) {
  let p = parts.get(group);
  if (!p) { p = { local: [], roots: [] }; parts.set(group, p); }
  return p;
}

const dropped = [];
function walk(idx, worldM, owner) {
  const n = nodes[idx];
  const wm = mul(worldM, matFromNode(n));
  const name = n.name || "";

  if (!owner && isGimbalPlaceholder(idx)) { dropped.push(name); return; }

  let mine = owner;
  // subassembly matching is NESTED: the props live inside the arm assemblies
  // and have to be pulled back out so they can spin on their own
  const inst = INSTANCED.find((s) => s.re.test(name)) || SINGLETON.find((s) => s.re.test(name));
  if (inst) {
    const p = part(inst.group);
    const frame = inst.fix ? mul(wm, inst.fix) : wm;
    p.roots.push(frame);
    // only the first occurrence contributes geometry; the rest are matrices
    mine = { group: inst.group, toLocal: invRigid(frame), first: p.roots.length === 1 };
  }

  if (n.mesh !== undefined) {
    if (mine) {
      if (mine.first) part(mine.group).local.push({ mesh: n.mesh, m: mul(mine.toLocal, wm) });
    } else {
      part("frame").local.push({ mesh: n.mesh, m: wm });
    }
  }
  for (const c of n.children || []) walk(c, wm, mine);
}
part("frame").roots.push(IDENT);
walk(gltf.scenes[0].nodes[0], IDENT, null);
console.log("dropped placeholder:", dropped.join(", ") || "(none!)");

// ---------------------------------------------------------------------------
// Scene normalization: find the four MN7005 rotors
// ---------------------------------------------------------------------------
const rotors = [];
{
  const stack = [[gltf.scenes[0].nodes[0], IDENT]];
  while (stack.length) {
    const [idx, pm] = stack.pop();
    const n = nodes[idx];
    const wm = mul(pm, matFromNode(n));
    if (/MN7005_rotor/.test(n.name || "") && n.mesh !== undefined) {
      // full mesh bbox: Onshape's per-face primitives make primitive 0 an
      // arbitrary face whose centre sits millimetres off the rotor axis
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const p of gltf.meshes[n.mesh].primitives || []) {
        const a = gltf.accessors[p.attributes.POSITION];
        for (let k = 0; k < 3; k++) {
          mn[k] = Math.min(mn[k], a.min[k]);
          mx[k] = Math.max(mx[k], a.max[k]);
        }
      }
      const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      rotors.push({ c: xfp(wm, c[0], c[1], c[2]), top: xfp(wm, c[0], c[1], mx[2]) });
    }
    for (const k of n.children || []) stack.push([k, wm]);
  }
}
if (rotors.length !== 4) throw new Error(`expected 4 rotors, found ${rotors.length}`);

const hub = [0, 0];
for (const r of rotors) { hub[0] += r.c[0] / 4; hub[1] += r.c[1] / 4; }
const stationR = rotors.reduce((s, r) => s + Math.hypot(r.c[0] - hub[0], r.c[1] - hub[1]), 0) / 4;
const SCALE = 1 / stationR;
const zc = rotors.reduce((s, r) => s + r.c[2], 0) / 4 - 0.03;

/** CAD (Z-up metres) -> scene (Y-up, hub-centred, station radius 1). */
const A = [
  SCALE, 0, 0, 0,
  0, 0, -SCALE, 0,
  0, SCALE, 0, 0,
  -hub[0] * SCALE, -zc * SCALE, hub[1] * SCALE, 1,
];
const toScene = (p) => xfp(A, p[0], p[1], p[2]);

const STATIONS = rotors.map((r) => toScene([r.c[0], r.c[1], r.top[2] + 0.006]).map((v) => +v.toFixed(4)));

// ---- synthesize the flattened subassembly placements ----
/** Rotation by `ang` about the CAD Z axis through the hub. */
function rzHub(ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    hub[0] - c * hub[0] + s * hub[1], hub[1] - s * hub[0] - c * hub[1], 0, 1,
  ];
}
for (const spec of INSTANCED) {
  if (!spec.pinwheel) continue;
  const p = parts.get(spec.group);
  if (!p) continue;
  const flat = p.roots.every((m) => m.every((v, i) => Math.abs(v - IDENT[i]) < 1e-9));
  if (!flat) continue;   // a future export that keeps the transforms needs no help
  const n = p.roots.length;
  p.roots = p.roots.map((_, k) => rzHub((k * 2 * Math.PI) / n));
  console.log(`${spec.group}: flattened subassembly, ${n} placements synthesized at ${(360 / n).toFixed(0)}deg`);
}

/** Metres <-> scene units, for writing error budgets in real millimetres. */
const MM = SCALE / 1000;
console.log(`scale: 1 scene unit = ${(1 / SCALE).toFixed(4)} m  (station radius)`);

// ---------------------------------------------------------------------------
// Mesh welding: Onshape emits one primitive per face; stitch them back
// ---------------------------------------------------------------------------
const weldCache = new Map();

function weldMesh(meshIdx) {
  const hit = weldCache.get(meshIdx);
  if (hit) return hit;
  const prims = gltf.meshes[meshIdx].primitives || [];
  const map = new Map();
  const verts = [];
  const tris = [];
  const tmat = [];
  const key = (x, y, z) => `${Math.round(x * 2e5)},${Math.round(y * 2e5)},${Math.round(z * 2e5)}`;
  for (const p of prims) {
    if (p.mode !== undefined && p.mode !== 4) continue;
    const pos = accessor(p.attributes.POSITION);
    const idx = p.indices !== undefined ? accessor(p.indices) : null;
    const count = idx ? idx.length : pos.length / 3;
    const mat = p.material ?? -1;
    const remap = new Map();
    const vid = (i) => {
      let r = remap.get(i);
      if (r !== undefined) return r;
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const k = key(x, y, z);
      let w = map.get(k);
      if (w === undefined) {
        w = verts.length / 3;
        verts.push(x, y, z);
        map.set(k, w);
      }
      remap.set(i, w);
      return w;
    };
    for (let i = 0; i < count; i += 3) {
      const a = vid(idx ? idx[i] : i);
      const b = vid(idx ? idx[i + 1] : i + 1);
      const c = vid(idx ? idx[i + 2] : i + 2);
      if (a !== b && b !== c && a !== c) { tris.push(a, b, c); tmat.push(mat); }
    }
  }
  const out = {
    pos: Float64Array.from(verts),
    tri: Int32Array.from(tris),
    mat: Int32Array.from(tmat),
  };
  weldCache.set(meshIdx, out);
  return out;
}

// ---------------------------------------------------------------------------
// Quadric error decimation (Garland & Heckbert, with constraint planes)
// ---------------------------------------------------------------------------
/**
 * Collapses edges cheapest-first until either the triangle budget is met or
 * the cheapest remaining collapse would move the surface further than `eps`.
 * Boundary loops and material seams get heavy constraint quadrics so they
 * stay put; every collapse is rejected if it would flip a face normal.
 */
function decimate(mesh, eps, budget) {
  const V = mesh.pos.length / 3;
  const F = mesh.tri.length / 3;
  const pos = Float64Array.from(mesh.pos);
  const tri = Int32Array.from(mesh.tri);
  const tmat = mesh.mat;
  const alive = new Uint8Array(V).fill(1);
  const fAlive = new Uint8Array(F).fill(1);
  const quad = new Float64Array(V * 10);
  // Plane quadrics are area-weighted (large faces should dominate), which
  // makes the raw quadric error an area x distance^2 quantity. Tracking the
  // weight lets the cost be divided back down to a MEAN SQUARED DISTANCE, so
  // `eps` is a real tolerance in metres and not a scale-dependent magic number.
  const warea = new Float64Array(V);
  const vf = new Array(V);
  for (let i = 0; i < V; i++) vf[i] = [];

  const fNorm = new Float64Array(F * 3);
  const fArea = new Float64Array(F);

  const faceGeom = (f) => {
    const a = tri[f * 3] * 3, b = tri[f * 3 + 1] * 3, c = tri[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-18) return null;
    nx /= l; ny /= l; nz /= l;
    return { nx, ny, nz, area: l / 2, d: -(nx * pos[a] + ny * pos[a + 1] + nz * pos[a + 2]) };
  };

  // `surf` marks real surface planes: only those enter the normalizing weight,
  // so a boundary or seam constraint raises a vertex's cost instead of diluting it
  const addPlane = (v, nx, ny, nz, d, w, surf) => {
    const o = v * 10;
    quad[o] += w * nx * nx; quad[o + 1] += w * nx * ny; quad[o + 2] += w * nx * nz; quad[o + 3] += w * nx * d;
    quad[o + 4] += w * ny * ny; quad[o + 5] += w * ny * nz; quad[o + 6] += w * ny * d;
    quad[o + 7] += w * nz * nz; quad[o + 8] += w * nz * d;
    quad[o + 9] += w * d * d;
    if (surf) warea[v] += w;
  };

  for (let f = 0; f < F; f++) {
    const g = faceGeom(f);
    if (!g) { fAlive[f] = 0; continue; }
    fNorm[f * 3] = g.nx; fNorm[f * 3 + 1] = g.ny; fNorm[f * 3 + 2] = g.nz;
    fArea[f] = g.area;
    for (let k = 0; k < 3; k++) {
      const v = tri[f * 3 + k];
      vf[v].push(f);
      addPlane(v, g.nx, g.ny, g.nz, g.d, g.area, true);
    }
  }

  // ---- edge map: boundary + material-seam constraints ----
  const edgeFaces = new Map();
  const ekey = (a, b) => (a < b ? a * V + b : b * V + a);
  for (let f = 0; f < F; f++) {
    if (!fAlive[f]) continue;
    for (let e = 0; e < 3; e++) {
      const k = ekey(tri[f * 3 + e], tri[f * 3 + ((e + 1) % 3)]);
      const arr = edgeFaces.get(k);
      if (arr) arr.push(f); else edgeFaces.set(k, [f]);
    }
  }
  for (const [k, fs] of edgeFaces) {
    const seam = fs.length === 1 || (fs.length === 2 && tmat[fs[0]] !== tmat[fs[1]]);
    if (!seam) continue;
    const a = Math.floor(k / V), b = k % V;
    const ex = pos[b * 3] - pos[a * 3], ey = pos[b * 3 + 1] - pos[a * 3 + 1], ez = pos[b * 3 + 2] - pos[a * 3 + 2];
    const el = Math.hypot(ex, ey, ez) || 1;
    for (const f of fs) {
      // plane containing the edge, perpendicular to the face
      let nx = fNorm[f * 3 + 1] * (ez / el) - fNorm[f * 3 + 2] * (ey / el);
      let ny = fNorm[f * 3 + 2] * (ex / el) - fNorm[f * 3] * (ez / el);
      let nz = fNorm[f * 3] * (ey / el) - fNorm[f * 3 + 1] * (ex / el);
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const d = -(nx * pos[a * 3] + ny * pos[a * 3 + 1] + nz * pos[a * 3 + 2]);
      const w = fArea[f] * 240;
      addPlane(a, nx, ny, nz, d, w, false);
      addPlane(b, nx, ny, nz, d, w, false);
    }
  }

  // ---- per-vertex material signature: never merge across a colour seam ----
  const vmat = new Int32Array(V).fill(-2);
  const vmatMixed = new Uint8Array(V);
  for (let f = 0; f < F; f++) {
    if (!fAlive[f]) continue;
    for (let k = 0; k < 3; k++) {
      const v = tri[f * 3 + k];
      if (vmat[v] === -2) vmat[v] = tmat[f];
      else if (vmat[v] !== tmat[f]) vmatMixed[v] = 1;
    }
  }

  const qerr = (o, x, y, z) => (
    quad[o] * x * x + 2 * quad[o + 1] * x * y + 2 * quad[o + 2] * x * z + 2 * quad[o + 3] * x
    + quad[o + 4] * y * y + 2 * quad[o + 5] * y * z + 2 * quad[o + 6] * y
    + quad[o + 7] * z * z + 2 * quad[o + 8] * z
    + quad[o + 9]
  );

  const sum = new Float64Array(10);
  /** Best merge point for (a,b) and its error; solves the 3x3, else samples. */
  function best(a, b) {
    const oa = a * 10, ob = b * 10;
    for (let i = 0; i < 10; i++) sum[i] = quad[oa + i] + quad[ob + i];
    const m00 = sum[0], m01 = sum[1], m02 = sum[2];
    const m11 = sum[4], m12 = sum[5], m22 = sum[7];
    const det = m00 * (m11 * m22 - m12 * m12) - m01 * (m01 * m22 - m12 * m02) + m02 * (m01 * m12 - m11 * m02);
    let x, y, z;
    if (Math.abs(det) > 1e-14) {
      const b0 = -sum[3], b1 = -sum[6], b2 = -sum[8];
      x = (b0 * (m11 * m22 - m12 * m12) - m01 * (b1 * m22 - m12 * b2) + m02 * (b1 * m12 - m11 * b2)) / det;
      y = (m00 * (b1 * m22 - m12 * b2) - b0 * (m01 * m22 - m12 * m02) + m02 * (m01 * b2 - b1 * m02)) / det;
      z = (m00 * (m11 * b2 - b1 * m12) - m01 * (m01 * b2 - b1 * m02) + b0 * (m01 * m12 - m11 * m02)) / det;
    } else {
      x = (pos[a * 3] + pos[b * 3]) / 2;
      y = (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2;
      z = (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2;
    }
    const saveQ = quad.subarray(oa, oa + 10);
    const keep = Float64Array.from(saveQ);
    quad.set(sum, oa);
    let err = qerr(oa, x, y, z);
    // a solved point far outside the edge is a sign of a degenerate system
    const ex = pos[b * 3] - pos[a * 3], ey = pos[b * 3 + 1] - pos[a * 3 + 1], ez = pos[b * 3 + 2] - pos[a * 3 + 2];
    const elen = Math.hypot(ex, ey, ez);
    if (Math.hypot(x - pos[a * 3], y - pos[a * 3 + 1], z - pos[a * 3 + 2]) > elen * 3 + 1e-9) {
      for (const cand of [[pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]], [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]],
        [(pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2]]) {
        const e2 = qerr(oa, cand[0], cand[1], cand[2]);
        if (e2 < err) { err = e2; x = cand[0]; y = cand[1]; z = cand[2]; }
      }
    }
    quad.set(keep, oa);
    return { x, y, z, err: Math.max(0, err) / (warea[a] + warea[b] + 1e-30) };
  }

  // ---- binary heap over candidate collapses ----
  const hCost = [0];
  const hA = [0], hB = [0], hX = [0], hY = [0], hZ = [0], hVer = [0];
  let hn = 0;
  const ver = new Int32Array(V);
  const push = (c, a, b, x, y, z, v) => {
    let i = ++hn;
    hCost[i] = c; hA[i] = a; hB[i] = b; hX[i] = x; hY[i] = y; hZ[i] = z; hVer[i] = v;
    while (i > 1) {
      const p = i >> 1;
      if (hCost[p] <= hCost[i]) break;
      for (const arr of [hCost, hA, hB, hX, hY, hZ, hVer]) { const t = arr[p]; arr[p] = arr[i]; arr[i] = t; }
      i = p;
    }
  };
  const pop = () => {
    const top = { c: hCost[1], a: hA[1], b: hB[1], x: hX[1], y: hY[1], z: hZ[1], v: hVer[1] };
    for (const arr of [hCost, hA, hB, hX, hY, hZ, hVer]) arr[1] = arr[hn];
    hn--;
    let i = 1;
    for (;;) {
      const l = i * 2, r = l + 1;
      let s = i;
      if (l <= hn && hCost[l] < hCost[s]) s = l;
      if (r <= hn && hCost[r] < hCost[s]) s = r;
      if (s === i) break;
      for (const arr of [hCost, hA, hB, hX, hY, hZ, hVer]) { const t = arr[s]; arr[s] = arr[i]; arr[i] = t; }
      i = s;
    }
    return top;
  };

  const canCollapse = (a, b) => {
    // colour seams stay crisp: only merge vertices of the same material class
    if (vmatMixed[a] !== vmatMixed[b]) return false;
    if (!vmatMixed[a] && vmat[a] !== vmat[b]) return false;
    return true;
  };

  const offer = (a, b) => {
    if (a === b || !alive[a] || !alive[b] || !canCollapse(a, b)) return;
    const r = best(a, b);
    push(r.err, a, b, r.x, r.y, r.z, ver[a] + ver[b]);
  };

  const epsSq = eps * eps;
  let faces = 0;
  for (let f = 0; f < F; f++) if (fAlive[f]) faces++;

  /** Re-seed the heap from the mesh as it stands right now. */
  const seed = () => {
    hn = 0;
    const seen = new Set();
    for (let f = 0; f < F; f++) {
      if (!fAlive[f]) continue;
      for (let e = 0; e < 3; e++) {
        const a = tri[f * 3 + e], b = tri[f * 3 + ((e + 1) % 3)];
        const k = ekey(a, b);
        if (seen.has(k)) continue;
        seen.add(k);
        offer(a, b);
      }
    }
  };

  const nbr = new Set();
  // A rejected collapse leaves the heap for good, so the budget can stall
  // above target; re-seeding from the current topology recovers those
  // candidates. If a round makes no progress at all it is the QUALITY guards
  // that are blocking — a threaded McMaster part genuinely cannot reach 150
  // triangles without slivers — so drop them and take the budget instead of
  // shipping a part nobody asked to be exact.
  let round = 0;
  while (round++ < 14) {
    const before = faces;
    seed();
    collapsePass();
    if (faces <= budget) break;
    // No progress means every remaining collapse would damage the surface.
    // Stopping ABOVE the budget is the right answer: a part that refuses to
    // simplify is telling you it has no redundancy left, and forcing it
    // anyway inverts faces into the shards this guard exists to prevent.
    if (faces >= before) break;
  }

  function collapsePass() {
  while (hn > 0 && (faces > budget || hCost[1] <= epsSq)) {
    const t = pop();
    const { a, b } = t;
    if (!alive[a] || !alive[b] || ver[a] + ver[b] !== t.v) continue;
    if (faces <= budget && t.c > epsSq) break;

    // ---- validity guard on every face that survives the collapse ----
    // Two ways a collapse ruins a mesh: it can turn a face inside out, and it
    // can squash a face into a sliver. Slivers are the worse of the two — they
    // survive every error metric (a degenerate triangle has almost no area, so
    // it barely moves the surface) while shading as bright spikes, because a
    // crease-split normal on a needle points nowhere sensible. Both are cheap
    // to test here and impossible to fix later.
    let ok = true;
    for (const v of [a, b]) {
      for (const f of vf[v]) {
        if (!fAlive[f]) continue;
        const i0 = tri[f * 3], i1 = tri[f * 3 + 1], i2 = tri[f * 3 + 2];
        // the face collapses away entirely — nothing to check
        if ((i0 === a || i0 === b) + (i1 === a || i1 === b) + (i2 === a || i2 === b) >= 2) continue;
        const px = (i) => (i === a || i === b ? t.x : pos[i * 3]);
        const py = (i) => (i === a || i === b ? t.y : pos[i * 3 + 1]);
        const pz = (i) => (i === a || i === b ? t.z : pos[i * 3 + 2]);
        const ux = px(i1) - px(i0), uy = py(i1) - py(i0), uz = pz(i1) - pz(i0);
        const vx = px(i2) - px(i0), vy = py(i2) - py(i0), vz = pz(i2) - pz(i0);
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-16) { ok = false; break; }
        if ((nx * fNorm[f * 3] + ny * fNorm[f * 3 + 1] + nz * fNorm[f * 3 + 2]) / l < 0.25) { ok = false; break; }
        // sliver test: shortest altitude over longest edge. 2A/L is the
        // altitude onto the longest edge, so 2A/L^2 is that ratio directly.
        const wx = px(i2) - px(i1), wy = py(i2) - py(i1), wz = pz(i2) - pz(i1);
        const lMax = Math.max(ux * ux + uy * uy + uz * uz, vx * vx + vy * vy + vz * vz, wx * wx + wy * wy + wz * wz);
        if (l / lMax < 0.03) { ok = false; break; }
      }
      if (!ok) break;
    }
    if (!ok) continue;

    // ---- commit: b folds into a ----
    pos[a * 3] = t.x; pos[a * 3 + 1] = t.y; pos[a * 3 + 2] = t.z;
    const oa = a * 10, ob = b * 10;
    for (let i = 0; i < 10; i++) quad[oa + i] += quad[ob + i];
    warea[a] += warea[b];
    if (vmatMixed[b]) vmatMixed[a] = 1;
    alive[b] = 0;
    ver[a]++; ver[b]++;

    for (const f of vf[b]) {
      if (!fAlive[f]) continue;
      const i0 = tri[f * 3], i1 = tri[f * 3 + 1], i2 = tri[f * 3 + 2];
      if (i0 === a || i1 === a || i2 === a) { fAlive[f] = 0; faces--; continue; }
      for (let k = 0; k < 3; k++) if (tri[f * 3 + k] === b) tri[f * 3 + k] = a;
      vf[a].push(f);
    }
    vf[b].length = 0;

    // refresh face normals + neighbour candidates around the new vertex
    nbr.clear();
    const keep = [];
    for (const f of vf[a]) {
      if (!fAlive[f]) continue;
      const g = faceGeom(f);
      if (!g) { fAlive[f] = 0; faces--; continue; }
      fNorm[f * 3] = g.nx; fNorm[f * 3 + 1] = g.ny; fNorm[f * 3 + 2] = g.nz;
      fArea[f] = g.area;
      keep.push(f);
      for (let k = 0; k < 3; k++) {
        const v = tri[f * 3 + k];
        if (v !== a && alive[v]) nbr.add(v);
      }
    }
    vf[a] = keep;
    for (const v of nbr) { ver[v]++; offer(a, v); }
  }
  }

  // ---- compact ----
  const remap = new Int32Array(V).fill(-1);
  const outPos = [];
  for (let v = 0; v < V; v++) {
    if (!alive[v]) continue;
    remap[v] = outPos.length / 3;
    outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
  }
  const outTri = [], outMat = [];
  for (let f = 0; f < F; f++) {
    if (!fAlive[f]) continue;
    const a = remap[tri[f * 3]], b = remap[tri[f * 3 + 1]], c = remap[tri[f * 3 + 2]];
    if (a < 0 || b < 0 || c < 0 || a === b || b === c || a === c) continue;
    outTri.push(a, b, c);
    outMat.push(tmat[f]);
  }
  return { pos: Float64Array.from(outPos), tri: Int32Array.from(outTri), mat: Int32Array.from(outMat) };
}

// ---------------------------------------------------------------------------
// Part colours: Onshape appearances -> a small palette
// ---------------------------------------------------------------------------
const MATS = gltf.materials || [];

/**
 * Every distinct Onshape appearance becomes one palette slot, so a vertex
 * carries a single byte instead of three colour bytes plus a packed
 * metal/roughness byte. The assembly only uses ~26 appearances.
 */
const palette = [];
const palIndex = new Map();
function palSlot(mi) {
  let s = palIndex.get(mi);
  if (s !== undefined) return s;
  const l = matLook(mi);
  s = palette.length;
  palette.push([+l.r.toFixed(4), +l.g.toFixed(4), +l.b.toFixed(4)]);
  palIndex.set(mi, s);
  return s;
}

function matLook(mi) {
  const m = MATS[mi];
  const bc = (m && m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor) || [0.55, 0.57, 0.6, 1];
  return { r: bc[0], g: bc[1], b: bc[2] };
}

// ---------------------------------------------------------------------------
// Assemble each group: decimate every unique mesh once, stamp its instances
// ---------------------------------------------------------------------------
/**
 * Per-group tuning. `eps` is the decimation error budget in MILLIMETRES of
 * real hardware; `budget` caps the triangles stored for ONE instance.
 * `minPart` drops fasteners below that diagonal (mm) — an M3 socket cap is
 * four screen pixels and 20k triangles.
 */
const TUNE = {
  frame: { eps: 0.25, budget: 60000, minPart: 6 },
  arm: { eps: 0.25, budget: 46000, minPart: 8 },
  leg: { eps: 0.3, budget: 9000, minPart: 8 },
  winch: { eps: 0.25, budget: 26000, minPart: 6 },
  pixhawk: { eps: 0.2, budget: 16000, minPart: 3 },
  battery: { eps: 0.3, budget: 12000, minPart: 6 },
  prop: { eps: 0.15, budget: 4000, minPart: 2 },
};

const decCache = new Map();
function decimatedMesh(meshIdx, eps, budget) {
  const key = `${meshIdx}|${eps.toFixed(7)}|${budget}`;
  const hit = decCache.get(key);
  if (hit) return hit;
  const out = decimate(weldMesh(meshIdx), eps, budget);
  decCache.set(key, out);
  return out;
}

/** Diagonal of a mesh's bounding box, in millimetres. */
function meshDiagMM(meshIdx) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of gltf.meshes[meshIdx].primitives || []) {
    const a = gltf.accessors[p.attributes.POSITION];
    if (!a.min) continue;
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.min[k]); mx[k] = Math.max(mx[k], a.max[k]); }
  }
  return Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * 1000;
}

/** Group geometry in its own frame, scaled to scene units. */
const built = new Map();
for (const [group, p] of parts) {
  const tune = TUNE[group];
  if (!tune) throw new Error(`no tuning for group ${group}`);
  // Triangles are spent on SCREEN AREA, not on how finely Onshape happened to
  // tessellate: each part's cap is its share of the group's summed footprint.
  // Otherwise one threaded McMaster latch eats the entire arm budget.
  const keepParts = p.local.filter((i) => meshDiagMM(i.mesh) >= tune.minPart);
  const skipped = p.local.length - keepParts.length;
  const foot = keepParts.map((i) => meshDiagMM(i.mesh) ** 2);
  const footSum = foot.reduce((a, b) => a + b, 0) || 1;
  const srcTris = keepParts.reduce((s, i) => s + weldMesh(i.mesh).tri.length / 3, 0);

  // The per-part cap keeps any one over-tessellated McMaster part from eating
  // the group, but the group total is what actually ships — so relax the
  // tolerance and re-decimate until the whole group fits its budget.
  let mm = tune.eps;
  let out = null;
  for (let attempt = 0; attempt < 11; attempt++) {
    const eps = mm / 1000;                              // millimetres -> metres
    const pos = [], tri = [], mat = [];
    for (let pi = 0; pi < keepParts.length; pi++) {
      const inst = keepParts[pi];
        // never squeeze a part below the floor: a 60-triangle bracket is not a
      // cheaper bracket, it is a handful of spikes
      const cap = Math.max(250, Math.round((1.6 * tune.budget * foot[pi]) / footSum));
      const d = decimatedMesh(inst.mesh, eps, cap);
      const base = pos.length / 3;
      for (let v = 0; v < d.pos.length / 3; v++) {
        // group-local frame, in SCENE units; the instance matrix carries the
        // orientation and undoes this scale
        const q = xfp(inst.m, d.pos[v * 3], d.pos[v * 3 + 1], d.pos[v * 3 + 2]);
        pos.push(q[0] * SCALE, q[1] * SCALE, q[2] * SCALE);
      }
      for (let f = 0; f < d.tri.length / 3; f++) {
        tri.push(base + d.tri[f * 3], base + d.tri[f * 3 + 1], base + d.tri[f * 3 + 2]);
        mat.push(d.mat[f]);
      }
    }
    out = { pos, tri, mat, mm };
    if (tri.length / 3 <= tune.budget * 1.1) break;
    mm *= 1.6;
  }

  built.set(group, {
    pos: Float64Array.from(out.pos), tri: Int32Array.from(out.tri), mat: Int32Array.from(out.mat),
    roots: p.roots,
  });
  console.log(`${group}: ${keepParts.length} parts (${skipped} dropped as fasteners), ${srcTris} -> ${out.tri.length / 3} tris @ ${out.mm.toFixed(2)}mm, x${p.roots.length}`);
}

// ---------------------------------------------------------------------------
// Instance matrices: group-local (scene units) -> scene
// ---------------------------------------------------------------------------
// local point q was stored as SCALE * (M_root^-1 . p_worldCAD), so
//   p_scene = A . M_root . (q / SCALE)  =>  matrix = A . M_root . scale(1/SCALE)
function instanceMatrix(root) {
  const m = mul(A, root);
  const inv = 1 / SCALE;
  return [
    m[0] * inv, m[1] * inv, m[2] * inv, 0,
    m[4] * inv, m[5] * inv, m[6] * inv, 0,
    m[8] * inv, m[9] * inv, m[10] * inv, 0,
    m[12], m[13], m[14], 1,
  ].map((v) => +v.toFixed(6));
}

// ---------------------------------------------------------------------------
// Crease-split vertex normals + per-vertex colour
// ---------------------------------------------------------------------------
const CREASE = Math.cos((34 * Math.PI) / 180);

/**
 * Rebuilds the vertex stream: one vertex per (position, smoothing group,
 * material). Face normals are area-weighted into clusters that stay within
 * the crease angle, so a fillet is smooth and the plate edge beside it is
 * a hard line.
 */
function splitNormals(g) {
  const V = g.pos.length / 3;
  const F = g.tri.length / 3;
  const fn = new Float64Array(F * 3);
  const fa = new Float64Array(F);
  for (let f = 0; f < F; f++) {
    const a = g.tri[f * 3] * 3, b = g.tri[f * 3 + 1] * 3, c = g.tri[f * 3 + 2] * 3;
    const ux = g.pos[b] - g.pos[a], uy = g.pos[b + 1] - g.pos[a + 1], uz = g.pos[b + 2] - g.pos[a + 2];
    const vx = g.pos[c] - g.pos[a], vy = g.pos[c + 1] - g.pos[a + 1], vz = g.pos[c + 2] - g.pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1e-18;
    fn[f * 3] = nx / l; fn[f * 3 + 1] = ny / l; fn[f * 3 + 2] = nz / l;
    fa[f] = l / 2;
  }

  const vf = new Array(V);
  for (let i = 0; i < V; i++) vf[i] = [];
  for (let f = 0; f < F; f++) for (let k = 0; k < 3; k++) vf[g.tri[f * 3 + k]].push(f);

  const outPos = [], outNrm = [], outPal = [];
  const outTri = new Int32Array(F * 3);
  for (let v = 0; v < V; v++) {
    // greedy clustering of incident faces by normal + material
    const clusters = [];
    for (const f of vf[v]) {
      const nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2];
      let hit = null;
      for (const c of clusters) {
        if (c.mat !== g.mat[f]) continue;
        const l = Math.hypot(c.nx, c.ny, c.nz) || 1;
        if ((nx * c.nx + ny * c.ny + nz * c.nz) / l >= CREASE) { hit = c; break; }
      }
      if (!hit) { hit = { nx: 0, ny: 0, nz: 0, mat: g.mat[f], faces: [] }; clusters.push(hit); }
      hit.nx += nx * fa[f]; hit.ny += ny * fa[f]; hit.nz += nz * fa[f];
      hit.faces.push(f);
    }
    for (const c of clusters) {
      const l = Math.hypot(c.nx, c.ny, c.nz) || 1;
      const id = outPos.length / 3;
      outPos.push(g.pos[v * 3], g.pos[v * 3 + 1], g.pos[v * 3 + 2]);
      outNrm.push(c.nx / l, c.ny / l, c.nz / l);
      outPal.push(palSlot(c.mat));
      for (const f of c.faces) {
        for (let k = 0; k < 3; k++) if (g.tri[f * 3 + k] === v) outTri[f * 3 + k] = id;
      }
    }
  }
  return {
    pos: Float64Array.from(outPos),
    nrm: Float64Array.from(outNrm),
    pal: Uint8Array.from(outPal),
    tri: outTri,
  };
}

for (const [group, g] of built) built.set(group, Object.assign(splitNormals(g), { roots: g.roots }));

// ---------------------------------------------------------------------------
// Ambient occlusion bake: BVH over the fully assembled aircraft
// ---------------------------------------------------------------------------
/**
 * Every instance of every group, expanded into one scene-space soup. Group
 * geometry is stored as SCALE * (local metres), so undo the scale and let the
 * instance matrix carry it back.
 */
const sceneTris = [];
for (const [, g] of built) {
  for (const root of g.roots) {
    const m = mul(A, root);
    const P = new Float64Array(g.pos.length);
    for (let v = 0; v < g.pos.length / 3; v++) {
      const q = xfp(m, g.pos[v * 3] / SCALE, g.pos[v * 3 + 1] / SCALE, g.pos[v * 3 + 2] / SCALE);
      P[v * 3] = q[0]; P[v * 3 + 1] = q[1]; P[v * 3 + 2] = q[2];
    }
    for (let f = 0; f < g.tri.length / 3; f++) {
      const a = g.tri[f * 3] * 3, b = g.tri[f * 3 + 1] * 3, c = g.tri[f * 3 + 2] * 3;
      sceneTris.push(
        P[a], P[a + 1], P[a + 2],
        P[b], P[b + 1], P[b + 2],
        P[c], P[c + 1], P[c + 2],
      );
    }
  }
}
const TRI = Float64Array.from(sceneTris);
const NT = TRI.length / 9;
console.log(`AO scene: ${NT} triangles assembled`);

/** Median-split BVH; leaves hold <= 8 triangles. */
const bvhIdx = new Int32Array(NT);
for (let i = 0; i < NT; i++) bvhIdx[i] = i;
const bvh = { mn: [], mx: [], left: [], right: [], start: [], count: [] };
function triBox(i) {
  const o = i * 9;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < 3; k++) {
    for (let c = 0; c < 3; c++) {
      const v = TRI[o + k * 3 + c];
      if (v < mn[c]) mn[c] = v;
      if (v > mx[c]) mx[c] = v;
    }
  }
  return { mn, mx };
}
const triCtr = new Float64Array(NT * 3);
for (let i = 0; i < NT; i++) {
  const o = i * 9;
  for (let c = 0; c < 3; c++) triCtr[i * 3 + c] = (TRI[o + c] + TRI[o + 3 + c] + TRI[o + 6 + c]) / 3;
}
function buildBVH(start, count) {
  const node = bvh.mn.length;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = start; i < start + count; i++) {
    const b = triBox(bvhIdx[i]);
    for (let c = 0; c < 3; c++) { if (b.mn[c] < mn[c]) mn[c] = b.mn[c]; if (b.mx[c] > mx[c]) mx[c] = b.mx[c]; }
  }
  bvh.mn.push(mn); bvh.mx.push(mx);
  bvh.left.push(-1); bvh.right.push(-1); bvh.start.push(start); bvh.count.push(count);
  if (count <= 8) return node;
  let axis = 0;
  const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  if (ext[1] > ext[axis]) axis = 1;
  if (ext[2] > ext[axis]) axis = 2;
  const slice = Array.from(bvhIdx.subarray(start, start + count));
  slice.sort((a, b) => triCtr[a * 3 + axis] - triCtr[b * 3 + axis]);
  bvhIdx.set(slice, start);
  const half = count >> 1;
  bvh.count[node] = 0;
  bvh.left[node] = buildBVH(start, half);
  bvh.right[node] = buildBVH(start + half, count - half);
  return node;
}
buildBVH(0, NT);
console.log(`AO bvh: ${bvh.mn.length} nodes`);

const stack = new Int32Array(64);
/** Any-hit ray query against the assembled aircraft. */
function occluded(ox, oy, oz, dx, dy, dz, tmax) {
  const ix = 1 / (dx || 1e-20), iy = 1 / (dy || 1e-20), iz = 1 / (dz || 1e-20);
  let sp = 0;
  stack[sp++] = 0;
  while (sp) {
    const n = stack[--sp];
    const mn = bvh.mn[n], mx = bvh.mx[n];
    let t0 = (mn[0] - ox) * ix, t1 = (mx[0] - ox) * ix;
    let lo = Math.min(t0, t1), hi = Math.max(t0, t1);
    t0 = (mn[1] - oy) * iy; t1 = (mx[1] - oy) * iy;
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    t0 = (mn[2] - oz) * iz; t1 = (mx[2] - oz) * iz;
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    if (hi < Math.max(lo, 0) || lo > tmax) continue;
    if (bvh.count[n]) {
      for (let i = bvh.start[n]; i < bvh.start[n] + bvh.count[n]; i++) {
        const o = bvhIdx[i] * 9;
        const e1x = TRI[o + 3] - TRI[o], e1y = TRI[o + 4] - TRI[o + 1], e1z = TRI[o + 5] - TRI[o + 2];
        const e2x = TRI[o + 6] - TRI[o], e2y = TRI[o + 7] - TRI[o + 1], e2z = TRI[o + 8] - TRI[o + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-12 && det < 1e-12) continue;
        const inv = 1 / det;
        const tx = ox - TRI[o], ty = oy - TRI[o + 1], tz = oz - TRI[o + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 1e-5 && t < tmax) return true;
      }
    } else {
      stack[sp++] = bvh.left[n];
      stack[sp++] = bvh.right[n];
    }
  }
  return false;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** AO reach: a third of a station radius — enough to catch every cavity. */
const AO_DIST = 0.33;
const AO_RAYS = 28;
for (const [group, g] of built) {
  const rnd = mulberry32(0x5eed + group.length * 977);
  const V = g.pos.length / 3;
  const ao = new Float64Array(V);
  // AO is sampled on the first instance and shared: the arms, legs, winches
  // and props are four-fold symmetric, so their occlusion is too
  const m = mul(A, g.roots[0]);
  const s = 1 / SCALE;
  for (let v = 0; v < V; v++) {
    const p = xfp(m, g.pos[v * 3] * s, g.pos[v * 3 + 1] * s, g.pos[v * 3 + 2] * s);
    // normals transform by the rotation part only (rigid + uniform scale)
    const nx0 = g.nrm[v * 3], ny0 = g.nrm[v * 3 + 1], nz0 = g.nrm[v * 3 + 2];
    const n = [
      m[0] * nx0 + m[4] * ny0 + m[8] * nz0,
      m[1] * nx0 + m[5] * ny0 + m[9] * nz0,
      m[2] * nx0 + m[6] * ny0 + m[10] * nz0,
    ];
    const nl = Math.hypot(n[0], n[1], n[2]) || 1;
    n[0] /= nl; n[1] /= nl; n[2] /= nl;
    // tangent frame
    const up = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let tx = up[1] * n[2] - up[2] * n[1], ty = up[2] * n[0] - up[0] * n[2], tz = up[0] * n[1] - up[1] * n[0];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const bx = n[1] * tz - n[2] * ty, by = n[2] * tx - n[0] * tz, bz = n[0] * ty - n[1] * tx;
    const ox = p[0] + n[0] * 0.0015, oy = p[1] + n[1] * 0.0015, oz = p[2] + n[2] * 0.0015;
    let open = 0;
    for (let r = 0; r < AO_RAYS; r++) {
      // cosine-weighted hemisphere, stratified in the azimuth
      const u1 = (r + rnd()) / AO_RAYS;
      const u2 = rnd();
      const rr = Math.sqrt(u2);
      const phi = 2 * Math.PI * u1;
      const cx = Math.cos(phi) * rr, cy = Math.sin(phi) * rr, cz = Math.sqrt(Math.max(0, 1 - u2));
      const dx = tx * cx + bx * cy + n[0] * cz;
      const dy = ty * cx + by * cy + n[1] * cz;
      const dz = tz * cx + bz * cy + n[2] * cz;
      if (!occluded(ox, oy, oz, dx, dy, dz, AO_DIST)) open++;
    }
    ao[v] = open / AO_RAYS;
  }
  g.ao = ao;
  console.log(`AO ${group}: ${V} verts`);
}

// ---------------------------------------------------------------------------
// Quantize + emit
// ---------------------------------------------------------------------------
/**
 * Emits ONE binary asset rather than base64 inside a JS module. Base64 costs a
 * third in size and, worse, has to be decoded on the main thread before the
 * first frame; a .bin is fetched in parallel, compresses properly over the
 * wire, and its arrays are handed to the GPU as-is.
 *
 * Vertex data stays QUANTIZED all the way to the vertex shader — int16
 * positions dequantized by a per-group scale/offset, int8 normals, uint8
 * colour and occlusion. Nothing is expanded to Float32 on the CPU.
 */
const chunks = [];
let cursor = 0;
function put(ta) {
  // every view is read back as a typed array, so keep 4-byte alignment
  const pad = (4 - (cursor % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
  const off = cursor;
  chunks.push(Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength));
  cursor += ta.byteLength;
  return off;
}

function packGroup(g) {
  const V = g.pos.length / 3;
  const T = g.tri.length / 3;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < V; v++) {
    for (let c = 0; c < 3; c++) {
      const x = g.pos[v * 3 + c];
      if (x < mn[c]) mn[c] = x;
      if (x > mx[c]) mx[c] = x;
    }
  }
  const ext = mx.map((v, c) => Math.max(1e-6, v - mn[c]));
  const q = new Int16Array(V * 3);
  const nb = new Int8Array(V * 3);
  const cb = new Uint8Array(V * 3);
  const ab = new Uint8Array(V);
  for (let v = 0; v < V; v++) {
    const look = palette[g.pal[v]] || [0.5, 0.5, 0.5];
    for (let c = 0; c < 3; c++) {
      q[v * 3 + c] = Math.round(((g.pos[v * 3 + c] - mn[c]) / ext[c]) * 65534 - 32767);
      nb[v * 3 + c] = Math.max(-127, Math.min(127, Math.round(g.nrm[v * 3 + c] * 127)));
      cb[v * 3 + c] = Math.max(0, Math.min(255, Math.round(look[c] * 255)));
    }
    ab[v] = Math.max(0, Math.min(255, Math.round(g.ao[v] * 255)));
  }
  const wide = V > 65535;
  const ib = wide ? new Uint32Array(g.tri) : Uint16Array.from(g.tri);
  return {
    v: V,
    n: T,
    // p = q * scale + offset, applied in the vertex shader
    qs: ext.map((x) => x / 65534),
    qo: mn.map((x, c) => x + ext[c] / 2),
    w: wide ? 1 : 0,
    p: put(q), nr: put(nb), c: put(cb), a: put(ab), i: put(ib),
  };
}

const packedGroups = {};
const instances = {};
let totalV = 0, totalT = 0, drawT = 0;
for (const [group, g] of built) {
  packedGroups[group] = packGroup(g);
  totalV += g.pos.length / 3;
  totalT += g.tri.length / 3;
  drawT += (g.tri.length / 3) * g.roots.length;
  instances[group] = g.roots.map((root, i) => ({ name: `${group}${i}`, m: instanceMatrix(root) }));
}

const stations = STATIONS;
// The payload is read back as Int16/Uint32 views straight onto the downloaded
// ArrayBuffer, so its start has to be 4-byte aligned. The 8-byte magic+length
// prefix already is; pad the JSON (with spaces, still valid JSON) so the header
// is too, otherwise every view construction throws on a misaligned offset.
let headerJson = JSON.stringify({ groups: packedGroups, instances });
while (headerJson.length % 4 !== 0) headerJson += " ";
const header = Buffer.from(headerJson, "utf8");
const head = Buffer.alloc(8);
head.write("LBS1", 0, "ascii");
head.writeUInt32LE(header.length, 4);
const asset = Buffer.concat([head, header, ...chunks]);
writeFileSync(new URL("../public/ladybug-solid.bin", import.meta.url), asset);

const ts = `/* AUTO-GENERATED by scripts/ladybug-solid-pack.mjs from the real Ladybug
 * CAD assembly — do not edit. The mesh itself lives in public/ladybug-solid.bin
 * (welded, quadric-decimated, crease-split normals, Onshape part colours and
 * ray-traced ambient occlusion baked per vertex; arms, legs, winches and props
 * stored once and stamped by matrix). Only the station anchors are inlined,
 * because the choreography needs them before the mesh has loaded.
 * Scene convention: Y-up, centered, prop-station radius = 1.0.
 */
import { decodeCadSolid, type CadSolidModel } from "../cad";

export const LADYBUG_STATIONS: Array<[number, number, number]> = ${JSON.stringify(stations)};

let pending: Promise<CadSolidModel> | null = null;

/** Fetches and decodes the solid pack. Cached: the hero and the walkaround
 *  both build a Ladybug, and neither should pay for it twice. */
export function loadLadybugSolid(): Promise<CadSolidModel> {
  if (!pending) {
    pending = fetch("/ladybug-solid.bin")
      .then((r) => {
        if (!r.ok) throw new Error(\`ladybug-solid.bin: \${r.status}\`);
        return r.arrayBuffer();
      })
      .then(decodeCadSolid);
  }
  return pending;
}
`;
writeFileSync(new URL("../lib/hero/ladybug-solid.ts", import.meta.url), ts);

console.log("---");
console.log(`stored: ${totalV} verts / ${totalT} tris   drawn: ${drawT} tris`);
console.log(`asset: ${(asset.length / 1024 / 1024).toFixed(2)} MB public/ladybug-solid.bin`);
console.log("stations:", JSON.stringify(stations));
