/**
 * The pickable subsystems of Ladybug.
 *
 * This sits in its own module, free of any three.js import, so the component
 * can render the part list — and its labels, hues and specs — in the server
 * pass and in the entry bundle, while the renderer that actually knows how to
 * highlight them stays behind a dynamic import.
 *
 * Every `key` must match a `part` that some material in
 * lib/hero/ladybug-drone.ts carries, or that entry will never light up.
 */

export interface LadybugPart {
  key: string;
  label: string;
  spec: string;
  hue: "cyan" | "violet" | "magenta";
}

/** In walkaround order: outside in, then the structure that carries it all. */
export const LADYBUG_PARTS: LadybugPart[] = [
  {
    key: "prop",
    label: "Propellers",
    hue: "cyan",
    spec: "4x NS 24x7.2 carbon fibre, folding",
  },
  {
    key: "arm",
    label: "Arms and motors",
    hue: "cyan",
    spec: "4x T-Motor MN7005 AT, 230 KV, on draw-latched carbon arms",
  },
  {
    key: "battery",
    label: "Flight pack",
    hue: "magenta",
    spec: "8x 3S1P RS50 packs wired as 6S4P, 20 Ah",
  },
  {
    key: "pixhawk",
    label: "Flight controller",
    hue: "magenta",
    spec: "Pixhawk 6X running PX4",
  },
  {
    key: "avionics",
    label: "Compute and radio",
    hue: "cyan",
    spec: "Raspberry Pi 5 + 26 TOPS AI HAT, Myxa ESCs, ELRS 915 MHz, H-RTK GNSS",
  },
  {
    key: "gimbal",
    label: "Gimbal and camera",
    hue: "violet",
    spec: "SIYI A8 mini, three-axis stabilized, 4K zoom",
  },
  {
    key: "winch",
    label: "Delivery winches",
    hue: "magenta",
    spec: "2x MG90S spool winches, two independent lines",
  },
  {
    key: "frame",
    label: "Airframe",
    hue: "violet",
    spec: "Carbon fibre plate stack with printed fittings",
  },
  {
    key: "leg",
    label: "Landing gear",
    hue: "violet",
    spec: "Twistlock legs on printed TPU ski feet",
  },
];
