<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/electromech/drone-banner.webp" alt="Zephyrus sitting on the ground with props on, minutes before takeoff">
      </template>
      <h1>Zephyrus ('25)<span class="grad-text">.</span></h1>
      <h2>
        SUAS 2025. It flew autonomous missions and packed into a carry-on.
      </h2>
    </PageSection>

    <!-- the walkaround: an autoplay dive through every major component,
         ending in a crash-zoom back out to the whole aircraft -->
    <ZephTour />

    <!-- headline numbers -->
    <PageSection>
      <div class="zstats" data-reveal-group>
        <div class="zstat"><span class="zstat-n num" data-count="5" data-suffix=" MIN">0</span><span class="label">Assembly time</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="30" data-suffix=" MPH">0</span><span class="label">Max speed</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="20" data-suffix=" LBS">0</span><span class="label">Drone weight</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="4" data-suffix=" MI">0</span><span class="label">Flight range</span></div>
      </div>
    </PageSection>

    <!-- 2D schematic: the drawing draws itself -->
    <PageSection>
      <div class="split">
        <div class="schematic" aria-hidden="true">
          <ZephPackedIso />
        </div>
        <div>
          <p class="label eyebrow">The 2025 aircraft</p>
          <h2 class="z-head">The airframe goes together with no screws in five minutes.</h2>
          <p>
            PX4 flew GPS missions with onboard detection and a spool drop.
            The airframe was carbon and TPU. It is retired. What we learned went into
            <NuxtLink to="/ladybug" class="z-next">Ladybug ('26)</NuxtLink>.
          </p>
        </div>
      </div>
    </PageSection>

    <!-- systems, condensed -->
    <PageSection section-id="systems">
      <p class="label eyebrow">Systems</p>
      <div class="grid-hair cols-2">
        <div v-for="s in systems" :key="s.title" class="cell zsys" :data-hue="s.hue" data-reveal>
          <p class="label zsys-tag">{{ s.tag }}</p>
          <h3>{{ s.title }}</h3>
          <p class="zsys-body">{{ s.body }}</p>
          <ul class="zsys-chips">
            <li v-for="c in s.chips" :key="c" class="label">{{ c }}</li>
          </ul>
        </div>
      </div>
    </PageSection>

    <!-- testing: the staged pipeline every subsystem went through -->
    <PageSection section-id="testing">
      <p class="label eyebrow">Testing</p>
      <h2 class="ztest-head">Sim first, then flown.</h2>

      <div class="zpipe" data-reveal-group>
        <div v-for="stage in pipeline" :key="stage.n" class="zpipe-stage" :data-hue="stage.hue">
          <span class="zpipe-n num">{{ stage.n }}</span>
          <p class="label zpipe-tag">{{ stage.tag }}</p>
          <h3>{{ stage.title }}</h3>
          <p class="zpipe-body">{{ stage.body }}</p>
        </div>
      </div>

      <div class="ztest-detail" data-reveal>
        <p class="label ztest-detail-label">Full test log</p>
        <Accordian1 :rtl="false" :sections="droneSections" />
      </div>
    </PageSection>

    <!-- the aircraft in the field: same section, same order, as Ladybug -->
    <PageSection section-id="gallery">
      <p class="label eyebrow">In the field</p>
      <PhotoGallery :shots="gallery" />
    </PageSection>

    <!-- full spec ledger -->
    <PageSection section-id="specs">
      <p class="label eyebrow">Component specs</p>
      <div class="zspec">
        <div v-for="row in specs" :key="row[1]" class="row">
          <span class="idx label">{{ row[0] }}</span>
          <span class="zspec-c">{{ row[1] }}</span>
          <span class="zspec-v num">{{ row[2] }}</span>
        </div>
      </div>
    </PageSection>

    <!-- the lineage link, pointing forward: Ladybug carries the same row
         pointing back, so either aircraft page ends with the other one -->
    <PageSection>
      <NuxtLink to="/ladybug" class="zprev" data-reveal>
        <span class="label zprev-tag">Lineage</span>
        <span class="zprev-title">Ladybug ('26)</span>
        <span class="label zprev-arrow" aria-hidden="true">&rarr;</span>
      </NuxtLink>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import zephAir from "~/assets/images/electromech/zephyrus-air.webp";
import zephGround from "~/assets/images/electromech/zephyrus-ground.webp";
import droneFrame from "~/assets/images/electromech/drone-frame.webp";
import payload from "~/assets/images/electromech/payload.webp";
import droneTesting from "~/assets/images/general/drone-testing-2025.webp";
import sim from "~/assets/images/software/sim.webp";

useHead({ title: "Zephyrus ('25)" });

/** Same contact sheet the Ladybug page runs, in the same slot, so the two
 *  aircraft pages read as one document rather than two write-ups. */
const gallery: GalleryShot[] = [
  {
    src: zephAir,
    alt: "Zephyrus in the air over the test field with all four props turning",
    caption: "In the hover at the test field",
  },
  {
    src: zephGround,
    alt: "Zephyrus sitting on the ground with props fitted, before a flight",
    caption: "On the line, ready to fly",
  },
  {
    src: droneFrame,
    alt: "The bare carbon fibre frame of Zephyrus on the workbench during assembly",
    caption: "The screwless carbon frame, mid build",
  },
  {
    src: payload,
    alt: "The spool payload release mechanism mounted under the aircraft",
    caption: "The spool drop, mounted up",
  },
  {
    src: droneTesting,
    alt: "A safety pilot on the transmitter during an evening flight trial in 2025",
    caption: "Evening flight trial, 2025",
  },
  {
    src: sim,
    alt: "A Gazebo simulation window showing the aircraft flying a mission in PX4 software-in-the-loop",
    caption: "The same mission, flown in Gazebo first",
  },
];

const systems = [
  {
    tag: "Software",
    hue: "cyan",
    title: "Flight software",
    body: "PX4 and QGroundControl flew the mission. A Jetson Orin NX ran detection at about 20 FPS and fired the drop over MAVLink. Every plan flew in Gazebo SITL first.",
    chips: ["PX4", "QGroundControl", "Jetson Orin NX", "YOLOWorld", "DBSCAN", "MAVLink"],
  },
  {
    tag: "Mechanical",
    hue: "violet",
    title: "Frame and mechanisms",
    body: "The frame was carbon plates with TPU inserts. Latching clamps and clip-in legs meant no screws. A servo spool handled the drop. FEA ran in Onshape then the airframe went to the field.",
    chips: ["Carbon fibre", "TPU inserts", "Latching clamps", "Spool drop", "SIYI A8 mini"],
  },
  {
    tag: "Electrical",
    hue: "magenta",
    title: "Power and radio",
    body: "The pack was a 2S2P LiPo at 22.2 V and 18,000 mAh. Custom boards made the 5 V and 15 V rails. MN 601-S motors ran on Zubax Myxas with FOC and CAN telemetry.",
    chips: ["22.2 V · 18,000 mAh", "MN 601-S", "Zubax Myxa", "Pixhawk 6X", "RFD900"],
  },
  {
    tag: "Imaging",
    hue: "cyan",
    title: "Gimbal and camera",
    body: "A SIYI A8 mini handled 4K zoom. We also built a two-axis FOC gimbal in PA6 CF-20 for the Alvium 1800 (IMX540 at 5328x4608).",
    chips: ["SIYI A8 mini", "3-axis · 4K", "Team-built 2-axis FOC", "Alvium 1800 U-2460", "IMX540 · 5328x4608"],
  },
];

const specs = [
  ["POWER", "Battery", "2S2P (6S LiPo), 22.2V, 18,000 mAh"],
  ["POWER", "Distribution", "Custom regulator board, 5V and 15V outputs"],
  ["PROPULSION", "Motors", "T-Motor MN 601-S, brushless, 320 KV"],
  ["PROPULSION", "ESCs", "Zubax Myxa, FOC, CAN Bus telemetry"],
  ["PROPULSION", "Tuning", "Ecalc simulation for thrust and endurance"],
  ["AVIONICS", "Flight controller", "Pixhawk 6X"],
  ["AVIONICS", "Telemetry", "RFD900 long-range radio"],
  ["AVIONICS", "GNSS", "H-RTK F9P, helical antenna, dual GPS"],
  ["AVIONICS", "Protocols", "MAVLink and serial"],
  ["COMPUTE", "Companion", "Jetson Orin NX, ~20 FPS onboard detection"],
  ["PAYLOAD", "Servo", "MG90s micro servo release"],
  ["PAYLOAD", "Drop system", "Spool with directional winding, TPU dampers"],
  ["GIMBAL", "Primary", "SIYI A8 mini, 3-axis stabilized, 4K zoom"],
  ["GIMBAL", "Mapping mount", "Team-built 2-axis brushless FOC, PA6 CF-20 frame"],
  ["GIMBAL", "Stabilization", "Gyro-based real-time alignment"],
  ["STRUCTURE", "Frame", "Carbon fibre plates, TPU shock absorption"],
  ["STRUCTURE", "Validation", "Onshape FEA for load and torque"],
];

const pipeline = [
  {
    n: "01",
    tag: "Software-in-the-loop",
    hue: "magenta",
    title: "Simulate",
    body: "The mission flew in Gazebo against PX4 SITL. Routing and RTL were proven there first.",
  },
  {
    n: "02",
    tag: "Hardware-in-the-loop",
    hue: "violet",
    title: "Ground test",
    body: "Real sensors sat on the sim stack. The drop was proven off a 68 ft structure.",
  },
  {
    n: "03",
    tag: "Safety-piloted",
    hue: "cyan",
    title: "Fly",
    body: "We built up to three-mile rehearsals. Waypoints and wind were graded with a safety pilot on the sticks.",
  },
  {
    n: "04",
    tag: "Post-flight",
    hue: "magenta",
    title: "Read the logs",
    body: "We pulled the PX4 log after every flight. Fixes went into servo timing and the TPU dampers.",
  },
];

const droneSections = [
  {
    title: "Flight testing",
    content: `<div class="ztl">
      <div><h2>Missions</h2>
      <p>We flew QGroundControl plans and logged which waypoints it hit and what broke.</p></div>
      <div><h2>Sensors</h2>
      <p>GPS accels and gyros were calibrated before flying.</p></div>
      <div><h2>Wind</h2>
      <p>We flew hover and response tests so we could catch overcorrection.</p></div>
    </div>`,
  },
  {
    title: "Simulation",
    content: `<div class="ztl">
      <div><h2>Gazebo, PX4 SITL</h2>
      <p>Routing and RTL flew in simulation first. Those were the cases we did not want to meet in the air.</p></div>
      <div><h2>Why sim first</h2>
      <p>Sim time is free. Flight time is not.</p></div>
    </div>`,
    image: sim,
  },
  {
    title: "Payload",
    content: `<div class="ztl">
      <div><h2>Spool</h2>
      <p>Directional winding slowed the payload at release so placement was tighter.</p></div>
      <div><h2>Servos</h2>
      <p>MG90s were tested at different weights. TPU dampers were checked for vibration.</p></div>
    </div>`,
  },
];
</script>

<style scoped>
.zstats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

@media (max-width: 700px) {
  .zstats { grid-template-columns: repeat(2, 1fr); }
}

.zstat {
  background: var(--bg);
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.zstat-n { font-family: var(--mono); font-size: 1.7rem; color: var(--fg); }

.schematic {
  position: relative;
  border: 1px solid var(--line-soft);
  background:
    radial-gradient(60% 60% at 50% 45%, rgb(var(--g2-rgb) / 0.08), transparent 75%);
  padding: 1rem;
  animation: z-float 7s ease-in-out infinite alternate;
}

@keyframes z-float {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}

.z-head { font-size: var(--size-head); margin-bottom: 1rem; }

.z-next {
  color: var(--g3);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.zsys-tag { color: var(--hue); margin-bottom: 0.6rem; }
.zsys h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.zsys-body { color: var(--fg-soft); }

.zsys-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0.9rem 0 0;
}

.zsys-chips li {
  border: 1px solid var(--line);
  padding: 0.2rem 0.5rem;
  color: var(--hue);
}

.zspec { border: 1px solid var(--line-soft); border-bottom: 0; }
.zspec .row { margin: 0; }
.zspec .idx { width: 7.5rem; flex-shrink: 0; }
.zspec-c { color: var(--fg); font-weight: 500; width: 12rem; flex-shrink: 0; }
.zspec-v { color: var(--fg-soft); }

@media (max-width: 640px) {
  .zspec .row { flex-wrap: wrap; }
  .zspec-c, .zspec .idx { width: auto; }
}

.ztest-head {
  font-size: clamp(2.1rem, 5.5vw, 3.5rem);
  max-width: 20ch;
  text-wrap: balance;
  margin-bottom: 1.1rem;
}

.ztest-intro { max-width: 62ch; margin-bottom: 0; }

/* the pipeline: numbered stages linked by a thin gradient run */
.zpipe {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  margin: 2.6rem 0 3rem;
}

@media (min-width: 780px) {
  .zpipe { flex-direction: row; align-items: stretch; }
}

.zpipe-stage {
  position: relative;
  flex: 1;
  background: var(--bg-2);
  border: 1px solid var(--line-soft);
  padding: 1.8rem 1.5rem 1.6rem;
  transition: border-color 200ms linear, transform 200ms cubic-bezier(0.33, 0, 0.2, 1);
}

.zpipe-stage:hover {
  border-color: var(--hue);
  transform: translateY(-3px);
}

.zpipe-stage:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 1.7rem;
  bottom: -1.8rem;
  width: 1px;
  height: 1.8rem;
  background: var(--grad);
  opacity: 0.55;
}

@media (min-width: 780px) {
  .zpipe-stage:not(:last-child)::after {
    left: auto;
    right: -1.8rem;
    bottom: auto;
    top: 2.5rem;
    width: 1.8rem;
    height: 1px;
  }
}

.zpipe-n {
  display: block;
  font-family: var(--mono);
  font-size: clamp(2.2rem, 4.5vw, 2.8rem);
  line-height: 1;
  color: var(--faint);
  margin-bottom: 0.9rem;
  transition: color 200ms linear;
}

.zpipe-stage:hover .zpipe-n { color: var(--hue); }

.zpipe-tag { color: var(--hue); margin-bottom: 0.6rem; }
.zpipe-stage h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }
.zpipe-body { color: var(--fg-soft); margin: 0; }

.ztest-detail { margin-top: 3rem; }
.ztest-detail-label { margin-bottom: 1rem; }

:deep(.ztl) { display: flex; flex-direction: column; gap: 1.1rem; }
:deep(.ztl h2) { font-size: 1.02rem; margin-bottom: 0.25rem; color: var(--fg); }
:deep(.ztl p) { margin: 0; color: var(--fg-soft); }
:deep(.ztl > div) { border-left: 2px solid var(--g2); padding-left: 0.9rem; }

/* lineage row — the mirror of the one at the foot of the Ladybug page */
.zprev {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border: 1px solid var(--line);
  padding: 1rem 1.2rem;
  transition: background 160ms linear, border-color 160ms linear;
}

.zprev:hover { background: var(--bg-2); border-color: var(--g2); }
.zprev-tag { color: var(--g3); flex-shrink: 0; }
.zprev-title { color: var(--fg); font-weight: 600; }
.zprev-arrow { margin-left: auto; color: var(--faint); transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1); }
.zprev:hover .zprev-arrow { transform: translateX(4px); color: var(--g3); }
</style>
