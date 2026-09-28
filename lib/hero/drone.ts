import { BoxGeometry, BufferGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, FrontSide, Group, LineSegments, Matrix4, Mesh, Object3D, Quaternion, Vector3 } from "three";
import { Pen, makeMat, makeCadMat, makeFresnelMat, type FadeMat } from "./pen";
import { decodeZeph, ZEPH_STATIONS } from "./zeph";
import { cadLineGeo } from "../cad";
import { NUM } from "../theme";
import { mergeGeos, buildMedkitBox, mark, type Drone } from "./parts";

export type { Drone };

/**
 * Zephyrus — the REAL airframe. Feature edges are extracted from the team's
 * CAD assembly (zephyrus.glb -> glb2/pack2 pipeline) with per-edge baked
 * lighting, so the frame, motor bells, legs, batteries and the full Pixhawk
 * 6X render as genuinely shaded line art. The P20 propellers are the real
 * CAD blades, one instance per motor station, spinning around their own
 * axes.
 *
 * Procedural additions cover what the CAD does not carry: the two-axis
 * gimbal + camera (not modeled in CAD), the winch delivery rig, a Jetson
 * carrier board, the H-RTK F9P helical GNSS (drawn to the Holybro
 * datasheet's stepped-cylinder profile), Zubax Myxa ESC boards at the real
 * ESC-case corners, and plate screw heads.
 *
 * Scale: 1.0 unit = hub centre to motor centre (the pack is normalized).
 */

const PROP_R = 0.55;               // P20: 20in dia -> 0.254m x pack scale
/** Nominal beam length; scaled per frame so the footprint stays on the ground. */
export const BEAM_FAR = 2.8;
/** How far the winch can pay out (drone belly to ground, in scene units). */
export const WINCH_DROP = 2.56;

/** Sample a quadratic bezier through three points. */
function qcurve(
  a: [number, number, number], c: [number, number, number], b: [number, number, number], n = 8,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ]);
  }
  return out;
}

export function buildDrone(): Drone {
  const group = new Group();
  const mats: FadeMat[] = [];
  const markers: Record<string, Object3D> = {};

  // ---- CAD layers: real geometry, shaded via baked vertex colors ----
  const cad = decodeZeph();
  const cadShell = makeCadMat(0.6, "shell");     // airframe
  const cadMotor = makeCadMat(0.78, "shell");    // MN601-S bells
  // Pixhawk 6X internals: thousands of tiny edges in a small volume —
  // additive stacking saturates fast, so keep this layer quiet or it
  // reads as a magenta smear from any distance
  const cadPix = makeCadMat(0.28, "avionics");
  const cadProp = makeCadMat(0.62, "props");     // P20 blades
  mats.push(cadShell, cadMotor, cadPix, cadProp);

  group.add(new LineSegments(cadLineGeo(cad.groups.frame, NUM.fg, 0.34, NUM.g1, NUM.g3), cadShell.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.motor, NUM.g3), cadMotor.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.pixhawk, NUM.g1), cadPix.m));
  if (cad.groups.screw && cad.groups.screw.count > 0) {
    const cadScrew = makeCadMat(0.5, "soft");
    mats.push(cadScrew);
    group.add(new LineSegments(cadLineGeo(cad.groups.screw, 0xcfd5e2), cadScrew.m));
  }

  // ---- procedural line layers for everything the CAD lacks ----
  const primary = makeMat(NUM.fg, 0.62, "shell");
  const soft = makeMat(NUM.fgSoft, 0.34, "soft");
  const avionics = makeMat(NUM.g3, 0.7, "avionics");
  const winchMat = makeMat(NUM.fg, 0.7, "winch");
  const winchText = makeMat(NUM.g1, 0.95, "winch");
  mats.push(primary, soft, avionics, winchMat, winchText);

  const fillShell = makeFresnelMat(0xbfc7d8, 0.1, "shell", FrontSide, 0.32);
  const fillMotor = makeFresnelMat(NUM.g3, 0.15, "shell");
  const fillProp = makeFresnelMat(NUM.g2, 0.07, "props", FrontSide);
  const fillAvionics = makeFresnelMat(NUM.g3, 0.13, "avionics");
  const fillWinch = makeFresnelMat(NUM.g1, 0.14, "winch");
  mats.push(fillShell, fillMotor, fillProp, fillAvionics, fillWinch);

  const fills = new Group();
  group.add(fills);
  const fillBuckets = new Map<FadeMat, BufferGeometry[]>();
  const bake = (geo: BufferGeometry, x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
    const m4 = new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
      new Vector3(1, 1, 1),
    );
    geo.applyMatrix4(m4);
    return geo;
  };
  const addFill = (geo: BufferGeometry, fm: FadeMat, x = 0, y = 0, z = 0, ry = 0, rz = 0, rx = 0) => {
    bake(geo, x, y, z, rx, ry, rz);
    const arr = fillBuckets.get(fm);
    if (arr) arr.push(geo);
    else fillBuckets.set(fm, [geo]);
    return geo;
  };
  const addLoneFill = (geo: BufferGeometry, fm: FadeMat, x = 0, y = 0, z = 0, ry = 0, rz = 0, rx = 0) => {
    const mesh = new Mesh(geo, fm.m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    fills.add(mesh);
    return mesh;
  };

  const P = new Pen();      // primary structure additions
  const S = new Pen();      // soft detail
  const AV = new Pen();     // avionics detail

  // Real deck heights (CAD plate stack through the pack transform):
  //   aux 0.054 · bottom 0.162 · top 0.271 · battery 0.385
  const DECK_TOP = 0.271;
  const DECK_HALF = 0.274;  // plate half-side in scene units

  // ---- fresnel fills under the CAD plates + motors: the shading layer ----
  addFill(new BoxGeometry(DECK_HALF * 2 * 0.98, 0.012, DECK_HALF * 2 * 0.98), fillShell, 0, DECK_TOP, 0);
  addFill(new BoxGeometry(DECK_HALF * 2 * 0.98, 0.012, DECK_HALF * 2 * 0.98), fillShell, 0, 0.162, 0);
  addFill(new BoxGeometry(0.44, 0.01, 0.44), fillShell, 0, 0.054, 0);
  for (const st of ZEPH_STATIONS) {
    addFill(new CylinderGeometry(0.075, 0.075, 0.075, 16), fillMotor, st[0], st[1] - 0.06, st[2]);
  }
  // batteries: four 3S packs on the battery plate, sized to the CAD packs.
  // Pure line work — fresnel fills on boxes this small smear into
  // shapeless streaks at grazing angles.
  const batMat = makeMat(NUM.g1, 0.55, "soft");
  mats.push(batMat);
  const BAT = new Pen();
  for (const [bx, bz] of [[-0.105, -0.11], [0.105, -0.11], [-0.105, 0.11], [0.105, 0.11]]) {
    BAT.box(bx, 0.44, bz, 0.185, 0.1, 0.2);
    BAT.rect(bx, 0.4901, bz, 0.15, 0.165, "xz");   // shrink-wrap seam on top
  }
  group.add(new LineSegments(BAT.lines(), batMat.m));

  // ---- screw heads on the plate corners (M3 socket caps) ----
  for (const y of [DECK_TOP, 0.162]) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx * DECK_HALF * 0.9;
      const z = sz * DECK_HALF * 0.9;
      S.circle(x, y + 0.006, z, 0.014, "xz", 8);
      S.circle(x, y + 0.006, z, 0.006, "xz", 6);   // hex socket
      S.seg([x, y, z], [x, y + 0.006, z]);
    }
  }

  // ---- Zubax Myxa ESC boards at the real ESC-case corners ----
  // (cases sit on the hub deck at r~0.28, pinwheel; board 45x35mm)
  for (let i = 0; i < 4; i++) {
    const rot = (i * Math.PI) / 2;
    AV.push().rotateY(rot).translate(0.266, 0.2, -0.093);
    AV.rect(0, 0, 0, 0.097, 0.076, "xz");
    AV.rect(0, 0.004, 0, 0.024, 0.024, "xz");             // LQFP MCU
    for (let fx = 0; fx < 3; fx++) {
      for (const fz of [-0.02, 0.02]) {
        AV.rect(-0.028 + fx * 0.02, 0.004, fz, 0.013, 0.011, "xz");  // FET bank
      }
    }
    for (const px of [-0.019, 0, 0.019]) {
      AV.seg([px, 0.002, 0.036], [px, 0.002, 0.044]);      // phase pads
    }
    AV.pop();
  }

  // ---- Jetson carrier on the aux deck (drawn to the ref-board layout) ----
  const JET = { x: 0.1, y: 0.068, z: -0.1 };
  AV.push().translate(JET.x, JET.y, JET.z);
  AV.rect(0, 0, 0, 0.217, 0.173, "xz");                    // 100x80 board
  // finned heatsink upper-left, fins along X
  AV.box(-0.04, 0.017, 0.02, 0.126, 0.028, 0.095);
  for (let f = 0; f < 6; f++) {
    const fz = 0.02 - 0.0475 + (f + 0.5) * (0.095 / 6);
    AV.seg([-0.103, 0.031, fz], [0.023, 0.031, fz]);
  }
  // stacked USB block + RJ45 on the right edge
  AV.box(0.093, 0.014, 0.045, 0.032, 0.028, 0.036);
  AV.rect(0.109, 0.008, 0.045, 0.008, 0.026, "yz");
  AV.rect(0.109, 0.022, 0.045, 0.008, 0.026, "yz");
  AV.box(0.09, 0.012, -0.015, 0.034, 0.024, 0.042);        // RJ45
  // barrel jack, front-left
  AV.circle(-0.09, 0.008, -0.083, 0.009, "xy", 8);
  // GPIO comb along the back edge
  for (let g = 0; g < 10; g++) {
    AV.seg([-0.09 + g * 0.011, 0.004, 0.082], [-0.09 + g * 0.011, 0.014, 0.082]);
  }
  AV.pop();
  addFill(new BoxGeometry(0.126, 0.028, 0.095), fillAvionics, JET.x - 0.04, JET.y + 0.017, JET.z + 0.02);

  // ---- H-RTK F9P helical at the real mast position (datasheet profile) ----
  const GPS = { x: -0.197, y: 0.2815, z: -0.219 };
  const COLLAR_R = 0.0298;
  const BARREL_R = 0.0271;
  AV.tube(GPS.x, GPS.y + 0.0165, GPS.z, COLLAR_R, 0.033, "y", 2, 6, 12);       // collar
  AV.circle(GPS.x, GPS.y + 0.033, GPS.z, BARREL_R, "xz", 12);                  // shoulder step
  AV.tube(GPS.x, GPS.y + 0.033 + 0.047, GPS.z, BARREL_R, 0.094, "y", 2, 6, 12); // barrel
  AV.circle(GPS.x, GPS.y + 0.128, GPS.z, BARREL_R * 0.8, "xz", 10);            // bullnose cap
  AV.helix(GPS.x, GPS.y + 0.036, GPS.z, BARREL_R * 0.62, 0.082, 3, 36);        // inner helix ghost
  addFill(new CylinderGeometry(BARREL_R, COLLAR_R, 0.128, 12), fillAvionics, GPS.x, GPS.y + 0.064, GPS.z);

  // ---- ARM TUBES: smooth cylinders in CAD (no crease edges survive), so
  // the rails that connect the hub to the motor mounts are drawn here,
  // matched to the real tube line (y 0.227, r 0.035) ----
  for (const st of ZEPH_STATIONS) {
    const major = Math.abs(st[0]) > Math.abs(st[2]) ? 0 : 2;
    const minor = major === 0 ? 2 : 0;
    const sgn = Math.sign(st[major]);
    const off = st[minor];
    const AY = 0.227;
    const a: [number, number, number] = [0, AY, 0];
    const b: [number, number, number] = [0, AY, 0];
    a[major === 0 ? 0 : 2] = sgn * 0.3;
    b[major === 0 ? 0 : 2] = sgn * 0.86;
    a[minor === 0 ? 0 : 2] = off;
    b[minor === 0 ? 0 : 2] = off;
    // four rails: horizontal pair + vertical pair
    for (const [dy, dm] of [[0.035, 0], [-0.035, 0], [0, 0.035], [0, -0.035]] as const) {
      const aa: [number, number, number] = [a[0], a[1] + dy, a[2]];
      const bb: [number, number, number] = [b[0], b[1] + dy, b[2]];
      if (minor === 0) { aa[0] += dm; bb[0] += dm; } else { aa[2] += dm; bb[2] += dm; }
      P.seg(aa, bb);
    }
    // clamp collars at both ends + a mid ring
    for (const f of [0.32, 0.58, 0.84]) {
      const cx = major === 0 ? sgn * f : off;
      const cz = major === 0 ? off : sgn * f;
      P.circle(cx, AY, cz, 0.04, major === 0 ? "yz" : "xy", 10);
    }
  }

  // ---- hex standoffs between the deck plates (thread tessellation defeats
  // extraction, so the posts are drawn to the real pattern) ----
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const x = sx * DECK_HALF * 0.82;
    const z = sz * DECK_HALF * 0.82;
    S.tube(x, 0.2165, z, 0.014, 0.1, "y", 2, 6, 6);
  }

  // ---- landing legs: carbon rods down to the REAL CAD foot pads ----
  // (the CAD rods are smooth cylinders — no crease edges survive — but the
  // foot-pad hardware does; these rods connect the frame to those pads)
  const FEET: Array<[number, number]> = [
    [-0.204, -0.55], [0.55, -0.206], [0.204, 0.548], [-0.537, 0.221],
  ];
  for (const [fx, fz] of FEET) {
    const fl = Math.hypot(fx, fz) || 1;
    const ux = fx / fl;
    const uz = fz / fl;
    // perpendicular for the twin rod edges
    const px = -uz * 0.011;
    const pz = ux * 0.011;
    const top: [number, number, number] = [ux * 0.3, 0.145, uz * 0.3];
    const bot: [number, number, number] = [fx, -0.532, fz];
    for (const sgn of [1, -1]) {
      P.seg([top[0] + px * sgn, top[1], top[2] + pz * sgn], [bot[0] + px * sgn, bot[1], bot[2] + pz * sgn]);
    }
    P.circle(top[0], top[1], top[2], 0.02, "xz", 8);       // clamp collar
    S.box(top[0], top[1] + 0.02, top[2], 0.05, 0.045, 0.05);
    P.circle(bot[0], bot[1] + 0.012, bot[2], 0.016, "xz", 8);  // ferrule
    P.circle(bot[0], bot[1] - 0.012, bot[2], 0.028, "xz", 10);  // foot pad
    S.circle(bot[0], bot[1] - 0.012, bot[2], 0.014, "xz", 8);
    S.seg([top[0] * 0.8 + bot[0] * 0.2 + px, top[1] * 0.8 + bot[1] * 0.2, top[2] * 0.8 + bot[2] * 0.2 + pz],
      [top[0] * 0.72 + bot[0] * 0.28 - px, top[1] * 0.72 + bot[1] * 0.28, top[2] * 0.72 + bot[2] * 0.28 - pz]);
  }

  // ---- RFD900 telemetry whips off the top deck ----
  AV.box(-0.18, 0.29, 0.12, 0.09, 0.03, 0.06);
  AV.seg([-0.155, 0.305, 0.1], [-0.26, 0.5, 0.16]);
  AV.seg([-0.155, 0.305, 0.14], [-0.28, 0.47, 0.1]);

  // ---- REAL P20 props from CAD, one instance per station, spinning ----
  const props: Group[] = [];
  const propDiscs: Mesh[] = [];
  const propGeo = cadLineGeo(cad.groups.prop, NUM.g2);
  for (const inst of cad.instances.prop) {
    const holder = new Group();
    holder.matrixAutoUpdate = false;
    holder.matrix.fromArray(inst.m);
    const spinner = new Group();
    spinner.add(new LineSegments(propGeo, cadProp.m));
    holder.add(spinner);
    group.add(holder);
    props.push(spinner);
  }
  for (const st of ZEPH_STATIONS) {
    S.circle(st[0], st[1], st[2], PROP_R, "xz", 36);
    propDiscs.push(addLoneFill(new CircleGeometry(PROP_R, 28), fillProp, st[0], st[1], st[2], 0, 0, -Math.PI / 2));
  }

  // ================= GIMBAL + CAMERA (not in CAD; front belly) =============
  const gimbalYaw = new Group();
  gimbalYaw.position.set(0, 0.04, 0.2);
  const gimbalPitch = new Group();
  gimbalYaw.add(gimbalPitch);
  group.add(gimbalYaw);

  const GY = new Pen();
  GY.tube(0, 0.028, 0, 0.045, 0.05, "y", 2, 8, 12);
  GY.seg([-0.075, -0.01, 0], [0.075, -0.01, 0]);
  GY.seg([-0.075, -0.01, 0], [-0.075, -0.075, 0]);
  GY.seg([0.075, -0.01, 0], [0.075, -0.075, 0]);
  GY.circle(-0.075, -0.075, 0, 0.022, "yz", 10);
  GY.circle(0.075, -0.075, 0, 0.022, "yz", 10);
  GY.rect(0, 0.002, 0.03, 0.05, 0.03, "xz");
  // mount struts up to the aux deck
  GY.seg([-0.03, 0.05, 0], [-0.03, 0.014, 0]);
  GY.seg([0.03, 0.05, 0], [0.03, 0.014, 0]);
  gimbalYaw.add(new LineSegments(GY.lines(), primary.m));

  const GP = new Pen();
  GP.arc(0, -0.075, 0, 0.062, Math.PI * 0.15, Math.PI * 0.85, "xy", 10);
  GP.arc(0, -0.075, 0, 0.062, Math.PI * 1.15, Math.PI * 1.85, "xy", 10);
  GP.arc(0, -0.075, 0.01, 0.058, Math.PI * 0.2, Math.PI * 0.8, "yz", 8);
  GP.box(0, -0.075, 0, 0.09, 0.07, 0.075);
  GP.tube(0, -0.075, 0.055, 0.028, 0.05, "z", 3, 8, 14);
  GP.circle(0, -0.075, 0.082, 0.023, "xy", 12);
  GP.circle(0, -0.075, 0.082, 0.014, "xy", 10);
  GP.circle(0, -0.075, 0.086, 0.02, "xy", 12);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    GP.seg(
      [Math.cos(a) * 0.027, -0.075 + Math.sin(a) * 0.027, 0.062],
      [Math.cos(a) * 0.027, -0.075 + Math.sin(a) * 0.027, 0.072],
    );
  }
  GP.rect(0, -0.038, 0, 0.07, 0.055, "xz");
  gimbalPitch.add(new LineSegments(GP.lines(), primary.m));
  const camFill = new Mesh(new BoxGeometry(0.088, 0.068, 0.073), fillAvionics.m);
  camFill.position.set(0, -0.075, 0);
  gimbalPitch.add(camFill);
  markers.gimbal = mark(gimbalPitch, 0, -0.075, 0.09);

  // ================= WINCH DELIVERY RIG (rear belly) =======================
  // Spool + servo live on the airframe; the cable is a unit line scaled by
  // the payout, and the box rides its end. `landed` is a world-space twin
  // that takes over the instant the box releases on the ground, so the
  // aircraft can fly home while the delivery stays put.
  const winchGroup = new Group();
  winchGroup.position.set(0, 0.04, -0.22);
  group.add(winchGroup);

  const W = new Pen();
  W.circle(-0.03, 0, 0, 0.05, "yz", 14);
  W.circle(0.03, 0, 0, 0.05, "yz", 14);
  W.tube(0, 0, 0, 0.024, 0.055, "x", 2, 6, 10);
  for (const dx of [-0.015, 0, 0.015]) W.circle(dx, 0, 0, 0.028, "yz", 10);
  W.box(0, 0.04, 0, 0.038, 0.028, 0.038);                    // MG90 servo
  W.seg([0, -0.026, 0], [0, -0.05, 0]);                      // line guide
  W.arc(0, -0.057, 0, 0.008, Math.PI * 0.2, Math.PI * 1.4, "xy", 8);
  winchGroup.add(new LineSegments(W.lines(), primary.m));

  // cable: unit segment scaled by the frame loop
  const cableGeo = new BufferGeometry();
  cableGeo.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 0, -1, 0], 3));
  const cable = new LineSegments(cableGeo, winchMat.m);
  cable.position.y = -0.05;
  cable.frustumCulled = false;
  winchGroup.add(cable);

  const boxG = new Group();
  const BP = new Pen();
  const BT = new Pen();
  buildMedkitBox(BP, BT);
  boxG.add(new LineSegments(BP.lines(), winchMat.m));
  boxG.add(new LineSegments(BT.lines(), winchText.m));
  const boxFill = new Mesh(new BoxGeometry(0.205, 0.205, 0.205), fillWinch.m);
  boxG.add(boxFill);
  boxG.position.y = -0.155;
  winchGroup.add(boxG);
  markers.drop = mark(boxG, 0, 0, 0.13);

  // world-space landed twin (geometry shared)
  const landed = new Group();
  const LP = new Pen();
  const LT = new Pen();
  buildMedkitBox(LP, LT);
  landed.add(new LineSegments(LP.lines(), winchMat.m));
  landed.add(new LineSegments(LT.lines(), winchText.m));
  const landedFill = new Mesh(new BoxGeometry(0.205, 0.205, 0.205), fillWinch.m);
  landed.add(landedFill);
  landed.visible = false;

  // ================= SEARCH BEAM ===========================================
  const beam = new Group();
  const beamMat = makeMat(0xfff3e0, 0.0, "beam");
  const beamFillMat = makeFresnelMat(0xfff3e0, 0.0, "beam", FrontSide);
  mats.push(beamMat, beamFillMat);
  const B = new Pen();
  const SPREAD = 0.3;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    B.seg([0, 0, 0], [Math.cos(a) * SPREAD * BEAM_FAR, -BEAM_FAR, Math.sin(a) * SPREAD * BEAM_FAR]);
  }
  for (const f of [0.45, 0.72, 1]) {
    B.circle(0, -BEAM_FAR * f, 0, SPREAD * BEAM_FAR * f, "xz", 28);
  }
  beam.add(new LineSegments(B.lines(), beamMat.m));
  const coneGeo = new ConeGeometry(SPREAD * BEAM_FAR, BEAM_FAR, 24, 1, true);
  const coneMesh = new Mesh(coneGeo, beamFillMat.m);
  coneMesh.position.y = -BEAM_FAR / 2;
  coneMesh.rotation.x = Math.PI;
  beam.add(coneMesh);
  gimbalPitch.add(beam);

  // ================= markers for callouts + the component tour =============
  markers.avionics = mark(group, 0, 0.5, 0);
  markers.arm = mark(group, -0.55, 0.3, -0.22);
  markers.motor = mark(group, -0.98, 0.38, -0.22);
  markers.gps = mark(group, GPS.x, GPS.y + 0.16, GPS.z);
  markers.pcb = mark(group, 0, 0.24, 0.03);
  markers.jetson = mark(group, JET.x, JET.y + 0.06, JET.z);
  markers.payload = mark(group, 0, -0.05, -0.22);

  // ---- merge fill buckets ----
  const fillMeshes = new Map<FadeMat, Mesh>();
  for (const [fm, geos] of fillBuckets) {
    const merged = mergeGeos(geos);
    if (!merged) continue;
    const mesh = new Mesh(merged, fm.m);
    fills.add(mesh);
    fillMeshes.set(fm, mesh);
  }

  group.add(new LineSegments(P.lines(), primary.m));
  group.add(new LineSegments(S.lines(), soft.m));
  group.add(new LineSegments(AV.lines(), avionics.m));

  return {
    group, props, propDiscs, gimbalYaw, gimbalPitch, beam, beamMat, beamFillMat,
    mats, fillMeshes, markers,
    winch: { group: winchGroup, cable, boxG, landed },
  };
}

export const DRONE_ARM = 1.0;
/** The featured arm's line for choreography: direction 180deg, offset z. */
export const ARM_LINE = { angle: Math.PI, offset: 0.22 };
/** Real component anchor points on the CAD airframe (scene units). */
export const PART_POS = {
  motor: { x: -0.98, y: 0.33, z: -0.22 },
  armMid: { x: -0.55, y: 0.28, z: -0.22 },
  gps: { x: -0.197, y: 0.42, z: -0.219 },
  pcb: { x: 0, y: 0.2, z: 0.03 },
  jetson: { x: 0.1, y: 0.08, z: -0.1 },
  payload: { x: 0, y: -0.1, z: -0.34 },
} as const;
