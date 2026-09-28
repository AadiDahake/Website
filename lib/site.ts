/**
 * Config-as-data. Content invariants live here, not in templates, so a
 * redesign cannot silently break a link, an address, or a headline number.
 */

export interface NavSub { title: string; link: string }
export interface NavItem { title: string; link?: string; subPages?: NavSub[] }

export const NAV: NavItem[] = [
  {
    title: "About",
    subPages: [
      { title: "About AmadorUAVs", link: "/about" },
      { title: "The Team", link: "/team" },
    ],
  },
  // Aircraft are grouped and year-labelled so the fleet reads chronologically
  // rather than as two unrelated top-level tabs. Design documentation is not
  // a page of its own any more — it lives on the Ladybug page.
  {
    title: "Aircraft",
    subPages: [
      { title: "Ladybug ('26)", link: "/ladybug" },
      { title: "Zephyrus ('25)", link: "/zephyrus" },
    ],
  },
  // Testing used to be reachable only from a footnote at the bottom of an
  // aircraft page, and visitors were not finding it. It is a top-level tab
  // now because the test programme is a third of what the team actually does.
  {
    title: "Testing",
    subPages: [
      { title: "Flight Testing", link: "/drone-testing" },
      { title: "Payload Testing", link: "/payload-testing" },
    ],
  },
  { title: "Sponsor", link: "/sponsor" },
  { title: "Contact Us", link: "/join" },
];

export const LINKS = {
  suas: "https://auvsi-suas.org/",
  // Both forges are live: PX4 and Dronecode work goes upstream through
  // GitHub, and the older club repositories are still on GitLab. Anything
  // user-facing links GitHub first.
  github: "https://github.com/amadoruavs",
  gitlab: "https://gitlab.com/amadoruavs",
} as const;

export const ORG = {
  name: "AmadorUAVs",
  legalName: "AmadorUAVs Group",
  location: "Pleasanton, CA",
  email: "officers@amadoruavs.com",
  ein: "99-4292368",
  years: "2018 - 2026",
} as const;

/**
 * Ladybug, the 2026 competition aircraft, as built. These are the numbers
 * the walkaround and spec ledger annotate — they must stay checkable
 * against the airframe.
 */
export const LADYBUG = {
  motors: "T-Motor MN7005 AT, 230 KV (4x)",
  esc: "Zubax Myxa A0, FOC, CAN telemetry (4x)",
  fc: "Pixhawk 6X",
  rc: "ExpressLRS, 915 MHz",
  companion: "Raspberry Pi 5 with 26 TOPS AI HAT",
  battery: "8x 3S1P RS50 packs -> 6S4P, 20 Ah",
  props: "NS 24x7.2, carbon fibre, folding",
  gimbal: "SIYI A8 mini, three-axis stabilized",
  payload: "2x MG90S spool winches, independent lines",
  autopilot: "PX4",
  gcs: "QGroundControl",
  sim: "Gazebo",
} as const;

/**
 * Zephyrus, the 2025 aircraft, as documented in the 2024-25 SUAS Technical
 * Design Report.
 * Every value here is quoted from that report — these are the numbers the
 * teardown page annotates, so they must stay checkable.
 */
export const ZEPHYRUS = {
  motors: "T-Motor MN 601-S, 320 KV",
  esc: "Zubax Myxa A0, FOC",
  fc: "Pixhawk 6x",
  radio: "RFD 900",
  gnss: "H-RTK F9P, helical antenna",
  battery: "2S2P, 18,000 mAh at 22.2 V nominal",
  cell: "3S 9000 mAh",
  powerLimit: "under 100 Wh",
  arm: "22 in, carry-on longest dimension",
  gimbal: "SIYI A8 mini, three-axis stabilized",
  gimbalFilament: "Polymaker PA6 CF-20 (Fiberon), 80% PA6 nylon, 20% carbon fibre",
  camera: "SIYI A8 mini 4K; Alvium 1800 U-2460 for mapping",
  sensor: "Sony IMX540, 5328 x 4608",
  companion: "NVIDIA Jetson Orin NX",
  detector: "YOLOWorld, about 20 FPS on the Jetson, 52.0 mAP on COCO",
  cluster: "DBSCAN",
  autopilot: "PX4",
  gcs: "QGroundControl",
  servo: "MG90",
  sim: "Gazebo",
} as const;
