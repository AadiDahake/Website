<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/general/drone-testing-2025.webp" alt="Zephyrus during a 2025 flight trial">
      </template>
      <h1>Flight <span class="grad-text">Testing</span></h1>
      <h2>
        The aircraft has to pass six stages. Props stay off until the bench check passes. The mission is last.
      </h2>
    </PageSection>

    <PageSection>
      <div class="split">
        <div>
          <p class="label eyebrow">Flight test program</p>
          <h2 class="dt-head">Fail a stage, you go back.</h2>
          <p>
            We fly at Foothill Field in Livermore in the evenings. A safety pilot is on every flight.
            Payload testing is
            <NuxtLink to="/payload-testing" class="dt-link">separate</NuxtLink>.
            The same ladder qualified
            <NuxtLink to="/zephyrus" class="dt-link">Zephyrus ('25)</NuxtLink>
            and is flying
            <NuxtLink to="/ladybug" class="dt-link">Ladybug ('26)</NuxtLink>.
          </p>
        </div>
        <div class="photo-frame">
          <img src="~/assets/images/general/drone-testing-2025.webp" alt="Safety pilot on the transmitter during an evening flight trial" loading="lazy">
        </div>
      </div>
    </PageSection>

    <PageSection section-id="ladder">
      <p class="label eyebrow">The ladder</p>
      <h2 class="dt-ladder-head">The bench is first and the mission is last.</h2>

      <div class="dt-stages" data-reveal-group>
        <div v-for="s in stages" :key="s.n" class="dt-stage" :data-hue="s.hue">
          <span class="dt-stage-n num">{{ s.n }}</span>
          <div class="dt-stage-body">
            <p class="label dt-stage-tag">{{ s.tag }}</p>
            <h3>{{ s.title }}</h3>
            <p class="dt-stage-text">{{ s.body }}</p>
            <p class="dt-stage-gate"><span class="label">Gates</span>{{ s.gate }}</p>
          </div>
        </div>
      </div>
    </PageSection>

    <PageSection>
      <p class="label eyebrow">Trial parameters</p>
      <div class="grid-hair cols-3">
        <div v-for="p in params" :key="p.k" class="cell param">
          <p class="label param-k">{{ p.k }}</p>
          <p class="param-v" :class="p.num && 'num'">{{ p.v }}</p>
        </div>
      </div>
    </PageSection>

    <PageSection section-id="testing">
      <p class="label eyebrow">Full test log</p>
      <Accordian1 :rtl="false" :sections="logSections" />
    </PageSection>

    <PageSection>
      <NuxtLink to="/ladybug" class="dt-next" data-reveal>
        <span class="label dt-next-tag">On the ladder now</span>
        <span class="dt-next-title">Ladybug ('26)</span>
        <span class="label dt-next-arrow" aria-hidden="true">&rarr;</span>
      </NuxtLink>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
// The route stays /drone-testing so existing links keep working; everything
// user-facing says "Flight Testing", which is what the nav and the aircraft
// pages call it.
useHead({ title: "Flight Testing" });

const stages = [
  {
    n: "01",
    tag: "Props off",
    hue: "magenta",
    title: "Bench checks",
    body: "The airframe runs on the bench with the props off. We check motor order Myxa CAN Pixhawk orientation the compass and the accels. Then we kill the ELRS transmitter and confirm failsafe cuts throttle.",
    gate: "No blade until this list passes.",
  },
  {
    n: "02",
    tag: "Low and short",
    hue: "violet",
    title: "Hover tests",
    body: "The hover is a foot or two up with the safety pilot on the sticks. Early hovers are short (a minute often less). We land if it sounds wrong and we log vibration and per-motor output.",
    gate: "Hover has to hold a full minute first.",
  },
  {
    n: "03",
    tag: "PX4 tuning",
    hue: "cyan",
    title: "Rate and attitude loops",
    body: "24-inch discs make the default PX4 gains wrong. We tune rate then attitude then position and we do one axis per flight. Too much P and you hear the oscillation before you see it.",
    gate: "A fighting rate loop fights the mission controller too.",
  },
  {
    n: "04",
    tag: "SITL",
    hue: "magenta",
    title: "Gazebo and PX4 SITL",
    body: "Every mission flies in Gazebo against PX4 SITL. Routing and waypoint spacing and altitudes and the search pattern make their mistakes there. The worst case is a rerun.",
    gate: "No plan on the aircraft until it flew clean in SITL.",
  },
  {
    n: "05",
    tag: "Failures on purpose",
    hue: "violet",
    title: "Return-to-home and failsafes",
    body: "We break things on purpose. RC dropout and low battery and GPS loss and geofence each run in SITL first then at the field. RTL is flown from all four corners.",
    gate: "Stays in sight until RTL is clean from every corner.",
  },
  {
    n: "06",
    tag: "Full mission",
    hue: "cyan",
    title: "Autonomous flight",
    body: "The aircraft flies the full plan with the safety pilot on ELRS. Waypoints are graded against the RTK track. We pull the log after every flight including the ones that looked fine.",
    gate: "Nothing flies at SUAS that hasn't flown this profile at Foothill.",
  },
];

const params = [
  { k: "Test Site", v: "Foothill Field, Livermore, CA", num: false },
  { k: "Average Flight Time", v: "22 minutes", num: true },
  { k: "Position Sources", v: "IMU, GPS, RTK", num: false },
  { k: "Autopilot", v: "PX4 on a Pixhawk 6X", num: false },
  { k: "Ground Station", v: "QGroundControl", num: false },
  { k: "Simulator", v: "Gazebo with PX4 SITL", num: false },
];

const logSections = [
  {
    title: "Bench, props off",
    content: `<div class="ztl">
      <div><h2>Power</h2>
      <p>The pack goes on with the props off. We watch voltage under load and Myxa CAN and motor temp. A motor that is already warm with no blade does not get one.</p></div>
      <div><h2>Radio</h2>
      <p>We kill ELRS on purpose to confirm failsafe. Arming and the kill switch and the modes get re-checked every session.</p></div>
      <div><h2>Winches</h2>
      <p>Both winches run full payout and retract at mission weight. Servo timing and wrap get fixed here.</p></div>
    </div>`,
  },
  {
    title: "Hover",
    content: `<div class="ztl">
      <div><h2>Staged hovers</h2>
      <p>First hovers are low and short and inside reach. We stop if it sounds different.</p></div>
      <div><h2>24-inch discs</h2>
      <p>We tune one axis at a time. Gains from a 10-inch quad are mush or oscillation and the log says which.</p></div>
    </div>`,
  },
  {
    title: "Simulation",
    content: `<div class="ztl">
      <div><h2>Gazebo, PX4 SITL</h2>
      <p>Routing and failsafes run until they stop surprising us.</p></div>
      <div><h2>Why first</h2>
      <p>Software can iterate at night. Bad experiments stay off the airframe.</p></div>
    </div>`,
    image: new URL("@/assets/images/software/sim.webp", import.meta.url).href,
  },
  {
    title: "Failsafes",
    content: `<div class="ztl">
      <div><h2>Link loss</h2>
      <p>We cut RC mid-mission and watch how long it takes to notice and what mode it falls into.</p></div>
      <div><h2>RTL</h2>
      <p>RTL is flown from all four corners. A bad home position only shows up on the far one.</p></div>
      <div><h2>Battery and geofence</h2>
      <p>Those cases run in SITL first then at the field. If the air disagrees we go back to sim.</p></div>
    </div>`,
  },
  {
    title: "Missions",
    content: `<div class="ztl">
      <div><h2>Execution</h2>
      <p>We fly QGroundControl plans end to end and grade them against RTK.</p></div>
      <div><h2>Logs</h2>
      <p>We pull every PX4 log. Findings go into tuning and winch timing.</p></div>
    </div>`,
  },
];
</script>

<style scoped>
.dt-head { font-size: var(--size-head); margin-bottom: 0.9rem; }
.param-k { margin-bottom: 0.5rem; color: var(--g3); }
.param-v { margin: 0; color: var(--fg); font-weight: 600; }

.dt-link {
  color: var(--g3);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dt-ladder-head {
  font-size: clamp(2.1rem, 5.5vw, 3.5rem);
  max-width: 22ch;
  text-wrap: balance;
  margin-bottom: 1.1rem;
}

.dt-intro { max-width: 62ch; margin-bottom: 0; }

/* the ladder: numbered stages, each one gating the next */
.dt-stages {
  margin-top: 2.6rem;
  border: 1px solid var(--line-soft);
  border-bottom: 0;
}

.dt-stage {
  display: flex;
  gap: 1.4rem;
  padding: 1.4rem 1.3rem;
  border-bottom: 1px solid var(--line-soft);
  transition: background 200ms linear;
}

.dt-stage:hover { background: var(--bg-2); }

.dt-stage-n {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: clamp(1.6rem, 3.5vw, 2.1rem);
  line-height: 1;
  color: var(--faint);
  transition: color 200ms linear;
}

.dt-stage:hover .dt-stage-n { color: var(--hue); }

.dt-stage-tag { color: var(--hue); margin-bottom: 0.5rem; }
.dt-stage h3 { font-size: 1.15rem; margin-bottom: 0.45rem; }
.dt-stage-text { margin: 0; color: var(--fg-soft); }

.dt-stage-gate {
  margin: 0.8rem 0 0;
  padding-left: 0.9rem;
  border-left: 2px solid var(--hue);
  color: var(--dim);
}

.dt-stage-gate .label { color: var(--hue); margin-right: 0.6rem; }

@media (max-width: 560px) {
  .dt-stage { flex-direction: column; gap: 0.6rem; }
}

:deep(.ztl) { display: flex; flex-direction: column; gap: 1.1rem; }
:deep(.ztl h2) { font-size: 1.02rem; margin-bottom: 0.25rem; color: var(--fg); }
:deep(.ztl p) { margin: 0; color: var(--fg-soft); }
:deep(.ztl > div) { border-left: 2px solid var(--g2); padding-left: 0.9rem; }

.dt-next {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border: 1px solid var(--line);
  padding: 1rem 1.2rem;
  transition: background 160ms linear, border-color 160ms linear;
}

.dt-next:hover { background: var(--bg-2); border-color: var(--g2); }
.dt-next-tag { color: var(--g3); flex-shrink: 0; }
.dt-next-title { color: var(--fg); font-weight: 600; }
.dt-next-arrow { margin-left: auto; color: var(--faint); transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1); }
.dt-next:hover .dt-next-arrow { transform: translateX(4px); color: var(--g3); }
</style>
