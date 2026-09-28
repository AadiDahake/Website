<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/electromech/drone.webp" alt="Zephyrus hovering low over the grass with a payload hanging under the belly">
      </template>
      <h1>Payload <span class="grad-text">Testing</span></h1>
      <h2>
        Ladybug has two winches so it can drop two MEDKIT boxes per flight. Nothing flies until it has worked on the bench and off a 68 ft rig.
      </h2>
    </PageSection>

    <!-- headline numbers -->
    <PageSection>
      <div class="ptstats" data-reveal-group>
        <div class="ptstat"><span class="ptstat-n num" data-count="2" data-suffix=" WINCHES">0</span><span class="label">Independent lines</span></div>
        <div class="ptstat"><span class="ptstat-n num" data-count="2" data-suffix=" DROPS">0</span><span class="label">Deliveries per flight</span></div>
        <div class="ptstat"><span class="ptstat-n num" data-count="68" data-suffix=" FT">0</span><span class="label">Drop rig height</span></div>
        <div class="ptstat"><span class="ptstat-n num" data-count="5" data-suffix=" STAGES">0</span><span class="label">Before it flies a mission</span></div>
      </div>
    </PageSection>

    <PageSection>
      <div class="split">
        <div class="photo-frame">
          <img src="~/assets/images/electromech/drone.webp" alt="A payload hanging on the line under the aircraft during a drop test" loading="lazy">
        </div>
        <div>
          <p class="label eyebrow">The mechanism</p>
          <h2 class="pt-head">Each winch is one MG90S on a printed spool.</h2>
          <p>
            Each winch is a printed spool on a geared shaft driven by an MG90S.
            The line pays out flat. TPU dampers sit on the mount. Ground detection
            fires the release.
            <NuxtLink to="/ladybug" class="pt-link">Ladybug ('26)</NuxtLink>
            has two. Zephyrus had one.
          </p>
        </div>
      </div>
    </PageSection>

    <!-- the four things that are actually being tested -->
    <PageSection section-id="under-test">
      <p class="label eyebrow">Under test</p>
      <div class="grid-hair cols-2">
        <div v-for="p in parts" :key="p.title" class="cell ptsys" :data-hue="p.hue" data-reveal>
          <p class="label ptsys-tag">{{ p.tag }}</p>
          <h3>{{ p.title }}</h3>
          <p class="ptsys-body">{{ p.body }}</p>
          <ul class="ptsys-chips">
            <li v-for="c in p.chips" :key="c" class="label">{{ c }}</li>
          </ul>
        </div>
      </div>
    </PageSection>

    <!-- the staged sequence, with the gate that has to pass at each step -->
    <PageSection section-id="sequence">
      <p class="label eyebrow">Test sequence</p>
      <h2 class="pttest-head">Bench, then the rig, then the sky.</h2>

      <div class="ptpipe" data-reveal-group>
        <div v-for="stage in pipeline" :key="stage.n" class="ptpipe-stage" :data-hue="stage.hue">
          <span class="ptpipe-n num">{{ stage.n }}</span>
          <p class="label ptpipe-tag">{{ stage.tag }}</p>
          <h3>{{ stage.title }}</h3>
          <p class="ptpipe-body">{{ stage.body }}</p>
          <p class="ptpipe-gate"><span class="label ptpipe-gate-k">Passes when</span>{{ stage.gate }}</p>
        </div>
      </div>
    </PageSection>

    <!-- failure modes, stated plainly -->
    <PageSection section-id="failures">
      <p class="label eyebrow">Failure modes</p>
      <div class="ptfail" data-reveal-group>
        <div v-for="f in failures" :key="f.what" class="row" :data-hue="f.hue">
          <span class="idx label">{{ f.tag }}</span>
          <span class="ptfail-what">{{ f.what }}</span>
          <span class="ptfail-how">{{ f.how }}</span>
        </div>
      </div>
    </PageSection>

    <PageSection section-id="checks">
      <p class="label eyebrow">Test program</p>
      <div class="steps">
        <div v-for="(step, i) in timeline" :key="step.title" class="step">
          <span class="idx label num">{{ String(i + 1).padStart(2, "0") }}</span>
          <div class="step-body">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </div>
      </div>
    </PageSection>

    <!-- the log itself -->
    <PageSection section-id="log">
      <p class="label eyebrow">Full test log</p>
      <div class="pttest-detail" data-reveal>
        <Accordian1 :rtl="false" :sections="payloadSections" />
      </div>
    </PageSection>

    <PageSection>
      <NuxtLink to="/drone-testing" class="ptnext" data-reveal>
        <span class="label ptnext-tag">Next</span>
        <span class="ptnext-title">Flight testing</span>
        <span class="label ptnext-arrow" aria-hidden="true">&rarr;</span>
      </NuxtLink>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "Payload Testing" });

const parts = [
  {
    tag: "Line",
    hue: "violet",
    title: "Spool and line",
    body: "Directional winding keeps each wrap flat. A wrap that rides over the layer under it binds on retract. Then the box hangs with nowhere to go.",
    chips: ["Printed spool", "Geared shaft", "Directional winding", "Full payout"],
  },
  {
    tag: "Release",
    hue: "magenta",
    title: "MG90S release",
    body: "One MG90S per winch has to open with the loaded box hanging at pack voltage (a bench supply hides the stall).",
    chips: ["MG90S", "Loaded release", "Pack voltage", "Two servos at once"],
  },
  {
    tag: "Payload",
    hue: "cyan",
    title: "MEDKIT box",
    body: "The box has to land flat on the marked target. A tipped box is a fail. We inspect every rig drop before the next one.",
    chips: ["MEDKIT box", "Marked target", "Flat landing", "Inspected each drop"],
  },
  {
    tag: "Trigger",
    hue: "violet",
    title: "Command and timing",
    body: "The drop is commanded over MAVLink from the Pi 5 and released on ground detection. A timer fires early on a slow descent and drops the last few feet.",
    chips: ["MAVLink", "Pixhawk 6X", "Ground detection", "No open-loop timer"],
  },
];

const pipeline = [
  {
    n: "01",
    tag: "Bench",
    hue: "magenta",
    title: "Servo and spool",
    body: "The winch is clamped to a table with the MEDKIT on the line. We run full payout and retract. Both winches move at once so the 5 V rail sees both MG90S servos.",
    gate: "Both drums run clean and the release fires every time.",
  },
  {
    n: "02",
    tag: "Rig",
    hue: "violet",
    title: "68 ft drops",
    body: "The winch drops from a fixed 68 ft structure onto a marked target. We tune descent and release there with no props turning.",
    gate: "The box reaches the target slowly and lands flat and comes off the line.",
  },
  {
    n: "03",
    tag: "Ground",
    hue: "cyan",
    title: "On the aircraft",
    body: "Both winches go under the belly. They are commanded over MAVLink from the 6S4P pack with the Pixhawk 6X armed and the props off.",
    gate: "The full cycle runs on command with no brownout and no ELRS noise.",
  },
  {
    n: "04",
    tag: "Hover",
    hue: "magenta",
    title: "Drops in the air",
    body: "Low hover drops come first with the safety pilot on the sticks. Prop wash is new here. A box that swung on the rig swings more under 24-inch props.",
    gate: "The box goes down not out and the aircraft holds position.",
  },
  {
    n: "05",
    tag: "Mission",
    hue: "violet",
    title: "Full run",
    body: "Two deliveries fly inside one autonomous mission and get graded on the marked target. Wind and still air are separate tests.",
    gate: "Both winches deliver without a re-land and the log matches what the crew saw.",
  },
];

const failures = [
  {
    tag: "SPOOL",
    hue: "violet",
    what: "Line rides over itself and binds",
    how: "We watch both drums to the end of the line. A bind on the rig is a rebuild. A bind in the air is a box swinging for the rest of the flight.",
  },
  {
    tag: "SERVO",
    hue: "magenta",
    what: "MG90S stalls or misses the release",
    how: "The MG90S is commanded open with the loaded box hanging at pack voltage while both winches move together.",
  },
  {
    tag: "PAYLOAD",
    hue: "cyan",
    what: "MEDKIT box tips on touchdown",
    how: "Every drop lands on the same marked target. A tipped box is a fail even if it hit the middle.",
  },
  {
    tag: "TIMING",
    hue: "magenta",
    what: "Release fires before the box is down",
    how: "The release runs off ground detection not a timer. Rig drops exist to catch an early fire.",
  },
  {
    tag: "AIR",
    hue: "violet",
    what: "Payload swings under prop wash",
    how: "Hover drops fly before mission drops. We measure drift off the target.",
  },
  {
    tag: "POWER",
    hue: "cyan",
    what: "Two servos on one rail brown out",
    how: "We never cycle one winch at a time. Both move together because that is the load.",
  },
];

const timeline = [
  {
    title: "Spool and winding",
    description: "Both drums cycle to full payout and back with the box loaded. Each wrap has to lie flat. A jam here is a reprint.",
  },
  {
    title: "Release under load",
    description: "The MG90S opens with the MEDKIT hanging. Empty releases do not count.",
  },
  {
    title: "Weight range",
    description: "Drops run at the light end and the heavy end. Mission weight is not fixed yet.",
  },
  {
    title: "Descent rate",
    description: "Too fast breaks the box and too slow eats mission time. Both get fixed in spool geometry.",
  },
  {
    title: "Damping",
    description: "TPU dampers sit between the mount and the frame. We check them by hand on the bench and watch swing on the rig.",
  },
  {
    title: "Both lines together",
    description: "The two winches always run as a pair on the same rail and the same command path.",
  },
  {
    title: "Back to the bench",
    description: "If we change the mechanism it goes back to stage one.",
  },
];

const payloadSections = [
  {
    title: "Bench testing",
    content: `<div class="ptl">
      <div><h2>Cycles</h2>
      <p>Each winch is clamped to a table with the box on the line. Both winches run together and we watch wrap to the end.</p></div>
      <div><h2>Release</h2>
      <p>The MG90S opens with the box hanging. An empty release and a loaded stall stay on the table.</p></div>
      <div><h2>Damping</h2>
      <p>TPU dampers sit between the mount and the frame. We check vibration here before there is any airframe motion.</p></div>
    </div>`,
  },
  {
    title: "Rig drops",
    content: `<div class="ptl">
      <div><h2>68 ft</h2>
      <p>Drops run from a fixed structure. A bad release costs a box and an afternoon.</p></div>
      <div><h2>Descent</h2>
      <p>We measure rate and release every drop. This is where an early fire shows up.</p></div>
      <div><h2>Landing</h2>
      <p>Every drop lands on the same marked target. We inspect the box. Hitting the middle is not enough.</p></div>
    </div>`,
  },
  {
    title: "Flight drops",
    content: `<div class="ptl">
      <div><h2>Hover first</h2>
      <p>The first drops are low hover with the safety pilot on ELRS. Prop wash is not on the rig.</p></div>
      <div><h2>Mission</h2>
      <p>Both winches deliver in one flight with no re-land and no re-arm.</p></div>
      <div><h2>Wind</h2>
      <p>Wind drops are graded separately. Still evening air does not cover a gusty morning.</p></div>
    </div>`,
  },
  {
    title: "Review",
    content: `<div class="ptl">
      <div><h2>Logs</h2>
      <p>We pull the PX4 log and check it against what the crew saw.</p></div>
      <div><h2>Rework</h2>
      <p>A spool or servo timing change goes back to the bench including the small ones.</p></div>
      <div><h2>Still open</h2>
      <p>Wind is the variable we trust least. Two winches stay on the plan.</p></div>
    </div>`,
  },
];
</script>

<style scoped>
.ptstats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

@media (max-width: 700px) {
  .ptstats { grid-template-columns: repeat(2, 1fr); }
}

.ptstat {
  background: var(--bg);
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ptstat-n { font-family: var(--mono); font-size: 1.7rem; color: var(--fg); }

.steps { border: 1px solid var(--line-soft); border-bottom: 0; }

.step {
  display: flex;
  gap: 1.2rem;
  padding: 1.1rem 1.2rem;
  border-bottom: 1px solid var(--line-soft);
  transition: background 200ms linear;
}

.step:hover { background: var(--bg-2); }
.step .idx { padding-top: 0.25rem; color: var(--g3); }
.step h3 { font-size: 1.05rem; margin-bottom: 0.3rem; }
.step p { margin: 0; color: var(--fg-soft); max-width: 70ch; }

.pt-head { font-size: var(--size-head); margin-bottom: 0.9rem; }

.pt-link {
  color: var(--g3);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ptsys-tag { color: var(--hue); margin-bottom: 0.6rem; }
.ptsys h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.ptsys-body { color: var(--fg-soft); }

.ptsys-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0.9rem 0 0;
}

.ptsys-chips li {
  border: 1px solid var(--line);
  padding: 0.2rem 0.5rem;
  color: var(--hue);
}

.pttest-head {
  font-size: clamp(2.1rem, 5.5vw, 3.5rem);
  max-width: 22ch;
  text-wrap: balance;
  margin-bottom: 1.1rem;
}

.pttest-intro { max-width: 62ch; margin-bottom: 0; }

/* the sequence: numbered stages linked by a thin gradient run */
.ptpipe {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  margin: 2.6rem 0 0;
}

@media (min-width: 900px) {
  .ptpipe { flex-direction: row; align-items: stretch; }
}

.ptpipe-stage {
  position: relative;
  flex: 1;
  background: var(--bg-2);
  border: 1px solid var(--line-soft);
  padding: 1.8rem 1.5rem 1.6rem;
  transition: border-color 200ms linear, transform 200ms cubic-bezier(0.33, 0, 0.2, 1);
}

.ptpipe-stage:hover {
  border-color: var(--hue);
  transform: translateY(-3px);
}

.ptpipe-stage:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 1.7rem;
  bottom: -1.8rem;
  width: 1px;
  height: 1.8rem;
  background: var(--grad);
  opacity: 0.55;
}

@media (min-width: 900px) {
  .ptpipe-stage:not(:last-child)::after {
    left: auto;
    right: -1.8rem;
    bottom: auto;
    top: 2.5rem;
    width: 1.8rem;
    height: 1px;
  }
}

.ptpipe-n {
  display: block;
  font-family: var(--mono);
  font-size: clamp(2.2rem, 4.5vw, 2.8rem);
  line-height: 1;
  color: var(--faint);
  margin-bottom: 0.9rem;
  transition: color 200ms linear;
}

.ptpipe-stage:hover .ptpipe-n { color: var(--hue); }

.ptpipe-tag { color: var(--hue); margin-bottom: 0.6rem; }
.ptpipe-stage h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }
.ptpipe-body { color: var(--fg-soft); margin: 0; }

.ptpipe-gate {
  margin: 1rem 0 0;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line-soft);
  color: var(--fg-soft);
}

.ptpipe-gate-k {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--hue);
}

.ptfail { border: 1px solid var(--line-soft); border-bottom: 0; margin-top: 2.2rem; }
.ptfail .row { margin: 0; }
.ptfail .idx { width: 7.5rem; flex-shrink: 0; color: var(--hue); }
.ptfail-what { color: var(--fg); font-weight: 600; width: min(20rem, 34vw); flex-shrink: 0; }
.ptfail-how { color: var(--fg-soft); }

@media (max-width: 720px) {
  .ptfail .row { flex-wrap: wrap; }
  .ptfail-what { width: auto; }
}

.pttest-detail { margin-top: 1.4rem; }

:deep(.ptl) { display: flex; flex-direction: column; gap: 1.1rem; }
:deep(.ptl h2) { font-size: 1.02rem; margin-bottom: 0.25rem; color: var(--fg); }
:deep(.ptl p) { margin: 0; color: var(--fg-soft); }
:deep(.ptl > div) { border-left: 2px solid var(--g2); padding-left: 0.9rem; }

.ptnext {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border: 1px solid var(--line);
  padding: 1rem 1.2rem;
  transition: background 160ms linear, border-color 160ms linear;
}

.ptnext:hover { background: var(--bg-2); border-color: var(--g2); }
.ptnext-tag { color: var(--g3); flex-shrink: 0; }
.ptnext-title { color: var(--fg); font-weight: 600; }
.ptnext-arrow { margin-left: auto; color: var(--faint); transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1); }
.ptnext:hover .ptnext-arrow { transform: translateX(4px); color: var(--g3); }
</style>
