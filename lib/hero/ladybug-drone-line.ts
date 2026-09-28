import { BoxGeometry, BufferGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, FrontSide, Group, LineSegments, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { Pen, makeMat, makeCadMat, makeFresnelMat, type FadeMat } from "./pen";
import { decodeLadybug, LADYBUG_STATIONS } from "./ladybug";
import { cadLineGeo } from "../cad";
import { NUM } from "../theme";
import { mergeGeos, buildMedkitBox, mark, type Drone } from "./parts";

export type { Drone };

/**
 * LADYBUG, LINE ART — the original edge-extracted build of the aircraft.
 *
 * The hero renders the solid version (./ladybug-drone). The /ladybug
 * walkaround renders this one, because a component tour flies the camera to
 * within 40cm of the hub: solid geometry puts the lens inside the airframe and
 * hides the very part being introduced, while line art is transparent by
 * construction and shows a component in the context of the structure around
 * it. Two builders, two jobs.
 *
 * Feature edges are
 * extracted from the team's CAD assembly (Main Assembly.glb ->
 * scripts/ladybug-pack.mjs) with per-edge baked lighting: the plates, the
 * latching arms, the twistlock legs, the full Pixhawk 6X, the 6S4P battery
 * pack and both spool winches render as genuinely shaded line art. The
 * NS24x7.2 folding props are the real CAD blades, one instance per MN7005
 * station, spinning around their own axes.
 *
 * Procedural additions cover what the CAD does not carry: the SIYI A8 mini
 * gimbal (the CAD's placeholder cylinder under the nose is dropped by the
 * pack pipeline and the real thing is drawn here), the Raspberry Pi 5 + AI
 * HAT, four Zubax Myxa ESC boards, the ELRS 915 receiver whips, a GNSS mast,
 * arm-tube rails and leg rods (smooth cylinders leave no crease edges), and
 * the winch delivery line + MEDKIT box.
 *
 * Scale: 1.0 unit = hub centre to motor centre (the pack is normalized).
 */

/** NS24x7.2 folding props at pack scale (blade tip radius from the CAD). */
export const PROP_R = 0.647;
/** Nominal beam length; scaled per frame so the footprint stays on the ground. */
export const BEAM_FAR = 2.8;
/** How far the winch can pay out (spool to ground, in scene units). */
export const WINCH_DROP = 2.25;
/** The arm-tube plane (CAD): rails and the lengthwise camera ride live here. */
export const ARM_Y = -0.017;
/** The featured arm's line for choreography: direction 180deg, offset z. */
export const ARM_LINE = { angle: Math.PI, offset: 0.2101 };
/** Where the delivery winch hangs, in airframe-local coordinates. */
export const WINCH_POS = { x: -0.212, y: -0.293, z: 0 };
/** The SIYI A8 mini's yaw pivot (replaces the CAD placeholder cylinder). */
export const GIMBAL_POS = { x: -0.1085, y: -0.191, z: -0.1661 };

/** Real component anchor points on the CAD airframe (scene units). */
export const PART_POS = {
  motor: { x: -0.9777, y: 0.076, z: -0.2101 },
  armMid: { x: -0.55, y: ARM_Y, z: -0.2101 },
  pixhawk: { x: 0, y: -0.0568, z: 0 },
  battery: { x: 0, y: 0.165, z: 0 },
  esc: { x: 0.19, y: 0.058, z: 0.19 },
  rpi: { x: 0.142, y: -0.081, z: 0.122 },
  elrs: { x: -0.162, y: -0.081, z: 0.142 },
  payload: { x: WINCH_POS.x, y: -0.32, z: 0 },
  gimbal: { x: GIMBAL_POS.x, y: -0.3, z: GIMBAL_POS.z },
} as const;

export function buildLadybug(): Drone {
  const group = new Group();
  const mats: FadeMat[] = [];
  const markers: Drone["markers"] = {};

  // ---- CAD layers: real geometry, shaded via baked vertex colors ----
  const cad = decodeLadybug();
  const cadShell = makeCadMat(0.6, "shell");     // plates, arms, legs, mounts
  const cadMotor = makeCadMat(0.78, "shell");    // MN7005 AT motors
  // Pixhawk 6X internals: thousands of tiny edges in a small volume —
  // additive stacking saturates fast, so keep this layer quiet
  const cadPix = makeCadMat(0.3, "avionics");
  const cadBattery = makeCadMat(0.55, "accent"); // the 6S4P pack, brand magenta
  const cadWinch = makeCadMat(0.42, "soft");     // both spool winches
  const cadProp = makeCadMat(0.62, "props");     // NS24x7.2 blades
  mats.push(cadShell, cadMotor, cadPix, cadBattery, cadWinch, cadProp);

  group.add(new LineSegments(cadLineGeo(cad.groups.frame, NUM.fg, 0.34, NUM.g1, NUM.g3), cadShell.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.motor, NUM.g3), cadMotor.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.pixhawk, NUM.g1), cadPix.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.battery, NUM.g1), cadBattery.m));
  group.add(new LineSegments(cadLineGeo(cad.groups.winch, 0xcfd5e2), cadWinch.m));

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
  const fillBattery = makeFresnelMat(NUM.g1, 0.1, "accent");
  const fillWinch = makeFresnelMat(NUM.g1, 0.14, "winch");
  mats.push(fillShell, fillMotor, fillProp, fillAvionics, fillBattery, fillWinch);

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
  //   lower -0.0855 · upper 0.0518 · battery plate 0.0905
  const PLATE_HALF = 0.259;

  // ---- fresnel fills under the CAD plates + motors: the shading layer ----
  addFill(new BoxGeometry(PLATE_HALF * 2 * 0.98, 0.01, PLATE_HALF * 2 * 0.98), fillShell, 0, 0.0518, 0);
  addFill(new BoxGeometry(PLATE_HALF * 2 * 0.98, 0.01, PLATE_HALF * 2 * 0.98), fillShell, 0, -0.0855, 0);
  addFill(new BoxGeometry(0.41, 0.01, 0.41), fillShell, 0, 0.0905, 0);
  for (const st of LADYBUG_STATIONS) {
    addFill(new CylinderGeometry(0.079, 0.079, 0.05, 16), fillMotor, st[0], st[1] - 0.035, st[2]);
  }
  // the 6S4P pack: eight 3S1P RS50 bricks under one wrap — the red box
  addFill(new BoxGeometry(0.395, 0.138, 0.36), fillBattery, 0, 0.165, 0);
  addFill(new BoxGeometry(0.18, 0.033, 0.217), fillAvionics, 0, -0.0568, 0);
  // spool winches under the lower plate, port + starboard
  for (const sx of [-1, 1]) {
    addFill(new CylinderGeometry(0.096, 0.096, 0.076, 14), fillShell, sx * 0.212, -0.266, sx * 0.001, 0, 0, Math.PI / 2);
  }

  // ---- battery detail: wrap seam + balance-lead comb ----
  const BAT = new Pen();
  BAT.rect(0, 0.2365, 0, 0.3, 0.27, "xz");                   // shrink-wrap seam
  for (let i = 0; i < 4; i++) {
    BAT.seg([-0.12 + i * 0.08, 0.165, 0.181], [-0.12 + i * 0.08, 0.214, 0.181]);  // pack joins
  }
  const batMat = makeMat(NUM.g1, 0.55, "accent");
  mats.push(batMat);
  group.add(new LineSegments(BAT.lines(), batMat.m));

  // ---- Zubax Myxa ESC boards, pinwheel on the upper plate corners ----
  for (let i = 0; i < 4; i++) {
    const rot = (i * Math.PI) / 2 + Math.PI / 4;
    AV.push().rotateY(rot).translate(0.27, 0.058, 0);
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

  // ---- Raspberry Pi 5 + 26 TOPS AI HAT on the lower plate ----
  const RPI = { x: 0.142, y: -0.081, z: 0.122 };
  AV.push().translate(RPI.x, RPI.y, RPI.z);
  AV.rect(0, 0, 0, 0.178, 0.117, "xz");                    // 85x56 board
  AV.rect(0, 0.036, 0, 0.178, 0.117, "xz");                // AI HAT deck
  for (const [cx, cz] of [[-0.08, -0.049], [0.08, -0.049], [-0.08, 0.049], [0.08, 0.049]]) {
    AV.seg([cx, 0, cz], [cx, 0.036, cz]);                  // standoffs
  }
  // Hailo module + heatsink fins on the HAT, fins along X
  AV.box(-0.02, 0.048, 0, 0.09, 0.022, 0.07);
  for (let f = 0; f < 5; f++) {
    const fz = -0.028 + (f + 0.5) * (0.07 / 5);
    AV.seg([-0.065, 0.059, fz], [0.025, 0.059, fz]);
  }
  // stacked USB + RJ45 on the right edge, USB-C power on the near edge
  AV.box(0.078, 0.012, -0.03, 0.024, 0.024, 0.03);
  AV.box(0.078, 0.012, 0.012, 0.024, 0.024, 0.03);
  AV.rect(-0.05, 0.006, -0.057, 0.02, 0.008, "xy");
  // GPIO comb along the back edge
  for (let g = 0; g < 10; g++) {
    AV.seg([-0.08 + g * 0.011, 0.03, 0.052], [-0.08 + g * 0.011, 0.036, 0.052]);
  }
  AV.pop();
  addFill(new BoxGeometry(0.09, 0.022, 0.07), fillAvionics, RPI.x - 0.02, RPI.y + 0.048, RPI.z);

  // ---- ELRS 915 MHz receiver + dipole whips ----
  const ELRS = { x: -0.162, y: -0.081, z: 0.142 };
  AV.box(ELRS.x, ELRS.y, ELRS.z, 0.045, 0.014, 0.03);
  AV.seg([ELRS.x, ELRS.y, ELRS.z + 0.015], [ELRS.x - 0.05, ELRS.y - 0.09, ELRS.z + 0.09]);
  AV.seg([ELRS.x - 0.05, ELRS.y - 0.09, ELRS.z + 0.09], [ELRS.x - 0.08, ELRS.y - 0.16, ELRS.z + 0.13]);
  AV.seg([ELRS.x + 0.01, ELRS.y, ELRS.z + 0.015], [ELRS.x + 0.06, ELRS.y - 0.08, ELRS.z + 0.1]);

  // ---- GNSS mast on the upper plate corner (clear of the pack) ----
  const GPS = { x: -0.228, y: 0.055, z: 0.208 };
  AV.seg([GPS.x, GPS.y, GPS.z], [GPS.x, GPS.y + 0.15, GPS.z]);
  AV.tube(GPS.x, GPS.y + 0.16, GPS.z, 0.048, 0.022, "y", 2, 6, 12);
  AV.cross(GPS.x, GPS.y + 0.172, GPS.z, 0.03);
  addFill(new CylinderGeometry(0.048, 0.048, 0.022, 12), fillAvionics, GPS.x, GPS.y + 0.16, GPS.z);

  // ---- ARM TUBES: smooth cylinders in CAD (no crease edges survive), so
  // the rails that connect the hub to the motor mounts are drawn here,
  // matched to the real tube line (y -0.017, r 0.029) ----
  for (const st of LADYBUG_STATIONS) {
    const major = Math.abs(st[0]) > Math.abs(st[2]) ? 0 : 2;
    const minor = major === 0 ? 2 : 0;
    const sgn = Math.sign(st[major]);
    const off = st[minor];
    const a: [number, number, number] = [0, ARM_Y, 0];
    const b: [number, number, number] = [0, ARM_Y, 0];
    a[major === 0 ? 0 : 2] = sgn * 0.28;
    b[major === 0 ? 0 : 2] = sgn * 0.9;
    a[minor === 0 ? 0 : 2] = off;
    b[minor === 0 ? 0 : 2] = off;
    // four rails: horizontal pair + vertical pair
    for (const [dy, dm] of [[0.029, 0], [-0.029, 0], [0, 0.029], [0, -0.029]] as const) {
      const aa: [number, number, number] = [a[0], a[1] + dy, a[2]];
      const bb: [number, number, number] = [b[0], b[1] + dy, b[2]];
      if (minor === 0) { aa[0] += dm; bb[0] += dm; } else { aa[2] += dm; bb[2] += dm; }
      P.seg(aa, bb);
    }
    // clamp collars along the tube
    for (const f of [0.34, 0.62, 0.88]) {
      const cx = major === 0 ? sgn * f : off;
      const cz = major === 0 ? off : sgn * f;
      P.circle(cx, ARM_Y, cz, 0.036, major === 0 ? "yz" : "xy", 10);
    }
  }

  // ---- twistlock legs: rods down to the REAL CAD ski hardware ----
  // (the CAD rods are smooth cylinders — no crease edges survive — but the
  // clamps, corner joints and TPU pads do; these rods connect them)
  for (const sgn of [1, -1]) {
    const clamp: [number, number, number] = [-0.211 * sgn, -0.121, 0.21 * sgn];
    const corner: [number, number, number] = [-0.266 * sgn, -0.495, 0.265 * sgn];
    const padA: [number, number, number] = [-0.041 * sgn, -0.541, 0.492 * sgn];
    const padB: [number, number, number] = [-0.493 * sgn, -0.544, 0.041 * sgn];
    // main strut, twin edges
    for (const d of [-0.013, 0.013]) {
      P.seg([clamp[0] + d, clamp[1], clamp[2] - d], [corner[0] + d, corner[1], corner[2] - d]);
    }
    P.circle(clamp[0], clamp[1] - 0.03, clamp[2], 0.02, "xz", 8);
    // the ski: corner out to both TPU pads
    P.seg(corner, padA);
    P.seg(corner, padB);
    S.seg([corner[0], corner[1] - 0.026, corner[2]], [padA[0], padA[1] - 0.016, padA[2]]);
    S.seg([corner[0], corner[1] - 0.026, corner[2]], [padB[0], padB[1] - 0.016, padB[2]]);
  }

  // ---- REAL 22in props (synthesized in the pack), spinning ----
  const props: Group[] = [];
  const propDiscs: Mesh[] = [];
  const propGeo = cadLineGeo(cad.groups.prop, NUM.g2);
  for (const [i, inst] of cad.instances.prop.entries()) {
    const holder = new Group();
    holder.matrixAutoUpdate = false;
    holder.matrix.fromArray(inst.m);
    const spinner = new Group();
    // the pack carries a single CCW blade; the stations the frame loop spins
    // clockwise (odd index) get its mirror image, because a quad flies two
    // CCW and two CW props, not four of one handedness
    if (i % 2 === 1) spinner.scale.x = -1;
    spinner.add(new LineSegments(propGeo, cadProp.m));
    holder.add(spinner);
    group.add(holder);
    props.push(spinner);
  }
  for (const st of LADYBUG_STATIONS) {
    S.circle(st[0], st[1], st[2], PROP_R, "xz", 36);
    propDiscs.push(addLoneFill(new CircleGeometry(PROP_R, 28), fillProp, st[0], st[1], st[2], 0, 0, -Math.PI / 2));
  }

  // ============ SIYI A8 MINI (replaces the CAD placeholder cylinder) =======
  const gimbalYaw = new Group();
  gimbalYaw.position.set(GIMBAL_POS.x, GIMBAL_POS.y, GIMBAL_POS.z);
  const gimbalPitch = new Group();
  gimbalYaw.add(gimbalPitch);
  group.add(gimbalYaw);

  const GSC = 1.3;   // drawn at Zephyrus scale, sized up to this pack
  const GY = new Pen();
  GY.push().scale(GSC);
  GY.tube(0, 0.028, 0, 0.045, 0.05, "y", 2, 8, 12);
  GY.seg([-0.075, -0.01, 0], [0.075, -0.01, 0]);
  GY.seg([-0.075, -0.01, 0], [-0.075, -0.075, 0]);
  GY.seg([0.075, -0.01, 0], [0.075, -0.075, 0]);
  GY.circle(-0.075, -0.075, 0, 0.022, "yz", 10);
  GY.circle(0.075, -0.075, 0, 0.022, "yz", 10);
  GY.rect(0, 0.002, 0.03, 0.05, 0.03, "xz");
  // mount struts up to the gimbal plate
  GY.seg([-0.03, 0.05, 0], [-0.03, 0.014, 0]);
  GY.seg([0.03, 0.05, 0], [0.03, 0.014, 0]);
  GY.pop();
  gimbalYaw.add(new LineSegments(GY.lines(), primary.m));

  const GP = new Pen();
  GP.push().scale(GSC);
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
  GP.pop();
  gimbalPitch.add(new LineSegments(GP.lines(), primary.m));
  const camFill = new Mesh(new BoxGeometry(0.088 * GSC, 0.068 * GSC, 0.073 * GSC), fillAvionics.m);
  camFill.position.set(0, -0.075 * GSC, 0);
  gimbalPitch.add(camFill);
  markers.gimbal = mark(gimbalPitch, 0, -0.075 * GSC, 0.09 * GSC);

  // ================= WINCH DELIVERY LINE (port spool) ======================
  // The spools and MG90S servos are REAL CAD geometry; only the line and the
  // MEDKIT box are drawn. `landed` is a world-space twin that takes over the
  // instant the box releases on the ground, so the aircraft can fly home
  // while the delivery stays put.
  const winchGroup = new Group();
  winchGroup.position.set(WINCH_POS.x, WINCH_POS.y, WINCH_POS.z);
  group.add(winchGroup);

  const W = new Pen();
  W.seg([0, 0.02, 0], [0, -0.045, 0]);                      // line guide
  W.arc(0, -0.052, 0, 0.008, Math.PI * 0.2, Math.PI * 1.4, "xy", 8);
  winchGroup.add(new LineSegments(W.lines(), winchMat.m));

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
  markers.avionics = mark(group, 0, 0.3, 0);
  markers.arm = mark(group, -0.55, 0.05, -0.19);
  markers.motor = mark(group, -0.98, 0.14, -0.19);
  markers.battery = mark(group, 0, 0.29, 0);
  markers.pcb = mark(group, 0, -0.05, 0.06);
  markers.rpi = mark(group, RPI.x, RPI.y + 0.09, RPI.z);
  markers.payload = mark(group, WINCH_POS.x, WINCH_POS.y + 0.02, WINCH_POS.z);
  markers.gps = mark(group, GPS.x, GPS.y + 0.24, GPS.z);

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
