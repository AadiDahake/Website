import { BoxGeometry, BufferGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, FrontSide, Group, LineSegments, Matrix4, Mesh, Quaternion, TorusGeometry, Vector3 } from "three";
import { Pen, makeMat, makeFresnelMat, makeSolidMat, type FadeMat } from "./pen";
import { LADYBUG_STATIONS } from "./ladybug-solid";
import type { CadSolidModel } from "../cad";
import { cadSolidGeo } from "../cad";
import { NUM } from "../theme";
import { mergeSolid, solidAttrs, buildMedkitBox, mark, type Drone } from "./parts";

export type { Drone };

/**
 * LADYBUG — the 2026 aircraft, the REAL airframe, rendered SOLID.
 *
 * The geometry is the team's Onshape assembly, rebuilt for the web by
 * scripts/ladybug-solid-pack.mjs: welded, quadric-decimated to a real
 * millimetre tolerance, given crease-split normals, and carrying Onshape's
 * own part colours plus ray-traced ambient occlusion baked per vertex. The
 * arms, legs, winches and props are stored once and stamped by matrix, so the
 * whole aircraft is seven geometries and about thirty thousand triangles.
 *
 * Everything the CAD does not carry is authored here from primitives and
 * dressed with the same vertex stream, so it shades under the same rig: the
 * SIYI A8 mini gimbal (the CAD's placeholder cylinder is dropped by the pack),
 * the Raspberry Pi 5 + AI HAT, four Zubax Myxa ESC boards, the ELRS 915
 * receiver, an H-RTK GNSS mast, and the winch delivery line + MEDKIT box.
 *
 * Line work survives only where the subject really is a line: the ELRS
 * dipole whips, the winch cable, the search-beam wireframe and the MEDKIT
 * lettering.
 *
 * Scale: 1.0 unit = hub centre to motor centre (0.471 m).
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

/**
 * Shading grade per CAD subsystem. `tag` ties the group to the mission's
 * dimming envelope; `edge` is how hard the warm edge light reads on that
 * subsystem's silhouette; `brand` is how much of the logo gradient bleeds
 * into that edge; `hue` is how much of the Onshape part colour survives the
 * monochrome grade. The props carry the strongest edge because a spinning
 * blade is read entirely from its silhouette.
 */
const CAD_GRADE: Record<string, {
  tag: string, albedo: number, edge: number,
  brand?: number, hue?: number, level?: number, weave?: number, weaveScale?: number,
}> = {
  // white plates and cases, black arms and legs, white blades — the real
  // aircraft's value structure, which is also what separates the subsystems
  // from one another at a glance
  // the plates, arms, legs and blades are all woven prepreg — the twill is
  // real, and it is the detail that reads as carbon at any distance
  frame: { tag: "shell", albedo: 0xd8dce2, edge: 1.5, hue: 0.16, weave: 0.1, weaveScale: 230 },
  // The dark parts are graphite, not black: the ground is no longer #000, so
  // a near-black albedo makes the arms read as holes in the frame rather than
  // as tubes. The edge stroke is a constant PIXEL width, so on something as
  // thin as an arm tube a wide stroke covers the whole diameter and the tube
  // goes brass. These carry a narrower stroke than the plates precisely so
  // their own value — and the twill on it — is what you see.
  arm: { tag: "shell", albedo: 0x363b46, edge: 1.15, hue: 0.18, weave: 0.3, weaveScale: 180 },
  leg: { tag: "soft", albedo: 0x2e333d, edge: 1.05, hue: 0.15, weave: 0.26, weaveScale: 190 },
  winch: { tag: "soft", albedo: 0xc2c8d0, edge: 1.4, hue: 0.2 },
  pixhawk: { tag: "avionics", albedo: 0x49505e, edge: 1.5, brand: 0.4, hue: 0.55 },
  battery: { tag: "accent", albedo: 0xe6e9ee, edge: 1.4, brand: 0.4, hue: 0.3 },
  prop: { tag: "props", albedo: 0xeef1f5, edge: 1.8, brand: 0.25, hue: 0.1, weave: 0.14, weaveScale: 240 },
};

/**
 * Part colours for the procedural additions. Under the flat grade these read
 * as a hint of hue over the greys rather than as literal colour, so they are
 * picked for how they separate from one another, not for accuracy.
 */
const LOOK = {
  alu: 0xc8cfd8,
  blackAno: 0x3a3e46,
  carbon: 0x32373f,
  pcbGreen: 0x3ba87a,
  pcbBlue: 0x3d86c4,
  plastic: 0x4b515c,
  glass: 0x1c212a,
  wrap: 0xdfe3e9,
} as const;

/** Takes the decoded solid pack; callers load it with `loadLadybugSolid()`. */
export function buildLadybug(cad: CadSolidModel): Drone {
  const group = new Group();
  const mats: FadeMat[] = [];
  const markers: Drone["markers"] = {};

  // ======================= REAL CAD, SOLID =================================
  const props: Group[] = [];
  const solidMeshes = new Map<FadeMat, Mesh[]>();
  const track = (fm: FadeMat, mesh: Mesh) => {
    const arr = solidMeshes.get(fm);
    if (arr) arr.push(mesh);
    else solidMeshes.set(fm, [mesh]);
    return mesh;
  };
  for (const name of Object.keys(cad.groups)) {
    const grade = CAD_GRADE[name] ?? CAD_GRADE.frame;
    const cg = cad.groups[name];
    const fm = makeSolidMat(1, grade.tag, {
      albedo: grade.albedo, edge: grade.edge, brand: grade.brand, hue: grade.hue, level: grade.level,
      weave: grade.weave, weaveScale: grade.weaveScale,
      quant: { qs: cg.qs, qo: cg.qo },
    });
    // the CAD group name IS the subsystem name the explorer isolates by
    fm.part = name;
    mats.push(fm);
    // one geometry, stamped at every occurrence: four arms and four props cost
    // one arm and one prop of memory
    const geo = cadSolidGeo(cg);
    for (const inst of cad.instances[name] ?? []) {
      const holder = new Group();
      holder.matrixAutoUpdate = false;
      holder.matrix.fromArray(inst.m);
      if (name === "prop") {
        // the pack orients each prop so +Y is its own rotor axis, and carries
        // a single CCW blade: the stations the frame loop spins clockwise
        // (odd index) get its mirror image, because a quad flies two CCW and
        // two CW props. The negative determinant is fine — three flips the
        // winding, and the shader's modelMatrix normals mirror with it.
        const spinner = new Group();
        if (props.length % 2 === 1) spinner.scale.x = -1;
        spinner.add(track(fm, new Mesh(geo, fm.m)));
        holder.add(spinner);
        props.push(spinner);
      } else {
        holder.add(track(fm, new Mesh(geo, fm.m)));
      }
      group.add(holder);
    }
  }

  // ======================= PROCEDURAL SOLIDS ===============================
  // Everything below is a real part the CAD does not carry. Each subsystem
  // gets one material (so one draw call) and its primitives are merged.
  const shellSolid = makeSolidMat(1, "shell", { edge: 1.5, hue: 1 });
  const avSolid = makeSolidMat(1, "avionics", { edge: 1.5, brand: 0.4, hue: 1 });
  const winchSolid = makeSolidMat(1, "winch", { edge: 1.5, brand: 0.35, hue: 1 });
  // shellSolid carries only the SIYI gimbal; the CAD's shell lives under
  // "frame". Naming them for what they are is what lets the explorer isolate
  // the camera without also isolating half the airframe.
  shellSolid.part = "gimbal";
  avSolid.part = "avionics";
  winchSolid.part = "winch";
  mats.push(shellSolid, avSolid, winchSolid);

  const buckets = new Map<FadeMat, BufferGeometry[]>();
  const place = (
    geo: BufferGeometry, color: number,
    x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, ao = 0.86,
  ) => {
    solidAttrs(geo, color, ao);
    geo.applyMatrix4(new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
      new Vector3(1, 1, 1),
    ));
    return geo;
  };
  const add = (
    fm: FadeMat, geo: BufferGeometry, color: number,
    x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, ao = 0.86,
  ) => {
    const arr = buckets.get(fm);
    const g = place(geo, color, x, y, z, rx, ry, rz, ao);
    if (arr) arr.push(g);
    else buckets.set(fm, [g]);
    return g;
  };

  const AV = new Pen();     // the few genuinely linear avionics details
  const avLine = makeMat(NUM.g3, 0.55, "avionics");
  // the ELRS dipole whips
  avLine.part = "avionics";
  mats.push(avLine);

  // ---- Zubax Myxa ESC boards, pinwheel on the upper plate corners ----
  for (let i = 0; i < 4; i++) {
    const rot = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(rot) * 0.27;
    const cz = -Math.sin(rot) * 0.27;
    add(avSolid, new BoxGeometry(0.097, 0.0035, 0.076), LOOK.pcbGreen, cx, 0.058, cz, 0, rot, 0, 0.7);
    add(avSolid, new BoxGeometry(0.024, 0.005, 0.024), LOOK.blackAno, cx, 0.0615, cz, 0, rot, 0, 0.72);
    for (let f = 0; f < 3; f++) {
      for (const fz of [-0.02, 0.02]) {
        const ox = -0.028 + f * 0.02;
        add(
          avSolid, new BoxGeometry(0.013, 0.004, 0.011), LOOK.blackAno,
          cx + Math.cos(rot) * ox - Math.sin(rot) * fz, 0.0615, cz - Math.sin(rot) * ox - Math.cos(rot) * fz,
          0, rot, 0, 0.66,
        );
      }
    }
  }

  // ---- Raspberry Pi 5 + 26 TOPS AI HAT on the lower plate ----
  const RPI = { x: 0.142, y: -0.081, z: 0.122 };
  add(avSolid, new BoxGeometry(0.178, 0.0035, 0.117), LOOK.pcbGreen, RPI.x, RPI.y, RPI.z, 0, 0, 0, 0.6);
  add(avSolid, new BoxGeometry(0.178, 0.0035, 0.117), LOOK.pcbBlue, RPI.x, RPI.y + 0.036, RPI.z, 0, 0, 0, 0.72);
  for (const [sx, sz] of [[-0.08, -0.049], [0.08, -0.049], [-0.08, 0.049], [0.08, 0.049]] as const) {
    add(avSolid, new CylinderGeometry(0.0045, 0.0045, 0.036, 8), LOOK.alu, RPI.x + sx, RPI.y + 0.018, RPI.z + sz, 0, 0, 0, 0.5);
  }
  // Hailo module under a finned heatsink, fins along X
  add(avSolid, new BoxGeometry(0.09, 0.016, 0.07), LOOK.blackAno, RPI.x - 0.02, RPI.y + 0.046, RPI.z, 0, 0, 0, 0.7);
  for (let f = 0; f < 7; f++) {
    const fz = -0.03 + (f + 0.5) * (0.06 / 7);
    add(avSolid, new BoxGeometry(0.086, 0.014, 0.0035), LOOK.alu, RPI.x - 0.02, RPI.y + 0.061, RPI.z + fz, 0, 0, 0, 0.55);
  }
  // stacked USB + RJ45 on one edge, USB-C power on the near edge
  add(avSolid, new BoxGeometry(0.024, 0.024, 0.03), LOOK.alu, RPI.x + 0.078, RPI.y + 0.012, RPI.z - 0.03, 0, 0, 0, 0.62);
  add(avSolid, new BoxGeometry(0.024, 0.024, 0.03), LOOK.alu, RPI.x + 0.078, RPI.y + 0.012, RPI.z + 0.012, 0, 0, 0, 0.62);
  add(avSolid, new BoxGeometry(0.02, 0.008, 0.01), LOOK.alu, RPI.x - 0.05, RPI.y + 0.006, RPI.z - 0.057, 0, 0, 0, 0.6);
  // the GPIO comb reads as forty tiny pins: one strip is honest and cheap
  add(avSolid, new BoxGeometry(0.11, 0.008, 0.006), LOOK.blackAno, RPI.x - 0.025, RPI.y + 0.006, RPI.z + 0.052, 0, 0, 0, 0.6);

  // ---- ELRS 915 MHz receiver + dipole whips ----
  const ELRS = { x: -0.162, y: -0.081, z: 0.142 };
  add(avSolid, new BoxGeometry(0.045, 0.014, 0.03), LOOK.plastic, ELRS.x, ELRS.y, ELRS.z, 0, 0, 0, 0.62);
  // a whip really is a line — drawing it as a tube would be a lie and a cost
  AV.seg([ELRS.x, ELRS.y, ELRS.z + 0.015], [ELRS.x - 0.05, ELRS.y - 0.09, ELRS.z + 0.09]);
  AV.seg([ELRS.x - 0.05, ELRS.y - 0.09, ELRS.z + 0.09], [ELRS.x - 0.08, ELRS.y - 0.16, ELRS.z + 0.13]);
  AV.seg([ELRS.x + 0.01, ELRS.y, ELRS.z + 0.015], [ELRS.x + 0.06, ELRS.y - 0.08, ELRS.z + 0.1]);

  // ---- H-RTK F9P helical GNSS on a mast, clear of the pack ----
  const GPS = { x: -0.228, y: 0.055, z: 0.208 };
  add(avSolid, new CylinderGeometry(0.0075, 0.0075, 0.15, 10), LOOK.carbon, GPS.x, GPS.y + 0.075, GPS.z, 0, 0, 0, 0.7);
  add(avSolid, new CylinderGeometry(0.048, 0.048, 0.022, 20), LOOK.plastic, GPS.x, GPS.y + 0.16, GPS.z, 0, 0, 0, 0.92);
  add(avSolid, new CylinderGeometry(0.048, 0.042, 0.006, 20), LOOK.blackAno, GPS.x, GPS.y + 0.148, GPS.z, 0, 0, 0, 0.8);

  // ============ SIYI A8 MINI (replaces the CAD placeholder cylinder) =======
  const gimbalYaw = new Group();
  gimbalYaw.position.set(GIMBAL_POS.x, GIMBAL_POS.y, GIMBAL_POS.z);
  const gimbalPitch = new Group();
  gimbalYaw.add(gimbalPitch);
  group.add(gimbalYaw);

  const GSC = 1.3;   // authored at Zephyrus scale, sized up to this pack
  const yawGeos: BufferGeometry[] = [];
  const pitchGeos: BufferGeometry[] = [];
  const S = (v: number) => v * GSC;
  // yaw barrel + the mount plate it hangs from
  yawGeos.push(place(new CylinderGeometry(S(0.045), S(0.045), S(0.05), 24), LOOK.blackAno, 0, S(0.028), 0, 0, 0, 0, 0.72));
  yawGeos.push(place(new BoxGeometry(S(0.05), S(0.006), S(0.03)), LOOK.alu, 0, S(0.002), S(0.03), 0, 0, 0, 0.6));
  // the yoke: cross-beam plus two arms down to the pitch trunnions
  yawGeos.push(place(new BoxGeometry(S(0.16), S(0.012), S(0.016)), LOOK.blackAno, 0, S(-0.01), 0, 0, 0, 0, 0.8));
  for (const sx of [-1, 1]) {
    yawGeos.push(place(new BoxGeometry(S(0.014), S(0.075), S(0.016)), LOOK.blackAno, sx * S(0.075), S(-0.045), 0, 0, 0, 0, 0.72));
    yawGeos.push(place(new CylinderGeometry(S(0.022), S(0.022), S(0.01), 16), LOOK.alu, sx * S(0.075), S(-0.075), 0, 0, 0, Math.PI / 2, 0.6));
  }
  // Pitch body: the camera can, its lens stack and the cooling ring. The lens
  // points along -Y, which is the axis the search beam and the aim solver both
  // treat as the gimbal's boresight — a camera whose glass faces ninety
  // degrees away from its own spotlight reads as broken the moment it is
  // solid rather than line art.
  pitchGeos.push(place(new BoxGeometry(S(0.09), S(0.075), S(0.075)), LOOK.blackAno, 0, S(-0.072), 0, 0, 0, 0, 0.9));
  pitchGeos.push(place(new CylinderGeometry(S(0.028), S(0.028), S(0.05), 24), LOOK.blackAno, 0, S(-0.128), 0, 0, 0, 0, 0.86));
  pitchGeos.push(place(new TorusGeometry(S(0.027), S(0.0035), 8, 24), LOOK.alu, 0, S(-0.143), 0, Math.PI / 2, 0, 0, 0.7));
  pitchGeos.push(place(new CylinderGeometry(S(0.023), S(0.023), S(0.004), 24), LOOK.glass, 0, S(-0.155), 0, 0, 0, 0, 1));
  pitchGeos.push(place(new BoxGeometry(S(0.07), S(0.008), S(0.055)), LOOK.alu, 0, S(-0.032), 0, 0, 0, 0, 0.62));

  gimbalYaw.add(track(shellSolid, new Mesh(mergeSolid(yawGeos)!, shellSolid.m)));
  gimbalPitch.add(track(shellSolid, new Mesh(mergeSolid(pitchGeos)!, shellSolid.m)));
  markers.gimbal = mark(gimbalPitch, 0, S(-0.16), 0);

  // ---- prop blur discs: the one place a translucent fill is the truth ----
  const fillProp = makeFresnelMat(NUM.g2, 0.07, "props", FrontSide);
  fillProp.part = "prop";
  mats.push(fillProp);
  const propDiscs: Mesh[] = [];
  for (const st of LADYBUG_STATIONS) {
    const disc = new Mesh(new CircleGeometry(PROP_R, 32), fillProp.m);
    disc.position.set(st[0], st[1], st[2]);
    disc.rotation.z = -Math.PI / 2;
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);
    propDiscs.push(disc);
  }

  // ================= WINCH DELIVERY LINE (port spool) ======================
  // The spools and MG90S servos are REAL CAD geometry; only the line and the
  // MEDKIT box are drawn here. `landed` is a world-space twin that takes over
  // the instant the box releases, so the aircraft can fly home without it.
  const winchGroup = new Group();
  winchGroup.position.set(WINCH_POS.x, WINCH_POS.y, WINCH_POS.z);
  group.add(winchGroup);

  const winchMat = makeMat(NUM.fg, 0.7, "winch");
  const winchText = makeMat(NUM.g1, 0.95, "winch");
  winchMat.part = "winch";   // the delivery line
  winchText.part = "winch";  // MEDKIT lettering on the box
  mats.push(winchMat, winchText);

  add(winchSolid, new CylinderGeometry(0.008, 0.008, 0.065, 10), LOOK.alu, WINCH_POS.x, WINCH_POS.y - 0.012, WINCH_POS.z, 0, 0, 0, 0.55);

  // cable: unit segment scaled by the frame loop
  const cableGeo = new BufferGeometry();
  cableGeo.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 0, -1, 0], 3));
  const cable = new LineSegments(cableGeo, winchMat.m);
  cable.position.y = -0.05;
  cable.frustumCulled = false;
  winchGroup.add(cable);

  /** The payload: a solid case with a sling loop, plus stroked lettering. */
  const medkit = (host: Group) => {
    const shell = mergeSolid([
      place(new BoxGeometry(0.21, 0.21, 0.21), LOOK.wrap, 0, 0, 0, 0, 0, 0, 0.92),
      place(new BoxGeometry(0.216, 0.012, 0.216), LOOK.blackAno, 0, 0.098, 0, 0, 0, 0, 0.8),
      place(new TorusGeometry(0.016, 0.0035, 6, 14), LOOK.alu, 0, 0.128, 0, Math.PI / 2, 0, 0, 0.75),
    ])!;
    host.add(track(winchSolid, new Mesh(shell, winchSolid.m)));
    const BP = new Pen();
    const BT = new Pen();
    buildMedkitBox(BP, BT);
    host.add(new LineSegments(BT.lines(), winchText.m));
  };

  const boxG = new Group();
  medkit(boxG);
  boxG.position.y = -0.155;
  winchGroup.add(boxG);
  markers.drop = mark(boxG, 0, 0, 0.13);

  const landed = new Group();
  medkit(landed);
  landed.visible = false;

  // ================= SEARCH BEAM ===========================================
  // The beam carries NO geometry of its own. Its cone is drawn by the
  // screen-space spotlight inversion (lib/hero/invert.ts), which flips
  // everything the cone covers; a wireframe cone and a translucent fill drawn
  // here as well would just be a second, weaker cone sitting inside the real
  // one. What survives is an empty Group whose world transform the inversion
  // reads for the cone's apex, axis and spread, and the two materials the
  // mission timeline still drives.
  const beam = new Group();
  const beamMat = makeMat(0xfff3e0, 0.0, "beam");
  const beamFillMat = makeFresnelMat(0xfff3e0, 0.0, "beam", FrontSide);
  mats.push(beamMat, beamFillMat);
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

  // ---- merge the procedural buckets: one draw call per subsystem ----
  const fillMeshes = new Map<FadeMat, Mesh>();
  for (const [fm, geos] of buckets) {
    const merged = mergeSolid(geos);
    if (!merged) continue;
    const mesh = new Mesh(merged, fm.m);
    group.add(mesh);
    fillMeshes.set(fm, mesh);
    track(fm, mesh);
  }
  group.add(new LineSegments(AV.lines(), avLine.m));

  return {
    group, props, propDiscs, gimbalYaw, gimbalPitch, beam, beamMat, beamFillMat,
    mats, fillMeshes, solidMeshes, markers,
    winch: { group: winchGroup, cable, boxG, landed },
  };
}
