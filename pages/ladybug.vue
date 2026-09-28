<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/ladybug/field-sunset.webp" alt="">
      </template>
      <h1>Ladybug ('26)<span class="grad-text">.</span></h1>
      <h2>
        Ladybug is the heavy-lift quad for SUAS 2026. It has latching carbon arms and two winches.
      </h2>
    </PageSection>

    <!-- The CAD model in full colour, parked. It used to fly a camera tour of
         itself; a model you can stop, turn, and take apart reads better than
         one that moves on its own, so the reader drives it now. -->
    <LadybugExplorer />

    <!-- straight from the line art to the real thing, in the air -->
    <PageSection>
      <figure class="lb-lead">
        <img
          src="~/assets/images/ladybug/in-flight.webp"
          alt="Ladybug hovering a few metres up over the outfield of a baseball diamond, all four 24-inch props turning, red centre body and orange and blue ski feet clearly visible against a blue sky"
          width="629"
          height="839"
          loading="lazy"
          decoding="async"
        >
        <figcaption>
          <p class="label lb-lead-tag">The aircraft</p>
          <p class="lb-lead-cap">
            This is a hover during a test. The latching arms and the twin winches and the nose gimbal are all on the aircraft.
          </p>
        </figcaption>
      </figure>
    </PageSection>

    <!-- headline numbers -->
    <PageSection>
      <!-- Mission numbers, not part numbers: how long it stays up, how much
           it can find, how much it can deliver. Prop diameter used to sit
           here, and it is a consequence of the endurance target rather than
           a figure anyone is scored on. -->
      <div class="zstats" data-reveal-group>
        <div class="zstat"><span class="zstat-n num" data-count="22" data-suffix=" MIN">0</span><span class="label">Endurance, mission weight</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="20" data-suffix=" AH">0</span><span class="label">Flight pack</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="26" data-suffix=" TOPS">0</span><span class="label">Onboard AI compute</span></div>
        <div class="zstat"><span class="zstat-n num" data-count="2" data-suffix=" DROPS">0</span><span class="label">Deliveries per flight</span></div>
      </div>
    </PageSection>

    <!-- 2D schematic straight from the CAD extraction -->
    <PageSection>
      <div class="split">
        <!-- The shaded CAD render, not the generated wireframe. The line art
             is the right language for the hero, where it is moving and being
             flown; here the reader has stopped to work out what the aircraft
             actually is, and a rendered assembly answers that in one look. -->
        <figure class="schematic">
          <img
            src="~/assets/images/ladybug/cad-render.webp"
            alt="Rendered CAD view of Ladybug from a low three-quarter angle: four black carbon arms out to blue folding propellers, the plate-stack centre body with the red printed ESC housings and the battery pack on top, the gimbal under the nose and the twistlock legs on their ski feet below"
            width="1454"
            height="720"
            loading="lazy"
            decoding="async"
          >
        </figure>
        <div>
          <p class="label eyebrow">Current aircraft</p>
          <h2 class="z-head">PX4 flies it. The Pi finds the targets.</h2>
          <p>
            A Pixhawk 6X flies it and a Pi 5 with a 26 TOPS AI HAT finds the targets.
            Two spool winches sit under the belly. We built the latching carbon arms and the 6S4P pack.
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

    <!-- why it is built this way: every decision opens into the long form -->
    <PageSection section-id="decisions">
      <p class="label eyebrow">Design decisions</p>
      <h2 class="ztest-head">The trades.</h2>
      <DesignDecisions :decisions="decisions" />
    </PageSection>

    <!-- how any aircraft here gets made (was the Design Documentation page) -->
    <PageSection section-id="process">
      <p class="label eyebrow">The process</p>
      <h2 class="ztest-head">Four steps.</h2>
      <div class="zpipe" data-reveal-group>
        <div v-for="s in process" :key="s.n" class="zpipe-stage" :data-hue="s.hue">
          <span class="zpipe-n num">{{ s.n }}</span>
          <p class="label zpipe-tag">{{ s.tag }}</p>
          <h3>{{ s.title }}</h3>
          <p class="zpipe-body">{{ s.body }}</p>
        </div>
      </div>
    </PageSection>

    <!-- the season, entry by entry (was the Design Documentation page) -->
    <PageSection section-id="build-log">
      <p class="label eyebrow">Build log · Ladybug ('26)</p>
      <div class="zdec" data-reveal-group>
        <div v-for="e in buildLog" :key="e.when + e.title" class="row" :data-hue="e.hue">
          <span class="idx label">{{ e.when }}</span>
          <span class="zdec-what">{{ e.title }}</span>
          <span class="zdec-why">{{ e.detail }}</span>
        </div>
      </div>
      <p class="lb-note">
        Full numbers are in the TDP.
      </p>
    </PageSection>

    <!-- testing: a staged pipeline, not an afterthought -->
    <PageSection section-id="testing">
      <p class="label eyebrow">Testing</p>
      <h2 class="ztest-head">Sim first, then the field.</h2>

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

      <p class="lb-note">
        Procedures:
        <NuxtLink to="/drone-testing">flight testing</NuxtLink> and
        <NuxtLink to="/payload-testing">payload testing</NuxtLink>.
      </p>
    </PageSection>

    <!-- the aircraft in the field: real build, real flights -->
    <PageSection section-id="gallery">
      <p class="label eyebrow">In the field</p>
      <PhotoGallery :shots="gallery" />
    </PageSection>

    <!-- full spec ledger -->
    <PageSection section-id="specs">
      <p class="label eyebrow">Component specs</p>
      <div class="zspec">
        <div v-for="row in specs" :key="row[1] + row[2]" class="row">
          <span class="idx label">{{ row[0] }}</span>
          <span class="zspec-c">{{ row[1] }}</span>
          <span class="zspec-v num">{{ row[2] }}</span>
        </div>
      </div>
    </PageSection>

    <!-- the previous aircraft stays on the record -->
    <PageSection>
      <NuxtLink to="/zephyrus" class="zprev" data-reveal>
        <span class="label zprev-tag">Lineage</span>
        <span class="zprev-title">Zephyrus ('25)</span>
        <span class="label zprev-arrow" aria-hidden="true">&rarr;</span>
      </NuxtLink>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import propsTop from "~/assets/images/ladybug/props-top.webp";
import frontSunset from "~/assets/images/ladybug/front-sunset.webp";
import grassLevel from "~/assets/images/ladybug/grass-level.webp";
import cadSession from "~/assets/images/ladybug/cad-session.webp";
import fieldSunset from "~/assets/images/ladybug/field-sunset.webp";
import inFlight from "~/assets/images/ladybug/in-flight.webp";
import landingGear from "~/assets/images/ladybug/landing-gear.webp";
import winchesCad from "~/assets/images/ladybug/winches-cad.webp";
import payloadBayCad from "~/assets/images/ladybug/payload-bay-cad.webp";
import soldering from "~/assets/images/electromech/soldering.webp";
import sim from "~/assets/images/software/sim.webp";

useHead({ title: "Ladybug ('26)" });

const systems = [
  {
    tag: "Software",
    hue: "cyan",
    title: "Flight software",
    body: "PX4 and QGroundControl fly the mission. A Pi 5 with a 26 TOPS AI HAT does detection and fires the winches over MAVLink. Every plan flies in Gazebo SITL first.",
    chips: ["PX4", "QGroundControl", "Raspberry Pi 5", "26 TOPS AI HAT", "MAVLink", "Gazebo SITL"],
  },
  {
    tag: "Mechanical",
    hue: "violet",
    title: "Frame and mechanisms",
    body: "The frame is carbon plates and tubes with printed fittings. Draw latches and MR60s put the arms on with no tools. Twistlock legs on TPU skis carry the airframe and two spool winches hang under the belly.",
    chips: ["Carbon fibre", "Draw latches", "MR60 connectors", "Twistlock legs", "Twin spool winches"],
  },
  {
    tag: "Electrical",
    hue: "magenta",
    title: "Power and radio",
    body: "Eight 3S1P RS50 packs are wired as a 6S4P pack at 20 Ah. MN7005 ATs run on Zubax Myxa A0s with CAN telemetry. The safety pilot is on ELRS at 915 MHz.",
    chips: ["6S4P · 20 Ah", "MN7005 AT · 230 KV", "Zubax Myxa A0", "Pixhawk 6X", "ELRS 915 MHz"],
  },
  {
    tag: "Imaging",
    hue: "cyan",
    title: "Gimbal and camera",
    body: "A SIYI A8 mini sits under the nose. It is a three-axis 4K zoom gimbal and it feeds the Pi.",
    chips: ["SIYI A8 mini", "3-axis · 4K", "Quick-release mount", "Onboard detection"],
  },
];

/**
 * The design decisions, long form. `why` is the one-liner the row shows
 * collapsed; `detail` is what a judge gets when they open it — the options
 * considered, what the choice cost, and how it was proven.
 */
const decisions: DesignDecision[] = [
  {
    tag: "PROPULSION",
    hue: "cyan",
    what: "MN7005 AT motors on 24-inch props",
    why: "A bigger disc draws less current.",
    detail: `
      <p>
        We used the biggest disc we could fit and the lowest KV that could spin it.
        Faster smaller props drew too many amps. A hex would have meant two extra
        arms and two extra ESCs. We run 230 KV on 6S with folding hubs. The 20 Ah
        pack lasts 22 minutes.
      </p>`,
    figures: [
      { src: propsTop, alt: "Ladybug's airframe from above on the pavement mid-assembly, with the four 24-inch carbon folding props laid out around it and the payload box strapped to the top plate", caption: "The 24-inch blades, before they go on" },
      { src: inFlight, alt: "Ladybug hovering over a field with all four props turning", caption: "The disc loading, in the hover" },
    ],
  },
  {
    tag: "POWER",
    hue: "magenta",
    what: "Eight 3S1P RS50 packs wired as one 6S4P",
    why: "Small packs charge on the chargers we already have.",
    detail: `
      <p>
        The pack is eight 3S1P RS50s with two in series and four strings in
        parallel. We do not own a charger for a 20 Ah 6S brick. One puffed cell
        would kill a single brick. We match resting voltage then series then
        parallel and wrap it as one pack. There are more joints so they are
        strain-relieved. The Myxas report bus voltage over CAN.
      </p>`,
    figures: [
      { src: soldering, alt: "A team member soldering electronics at the workbench in the build space", caption: "Harness work on the bench" },
      { src: frontSunset, alt: "Front view of Ladybug at sunset showing the red printed canopy over the centre stack", caption: "The pack lives under the printed canopy" },
    ],
  },
  {
    tag: "COMPUTE",
    hue: "cyan",
    what: "Raspberry Pi 5 with a 26 TOPS AI HAT",
    why: "The HAT runs vision so the Pi can stay small.",
    detail: `
      <p>
        Detection has to run onboard. A Jetson (what Zephyrus flew) is heavier
        and hotter. A Pi alone cannot keep up so we use a Pi 5 plus a 26 TOPS
        HAT. The models have to be compiled for that HAT. We prove them on
        recorded footage then in Gazebo SITL.
      </p>`,
    figures: [
      { src: sim, alt: "A Gazebo simulation window showing the aircraft flying a mission in the PX4 software-in-the-loop environment", caption: "The same stack, flown in Gazebo first" },
    ],
  },
  {
    tag: "STRUCTURE",
    hue: "violet",
    what: "Draw-latched arms with MR60 blind-mate power",
    why: "Push the arm home and throw the latch. Structure and power mate at the same time.",
    detail: `
      <p>
        Each arm root has a draw latch and an MR60. Bolts would be sixteen
        screws to forget. A one-piece frame does not fit in a case. Latched
        joints wear so tension is a pre-flight check.
      </p>`,
    figures: [
      { src: grassLevel, alt: "Ladybug sitting low in mown grass, seen down the length of one carbon arm to the motor at the far end", caption: "Arm root to motor, one latched joint" },
    ],
  },
  {
    tag: "PAYLOAD",
    hue: "magenta",
    what: "Two independent spool winches",
    why: "Two deliveries in one flight without landing to rearm.",
    detail: `
      <p>
        A second flight for a second drop eats the window. A free drop is height
        and wind. The winch holds altitude and puts the box down slow. Line wrap
        jammed so we revised the spool. It is proven on the bench then off a
        68 ft rig then in the air.
      </p>`,
    figures: [
      {
        src: winchesCad,
        alt: "Onshape screenshot looking up at the underside of Ladybug, showing the two geared spool winch assemblies hanging below the centre plates on orange mounting brackets, one with its line guide fitted",
        caption: "Both winch assemblies, hung off the belly plate",
        paper: true,
      },
      {
        src: payloadBayCad,
        alt: "Onshape screenshot of Ladybug's centre section from above, showing the slotted payload plate over the frame, with the red printed ESC housings at each arm root and one housing highlighted",
        caption: "The slotted payload plate over the centre stack",
        paper: true,
      },
      { src: fieldSunset, alt: "Ladybug parked on the concrete pad at the test field at dusk with the props removed", caption: "Winch bays sit under the centre plates" },
    ],
  },
  {
    tag: "LANDING GEAR",
    hue: "violet",
    what: "Twistlock legs on printed TPU ski feet",
    why: "The feet break first. That's the point.",
    detail: `
      <p>
        The legs twistlock into printed TPU skis. A torn foot is an overnight
        reprint. The aircraft settles instead of planting. Winch clearance is
        sized to the legs.
      </p>`,
    figures: [
      {
        src: landingGear,
        alt: "Close-up of one of Ladybug's legs on a concrete floor: a carbon tube dropping from a red printed socket at the frame into a red T-bracket, with orange printed TPU ski feet capping both ends of the crossbar",
        caption: "One leg: carbon tube, printed socket, TPU skis",
      },
      { src: frontSunset, alt: "Ladybug's twistlock legs and orange and blue printed ski feet on the concrete pad", caption: "Twistlock legs, printed ski feet" },
    ],
  },
  {
    tag: "IMAGING",
    hue: "cyan",
    what: "SIYI A8 mini on a quick-release mount",
    why: "A fixed camera looks wherever the airframe points.",
    detail: `
      <p>
        If you bank with a bolted camera the view leaves the target. The A8 mini
        holds the 4K zoom level. That mass sits on the nose so it is on a printed
        quick-release. It comes off for transport.
      </p>`,
    figures: [
      { src: cadSession, alt: "A team member working on a laptop, with a CAD model of a printed mounting bracket open on screen and a printed airframe part on the table behind", caption: "Mount design, in Onshape" },
    ],
  },
];

/** How any AmadorUAVs aircraft gets made. Moved here from the old standalone
 *  Design Documentation page so the whole record lives with the aircraft. */
const process = [
  {
    n: "01",
    tag: "Design",
    hue: "cyan",
    title: "CAD first",
    body: "We lock a full Onshape assembly before anything is cut. Fits and masses and FEA get checked there.",
  },
  {
    n: "02",
    tag: "Simulate",
    hue: "violet",
    title: "Gazebo",
    body: "We fly the mission in Gazebo against PX4 SITL. Routing and failsafes and detection get proven at a desk.",
  },
  {
    n: "03",
    tag: "Build",
    hue: "magenta",
    title: "Cut plate, print fittings",
    body: "We cut carbon and print fittings after school. Draw latches put the arms on and packs swap with no tools.",
  },
  {
    n: "04",
    tag: "Prove",
    hue: "cyan",
    title: "Test until it's boring",
    body: "The aircraft has to pass six stages at Foothill. Fail a stage and you go back. We pull a log after every flight.",
  },
];

const buildLog = [
  {
    when: "FALL '25",
    hue: "violet",
    title: "Rules and trades",
    detail: "We read the SUAS 2026 rules and chose a heavy-lift quad over rebuilding Zephyrus so we could do two deliveries per flight.",
  },
  {
    when: "WINTER '25",
    hue: "cyan",
    title: "CAD locked",
    detail: "The Onshape assembly locked the latching arms and twistlock legs. Twin winch bays and a 6S4P tray went in with it.",
  },
  {
    when: "SPRING '26",
    hue: "magenta",
    title: "Core stack",
    detail: "The plates were cut. The Pixhawk 6X and Pi 5 went in. The MN7005s were bench-run on Myxas.",
  },
  {
    when: "MAY '26",
    hue: "violet",
    title: "Winches",
    detail: "Both MG90S spools ran full payout and retract at mission weight on the bench.",
  },
  {
    when: "JUNE '26",
    hue: "cyan",
    title: "First hover",
    detail: "First hover was on ELRS. PX4 rate loops were tuned for the 24-inch discs.",
  },
  {
    when: "JULY '26",
    hue: "magenta",
    title: "Flight tests",
    detail: "We flew evenings at the field. Waypoints and props and endurance were graded on the 20 Ah pack.",
  },
];

const specs = [
  ["POWER", "Battery", "8x 3S1P RS50 cells -> 6S4P, 20,000 mAh"],
  ["POWER", "Arrangement", "Series-parallel, one wrapped flight pack"],
  ["PROPULSION", "Motors", "T-Motor MN7005 AT, brushless, 230 KV (4x)"],
  ["PROPULSION", "ESCs", "Zubax Myxa A0, FOC, CAN Bus telemetry (4x)"],
  ["PROPULSION", "Propellers", "NS 24x7.2, carbon fibre, folding"],
  ["AVIONICS", "Flight controller", "Pixhawk 6X"],
  ["AVIONICS", "RC link", "ExpressLRS, 915 MHz"],
  ["AVIONICS", "Protocols", "MAVLink and CAN"],
  ["COMPUTE", "Companion", "Raspberry Pi 5 with 26 TOPS AI HAT"],
  ["PAYLOAD", "Winches", "2x MG90S-driven spools, independent lines"],
  ["GIMBAL", "Camera", "SIYI A8 mini, 3-axis stabilized, 4K zoom"],
  ["STRUCTURE", "Frame", "Carbon fibre plates + tubes, printed fittings"],
  ["STRUCTURE", "Assembly", "Draw-latched arms, MR60 blind-mate power"],
  ["STRUCTURE", "Landing gear", "Twistlock legs, TPU ski feet"],
];

const pipeline = [
  {
    n: "01",
    tag: "Software-in-the-loop",
    hue: "magenta",
    title: "Simulate",
    body: "The mission flies in Gazebo against PX4 SITL. Routing and RTL get proven before any hardware is involved.",
  },
  {
    n: "02",
    tag: "Hardware-in-the-loop",
    hue: "violet",
    title: "Ground test",
    body: "Real sensors and actuators sit on the sim stack. ELRS failsafe and both winches get cycled on the bench.",
  },
  {
    n: "03",
    tag: "Safety-piloted",
    hue: "cyan",
    title: "Fly",
    body: "We fly evenings at the field. Hover first then missions with the safety pilot on ELRS the whole time.",
  },
  {
    n: "04",
    tag: "Post-flight",
    hue: "magenta",
    title: "Read the logs",
    body: "We pull the PX4 log after every flight. Findings go into tuning and winch timing.",
  },
];

/** Judges read photographs. More of them, smaller, so the whole set is
 *  scannable without scrolling past one shot at a time — and every frame
 *  opens full size, because a 13rem thumbnail is not evidence of anything. */
const gallery: GalleryShot[] = [
  {
    src: inFlight,
    alt: "Ladybug hovering over the outfield of a baseball diamond against a blue sky with all four props turning",
    caption: "Hover test · full mission weight",
  },
  {
    src: landingGear,
    alt: "Close-up of one of Ladybug's legs on a concrete floor: a carbon tube dropping from a red printed socket into a red T-bracket, with orange printed TPU ski feet on both ends of the crossbar",
    caption: "Landing gear · carbon leg on TPU skis",
  },
  {
    src: fieldSunset,
    alt: "Ladybug parked on the concrete pad at the test field at dusk with the motors mounted and the props taken off",
    caption: "Evening test · props off for tuning",
  },
  {
    src: frontSunset,
    alt: "Front view of Ladybug showing the red canopy, the carbon arms and the twistlock legs under a sunset sky",
    caption: "Printed canopy over the core stack",
  },
  {
    src: propsTop,
    alt: "Top-down view of Ladybug's airframe on the pavement during assembly with the four 24-inch carbon folding props laid out around it",
    caption: "Assembly · the four blades laid out",
  },
  {
    src: grassLevel,
    alt: "Ladybug sitting in mown grass photographed from ground level, arms and props stretching across the frame",
    caption: "Between runs at the field",
  },
  {
    src: cadSession,
    alt: "A team member working on a laptop with a CAD model of a printed bracket on screen and a printed airframe part on the table behind",
    caption: "Bracket revision, mid session",
  },
];

const droneSections = [
  {
    title: "Flight testing",
    content: `<div class="ztl">
      <div><h2>Hover</h2>
      <p>Props stay off until the first hover. PX4 loops are tuned for the 24-inch discs before anything flies autonomous.</p></div>
      <div><h2>Missions</h2>
      <p>We fly QGroundControl plans and grade them against the RTK track.</p></div>
      <div><h2>Wind</h2>
      <p>Safety pilots fly wind response tests so we catch overcorrection early.</p></div>
    </div>`,
    image: inFlight,
  },
  {
    title: "Simulation",
    content: `<div class="ztl">
      <div><h2>Gazebo, PX4 SITL</h2>
      <p>Routing and failsafes fly in simulation until they are boring. Then they fly on the aircraft.</p></div>
      <div><h2>Why sim first</h2>
      <p>Software can iterate at night. Risky experiments stay off the airframe.</p></div>
    </div>`,
    image: sim,
  },
  {
    title: "Payload",
    content: `<div class="ztl">
      <div><h2>Winches</h2>
      <p>Both winches run full payout and retract on the bench at mission weight. That checks the MG90S and the wrap.</p></div>
      <div><h2>68 ft rig</h2>
      <p>We tune descent and release until the box lands flat. Then the winch flies.</p></div>
    </div>`,
  },
];
</script>

<style scoped>
/* the establishing photo: a portrait shot beside its caption, not a banner.
   The column is capped rather than proportional — a 3:4 frame given half a
   1200px page is a metre of scrolling before the caption appears. */
.lb-lead {
  display: grid;
  grid-template-columns: minmax(0, 26rem) minmax(0, 1fr);
  align-items: center;
  gap: clamp(1.5rem, 4vw, 3rem);
  margin: 0;
}

.lb-lead img {
  width: 100%;
  height: auto;
  border: 1px solid var(--line-soft);
}

.lb-lead-tag { color: var(--g3); margin-bottom: 0.7rem; }
.lb-lead-cap { color: var(--fg-soft); max-width: 44ch; margin: 0 0 0.4rem; }

@media (max-width: 780px) {
  .lb-lead { grid-template-columns: 1fr; align-items: start; }
}

.lb-intro { color: var(--fg-soft); max-width: 62ch; margin: 0 0 1.6rem; }
.lb-note { color: var(--fg-soft); max-width: 70ch; margin-top: 1.6rem; }

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

/* A drawing sheet, not a photograph. The render comes out of Onshape on
   white, so rather than fight that it is framed as a light plate floating on
   the page ground — the same move the CAD figures in the decision rows make,
   and the same light-on-dark inversion the hero spotlight already uses.
   The brand glow sits BEHIND the plate so the card has a halo instead of
   looking pasted onto the black. */
.schematic {
  position: relative;
  margin: 0;
  border: 1px solid var(--line-soft);
  background: #fff;
  padding: 0.75rem;
  /* The halo is a box-shadow rather than a negative-z pseudo-element: the
     float animation animates transform, which makes this element a stacking
     context, and a z-index:-1 child inside one paints OVER the element's own
     background instead of behind it — it would have washed the plate. */
  box-shadow: 0 0 70px 6px rgb(var(--g2-rgb) / 0.16);
  animation: z-float 7s ease-in-out infinite alternate;
}

.schematic img {
  display: block;
  width: 100%;
  height: auto;
}

@keyframes z-float {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}

.z-head { font-size: var(--size-head); margin-bottom: 1rem; }

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

.zdec { border: 1px solid var(--line-soft); border-bottom: 0; margin-top: 2.2rem; }
.zdec .row { margin: 0; }
.zdec .idx { width: 7.5rem; flex-shrink: 0; color: var(--hue); }
.zdec-what { color: var(--fg); font-weight: 600; width: min(20rem, 34vw); flex-shrink: 0; }
.zdec-why { color: var(--fg-soft); }

@media (max-width: 720px) {
  .zdec .row { flex-wrap: wrap; }
  .zdec-what { width: auto; }
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
  max-width: 22ch;
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
  margin: 2.6rem 0 0;
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
  /* the stage number is content, not decoration — --line was 1.4:1 */
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

/* the contact sheet itself now lives in PhotoGallery, shared with Zephyrus */

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
