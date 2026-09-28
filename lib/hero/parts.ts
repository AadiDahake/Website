import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Object3D } from "three";
import type { Pen, FadeMat } from "./pen";

/**
 * Shared pieces between the aircraft builders (Zephyrus, Ladybug). Both
 * drones deliver the same MEDKIT box on a line; both merge their fresnel
 * fills the same way. Lives apart from either pack so importing one aircraft
 * never drags the other's geometry into the bundle.
 */

export interface Drone {
  group: Group;
  props: Group[];
  propDiscs: Mesh[];
  gimbalYaw: Group;
  gimbalPitch: Group;
  beam: Group;
  beamMat: FadeMat;
  beamFillMat: FadeMat;
  mats: FadeMat[];
  /** merged fill mesh per material, so the frame loop can skip empty ones */
  fillMeshes: Map<FadeMat, Mesh>;
  /** every mesh drawn with a given material, so a scene can hide a whole
   *  subsystem rather than merely darkening it. Absent on the line-art
   *  builder, which has nothing solid to hide. */
  solidMeshes?: Map<FadeMat, Mesh[]>;
  markers: Record<string, Object3D>;
  winch: {
    group: Group;
    cable: Object3D;
    boxG: Group;
    /** world-space twin shown once the box has been released on the ground */
    landed: Group;
  };
}

/**
 * Gives a procedural primitive the vertex stream the solid CAD material
 * expects. Everything the CAD does not carry — the SIYI gimbal, the Pi, the
 * ESC boards, the payload box — is authored from three.js primitives and then
 * dressed here so it shades under exactly the same grade as the real
 * geometry: a part colour, and a flat ambient occlusion term (procedural
 * parts are convex, so a constant is honest).
 */
export function solidAttrs(geo: BufferGeometry, color: number, ao = 0.86): BufferGeometry {
  const n = geo.getAttribute("position").count;
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const col = new Float32Array(n * 3);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    a[i] = ao;
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  geo.setAttribute("aAO", new Float32BufferAttribute(a, 1));
  return geo;
}

/** Merges solid-dressed primitives into one draw call, de-indexing as it goes. */
export function mergeSolid(geos: BufferGeometry[]): BufferGeometry | null {
  if (!geos.length) return null;
  let total = 0;
  for (const g of geos) {
    const idx = g.getIndex();
    total += idx ? idx.count : g.getAttribute("position").count;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const ao = new Float32Array(total);
  let o = 0;
  for (const g of geos) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const c = g.getAttribute("color");
    const a = g.getAttribute("aAO");
    const idx = g.getIndex();
    const count = idx ? idx.count : p.count;
    for (let i = 0; i < count; i++) {
      const v = idx ? idx.getX(i) : i;
      pos[o * 3] = p.getX(v); pos[o * 3 + 1] = p.getY(v); pos[o * 3 + 2] = p.getZ(v);
      nor[o * 3] = n.getX(v); nor[o * 3 + 1] = n.getY(v); nor[o * 3 + 2] = n.getZ(v);
      col[o * 3] = c.getX(v); col[o * 3 + 1] = c.getY(v); col[o * 3 + 2] = c.getZ(v);
      ao[o] = a.getX(v);
      o++;
    }
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  out.setAttribute("color", new Float32BufferAttribute(col, 3));
  out.setAttribute("aAO", new Float32BufferAttribute(ao, 1));
  return out;
}

export function mergeGeos(geos: BufferGeometry[]): BufferGeometry | null {
  if (!geos.length) return null;
  if (geos.length === 1) return geos[0];
  let total = 0;
  for (const g of geos) {
    const idx = g.getIndex();
    total += idx ? idx.count : g.getAttribute("position").count;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const idx = g.getIndex();
    const count = idx ? idx.count : p.count;
    for (let i = 0; i < count; i++) {
      const v = idx ? idx.getX(i) : i;
      pos[o * 3] = p.getX(v);
      pos[o * 3 + 1] = p.getY(v);
      pos[o * 3 + 2] = p.getZ(v);
      if (n) {
        nor[o * 3] = n.getX(v);
        nor[o * 3 + 1] = n.getY(v);
        nor[o * 3 + 2] = n.getZ(v);
      }
      o++;
    }
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  return out;
}

/** Minimal stroke font for the payload box lettering. Unit cell, y-up. */
export const GLYPHS: Record<string, Array<[number, number, number, number]>> = {
  M: [[0, 0, 0, 1], [0, 1, 0.5, 0.45], [0.5, 0.45, 1, 1], [1, 1, 1, 0]],
  E: [[1, 0, 0, 0], [0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.7, 0.5]],
  D: [[0, 0, 0, 1], [0, 1, 0.65, 0.88], [0.65, 0.88, 0.9, 0.5], [0.9, 0.5, 0.65, 0.12], [0.65, 0.12, 0, 0]],
  K: [[0, 0, 0, 1], [1, 1, 0, 0.45], [0.34, 0.6, 1, 0]],
  I: [[0.5, 0, 0.5, 1], [0.22, 1, 0.78, 1], [0.22, 0, 0.78, 0]],
  T: [[0, 1, 1, 1], [0.5, 1, 0.5, 0]],
};

/**
 * The payload box: line art + "MEDKIT" lettering + medical cross. Lettering
 * is mirrored per face so each reads correctly from outside.
 */
export function buildMedkitBox(pen: Pen, text: Pen): void {
  const HB = 0.105;
  pen.box(0, 0, 0, HB * 2, HB * 2, HB * 2);
  pen.rect(0, HB, 0, HB * 1.4, HB * 1.4, "xz");            // lid seam
  pen.seg([0, HB, 0], [0, HB + 0.04, 0]);                  // sling loop
  pen.circle(0, HB + 0.045, 0, 0.014, "xy", 8);
  const word = "MEDKIT";
  const gw = 0.028;
  const gh = 0.06;
  const pitch = gw * 1.5;
  const total = (word.length - 1) * pitch + gw;
  for (const side of [1, -1]) {
    const zf = side * (HB + 0.003);
    for (let i = 0; i < word.length; i++) {
      const glyph = GLYPHS[word[i]];
      if (!glyph) continue;
      const gx0 = -total / 2 + i * pitch;
      for (const [x0, y0, x1, y1] of glyph) {
        text.seg(
          [side * (gx0 + x0 * gw), -gh / 2 + y0 * gh, zf],
          [side * (gx0 + x1 * gw), -gh / 2 + y1 * gh, zf],
        );
      }
    }
    const cs = 0.019;
    const xf = side * (HB + 0.003);
    const cpts: Array<[number, number]> = [
      [-cs, cs * 3], [cs, cs * 3], [cs, cs], [cs * 3, cs],
      [cs * 3, -cs], [cs, -cs], [cs, -cs * 3], [-cs, -cs * 3],
      [-cs, -cs], [-cs * 3, -cs], [-cs * 3, cs], [-cs, cs],
    ];
    text.poly(cpts.map(([z, y]) => [xf, y, z] as [number, number, number]), true);
  }
}

export function mark(parent: Object3D, x: number, y: number, z: number): Object3D {
  const o = new Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
