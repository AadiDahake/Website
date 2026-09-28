import { CircleGeometry, ConeGeometry, Group, LineSegments, Mesh, Object3D, Vector3 } from "three";
import { Pen, makeMat, makeFresnelMat, type FadeMat } from "./pen";
import { NUM } from "../theme";
import { mulberry32, seedFrom } from "../motion";

/**
 * The search area: a line-art grass field on a survey grid with one ODCL
 * (a sports cone — the TDP's real flight-test target) hidden in it.
 *
 * The spotlight contract: everything the gimbal's beam touches renders
 * off-white. A "lit stamp" — an off-white patch of ground ring, grid and
 * grass — follows the beam's ground intersection each frame, and the cone
 * itself warms to off-white as the light crosses it.
 *
 * Seeded PRNG: the same field every load, so every state is reproducible.
 */

export const FIELD_Y = -2.8;
export const TARGET = new Vector3(1.55, FIELD_Y, -0.85);

/** Spotlight tint: warm off-white. */
export const LIT = 0xfff3e0;

export interface Field {
  group: Group;
  targetGroup: Group;
  boxGroup: Group;
  litGroup: Group;
  litMats: FadeMat[];
  targetMat: FadeMat;
  mats: FadeMat[];
  marker: Object3D;
}

export function buildField(): Field {
  const group = new Group();
  group.position.y = FIELD_Y;

  const gridMat = makeMat(NUM.g3, 0.16, "field");
  const grassMat = makeMat(NUM.fgSoft, 0.22, "field");
  const targetMat = makeMat(NUM.fg, 0.75, "target");
  const boxMat = makeMat(NUM.g1, 0.0, "box");
  const groundFill = makeFresnelMat(NUM.g3, 0.05, "field");
  const mats = [gridMat, grassMat, targetMat, boxMat, groundFill];

  // ---- survey grid + contours + registration crosses ----
  const G = new Pen();
  G.grid(0, 0, 9, 18, 0);
  for (let i = 0; i < 3; i++) {
    const r = 1.4 + i * 0.9;
    const pts: [number, number, number][] = [];
    const rnd = mulberry32(seedFrom(i + 11));
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const rr = r * (1 + (rnd() - 0.5) * 0.22);
      pts.push([Math.cos(a) * rr - 0.6, 0.004, Math.sin(a) * rr * 0.62 + 0.3]);
    }
    G.poly(pts, true);
  }
  for (const [x, z] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) G.cross(x, 0.005, z, 0.18);

  // ---- grass ----
  const R = new Pen();
  const rnd = mulberry32(seedFrom(7));
  for (let i = 0; i < 340; i++) {
    const x = (rnd() - 0.5) * 8.6;
    const z = (rnd() - 0.5) * 8.6;
    if (Math.hypot(x - TARGET.x, z - TARGET.z) < 0.42) continue;
    const h = 0.05 + rnd() * 0.075;
    const blades = 2 + Math.floor(rnd() * 2);
    for (let b = 0; b < blades; b++) {
      const lean = (rnd() - 0.5) * 0.07;
      const off = (rnd() - 0.5) * 0.04;
      R.poly([
        [x + off, 0, z],
        [x + off + lean * 0.5, h * 0.6, z + lean * 0.3],
        [x + off + lean, h, z + lean * 0.6],
      ]);
    }
  }

  group.add(new LineSegments(G.lines(), gridMat.m));
  group.add(new LineSegments(R.lines(), grassMat.m));

  // NOTE: no full-field ground-plane fill — a screen-covering additive
  // transparent quad was the single biggest overdraw in the scene. The grid
  // lines carry the ground read on their own.

  // ---- the lit stamp: what the spotlight reveals, in off-white ----
  const litGroup = new Group();
  const litLines = makeMat(LIT, 0.0, "lit");
  const litSoft = makeMat(LIT, 0.0, "lit");
  const litFill = makeFresnelMat(LIT, 0.0, "lit");
  const litMats = [litLines, litSoft, litFill];
  mats.push(...litMats);

  const L = new Pen();
  // footprint ring + inner ring
  L.circle(0, 0.006, 0, 1, "xz", 40);
  L.circle(0, 0.006, 0, 0.72, "xz", 32);
  // grid section inside the light
  for (let i = -3; i <= 3; i++) {
    const t = i * 0.28;
    const half = Math.sqrt(Math.max(0, 1 - t * t));
    L.seg([-half, 0.006, t], [half, 0.006, t]);
    L.seg([t, 0.006, -half], [t, 0.006, half]);
  }
  litGroup.add(new LineSegments(L.lines(), litLines.m));

  // lit grass: a seeded tuft pattern inside the circle
  const LG = new Pen();
  const rnd2 = mulberry32(seedFrom(23));
  for (let i = 0; i < 60; i++) {
    const a = rnd2() * Math.PI * 2;
    const r = Math.sqrt(rnd2()) * 0.92;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.06 + rnd2() * 0.08;
    const lean = (rnd2() - 0.5) * 0.06;
    LG.poly([[x, 0, z], [x + lean * 0.5, h * 0.6, z + lean * 0.3], [x + lean, h, z + lean * 0.6]]);
  }
  litGroup.add(new LineSegments(LG.lines(), litSoft.m));

  // soft lit disc on the ground
  const litDisc = new Mesh(new CircleGeometry(1, 32), litFill.m);
  litDisc.rotation.x = -Math.PI / 2;
  litDisc.position.y = 0.003;
  litGroup.add(litDisc);

  litGroup.position.y = 0.002;
  group.add(litGroup);

  // ---- the ODCL: a sports cone ----
  const targetGroup = new Group();
  targetGroup.position.set(TARGET.x, 0, TARGET.z);
  const T = new Pen();
  const CH = 0.3;
  const CR = 0.115;
  T.rect(0, 0.004, 0, CR * 2.3, CR * 2.3, "xz");
  T.rect(0, 0.03, 0, CR * 2.0, CR * 2.0, "xz");
  const rings = 7;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    T.circle(0, 0.03 + t * CH, 0, CR * (1 - t * 0.82), "xz", 16);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    T.seg(
      [Math.cos(a) * CR, 0.03, Math.sin(a) * CR],
      [Math.cos(a) * CR * 0.18, 0.03 + CH, Math.sin(a) * CR * 0.18],
    );
  }
  targetGroup.add(new LineSegments(T.lines(), targetMat.m));
  // shaded cone body
  const coneFill = makeFresnelMat(0xd8dbe4, 0.14, "target");
  mats.push(coneFill);
  const coneMesh = new Mesh(new ConeGeometry(CR, CH, 16), coneFill.m);
  coneMesh.position.y = 0.03 + CH / 2;
  targetGroup.add(coneMesh);
  group.add(targetGroup);

  const marker = new Object3D();
  marker.position.set(0, 0.34, 0);
  targetGroup.add(marker);

  // ---- detection bracket ----
  const boxGroup = new Group();
  boxGroup.position.set(TARGET.x, 0.19, TARGET.z);
  const B = new Pen();
  const s = 0.33;
  const c = 0.12;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    B.seg([sx * s, sy * s, 0], [sx * s - sx * c, sy * s, 0]);
    B.seg([sx * s, sy * s, 0], [sx * s, sy * s - sy * c, 0]);
  }
  boxGroup.add(new LineSegments(B.lines(), boxMat.m));
  group.add(boxGroup);

  return { group, targetGroup, boxGroup, litGroup, litMats, targetMat, mats, marker };
}
