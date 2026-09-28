<template>
  <div>
    <HeroSearch />

    <!-- 2D: solid black panels scroll over the fixed 3D layer -->
    <div class="over">
      <!-- TEMPORARY (SUAS 2026): a direct route to the competition aircraft
           from the top of the home page, so a judge landing here does not
           have to hunt through the nav. Remove after the competition —
           the Programs card below already covers Ladybug in normal times. -->
      <section class="section suas-band" data-hue="cyan">
        <div class="wrap">
          <NuxtLink to="/ladybug" class="suas-link">
            <span class="label suas-tag">AUVSI SUAS 2026</span>
            <span class="suas-title">
              Ladybug ('26)
            </span>
            <span class="label suas-cta">
              Open <span aria-hidden="true">&rarr;</span>
            </span>
          </NuxtLink>
        </div>
      </section>

      <section class="section" data-hue="violet">
        <div class="wrap">
          <p class="label eyebrow">Mission</p>
          <h2 class="statement">We fly our own aircraft at <span class="grad-text">SUAS</span>.</h2>
          <div class="stats" data-reveal-group>
            <div class="stat"><span class="stat-n num" data-count="7" data-suffix="+">0</span><span class="label">Years flying</span></div>
            <div class="stat"><span class="stat-n num" data-count="3">0</span><span class="label">Divisions</span></div>
            <div class="stat"><span class="stat-n num" data-count="5">0</span><span class="label">Custom airframes</span></div>
            <div class="stat"><span class="stat-n num" data-count="20" data-suffix=" FPS">0</span><span class="label">Onboard detection</span></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <p class="label eyebrow">Programs</p>
          <div class="grid-hair cols-2">
            <NuxtLink
              v-for="(f, i) in features"
              :key="f.title"
              :to="f.to"
              :target="f.external ? '_blank' : undefined"
              :rel="f.external ? 'noopener' : undefined"
              class="cell feature"
              :data-hue="f.hue"
              data-reveal
            >
              <div class="photo-frame">
                <img :src="f.img" :alt="f.alt" loading="lazy" width="640" height="420">
              </div>
              <p class="label feature-idx num">{{ String(i + 1).padStart(2, "0") }}</p>
              <h3>{{ f.title }}</h3>
              <p class="feature-body">{{ f.body }}</p>
              <span class="label feature-cta">{{ f.cta }} <span aria-hidden="true">&rarr;</span></span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <p class="label eyebrow">Divisions</p>
          <h2 class="statement">Three divisions.</h2>
          <div class="grid-hair cols-3">
            <NuxtLink
              v-for="d in divisions"
              :key="d.title"
              :to="d.to"
              class="cell division"
              :data-hue="d.hue"
              data-reveal
            >
              <p class="label division-tag">{{ d.tag }}</p>
              <h3>{{ d.title }}</h3>
              <p class="feature-body">{{ d.body }}</p>
              <span class="label feature-cta">About <span aria-hidden="true">&rarr;</span></span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="section" data-hue="magenta">
        <div class="wrap sponsor-cta">
          <div>
            <p class="label eyebrow">Support</p>
            <h2 class="statement">Sponsor us</h2>
            <p class="sponsor-sub">Sponsors pay for our parts and our trip to SUAS.</p>
          </div>
          <NuxtLink to="/sponsor" class="btn btn-grad">
            Sponsors <span aria-hidden="true">&rarr;</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import ladybugField from "~/assets/images/ladybug/field-sunset.webp";
import compGroup from "~/assets/images/general/comp-group.webp";
import gradSetup from "~/assets/images/streaming/grad-setup.webp";
import grass from "~/assets/images/general/grass.webp";
import { LINKS } from "~/lib/site";

useHead({ title: "Home" });

const features = [
  {
    title: "Ladybug ('26)",
    body: "Ladybug is our heavy-lift quad for SUAS 2026.",
    to: "/ladybug",
    cta: "The aircraft",
    img: ladybugField,
    alt: "Ladybug on the flight line at sunset, props off",
    hue: "cyan",
    external: false,
  },
  {
    title: "AUVSI SUAS Competition",
    body: "This is the competition we design against.",
    to: LINKS.suas,
    cta: "Competition site",
    img: compGroup,
    alt: "The 2024 competition team, grouped around the drone",
    hue: "violet",
    external: true,
  },
  {
    title: "AVHS Drone Streaming",
    body: "We fly a live camera over school sports.",
    to: "/streaming",
    cta: "Browse streams",
    img: gradSetup,
    alt: "Our streaming setup at Amador Valley High School's 2022 graduation",
    hue: "magenta",
    external: false,
  },
  {
    title: "PX4 Contribution",
    body: "We send patches to PX4.",
    to: LINKS.github,
    cta: "Our GitHub",
    img: grass,
    alt: "Testing the drone in a grass field",
    hue: "cyan",
    external: true,
  },
];

const divisions = [
  {
    tag: "Software",
    title: "Software division",
    body: "They write path planning and onboard detection.",
    to: "/team#software",
    hue: "cyan",
  },
  {
    tag: "Electromechanical",
    title: "Electromechanical division",
    body: "They design the airframe then cut carbon and wire it.",
    to: "/team#electromech",
    hue: "violet",
  },
  {
    tag: "Operations",
    title: "Operations division",
    body: "They raise sponsor money and run the budget.",
    to: "/team#business",
    hue: "magenta",
  },
];
</script>

<style scoped>
.over {
  position: relative;
  z-index: 1;
  /* own compositing group: nothing from the video/canvas layer beneath may
     ever bleed or ghost through these panels */
  isolation: isolate;
  background: var(--bg);
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}

/* TEMPORARY (SUAS 2026) — see the markup note above */
.suas-band { padding-bottom: 0; }

.suas-link {
  display: flex;
  align-items: center;
  gap: clamp(0.9rem, 3vw, 2rem);
  flex-wrap: wrap;
  padding: 1.1rem 1.3rem;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--bg), var(--bg)) padding-box,
    var(--grad) border-box;
  transition: background 160ms linear;
}

.suas-link:hover {
  background:
    linear-gradient(var(--bg-2), var(--bg-2)) padding-box,
    var(--grad) border-box;
}

.suas-tag { color: var(--hue); flex-shrink: 0; }
.suas-title { color: var(--fg); font-weight: 600; }

.suas-cta {
  margin-left: auto;
  color: var(--hue);
  transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1);
}

.suas-link:hover .suas-cta { transform: translateX(4px); }

@media (max-width: 760px) {
  .suas-cta { margin-left: 0; }
}

.statement {
  font-size: var(--size-head);
  max-width: 22ch;
  text-wrap: balance;
  margin-bottom: 2.2rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

@media (max-width: 700px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}

.stat {
  background: var(--bg);
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-n {
  font-family: var(--mono);
  font-size: 1.7rem;
  color: var(--fg);
}

.feature { display: block; transition: background 160ms linear; }
.feature:hover { background: var(--bg-2); }

.feature img {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.feature-idx { margin: 1.1rem 0 0.4rem; color: var(--hue); }
.feature h3 { font-size: 1.3rem; margin-bottom: 0.5rem; }
.feature-body { color: var(--fg-soft); margin-bottom: 0.9rem; }
.feature-cta { color: var(--hue); }

.division { display: block; transition: background 160ms linear; }
.division:hover { background: var(--bg-2); }
.division-tag { color: var(--hue); margin-bottom: 0.7rem; }
.division h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }

.sponsor-cta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}

.sponsor-sub { color: var(--fg-soft); max-width: 44ch; margin: 0; }
.sponsor-cta .statement { margin-bottom: 1rem; }
</style>
