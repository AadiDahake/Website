<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/comp/team-banner.webp" alt="Our competition team standing behind the team banner">
      </template>
      <h1>About <span class="grad-text">AmadorUAVs</span></h1>
      <h2>We are a high school team and we have flown our own drones since 2018.</h2>
    </PageSection>

    <!-- the record, up front: the numbers before the narrative -->
    <PageSection>
      <p class="label eyebrow">
        By the numbers
      </p>
      <div class="stats" data-reveal-group>
        <div class="stat">
          <span class="stat-n num" data-count="2018">0</span><span class="label">Founded</span>
        </div>
        <div class="stat">
          <span class="stat-n num" data-count="5">0</span><span class="label">Custom airframes</span>
        </div>
        <div class="stat">
          <span class="stat-n num" data-count="69">0</span><span class="label">University teams beaten</span>
        </div>
        <div class="stat">
          <span class="stat-n num" data-count="100" data-suffix=" FT">0</span><span class="label">Drop height, 2025</span>
        </div>
      </div>
    </PageSection>

    <!-- the record, condensed and scannable -->
    <PageSection>
      <p class="label eyebrow">
        Flight log
      </p>
      <!-- One shape per row: year, the aircraft we took, what it did. The
           rows used to mix results with events, so the column read as a list
           of unrelated sentences rather than a record. -->
      <div class="log" data-reveal-group>
        <div class="row log-head" aria-hidden="true">
          <span class="idx label">Year</span>
          <span class="log-title label">Aircraft</span>
          <span class="log-detail label">Result</span>
        </div>
        <div v-for="e in log" :key="e.year" class="row" :data-hue="e.hue">
          <span class="idx num">{{ e.year }}</span>
          <span class="log-title">{{ e.craft }}</span>
          <span class="log-detail">{{ e.result }}</span>
        </div>
      </div>
    </PageSection>

    <PageSection class="flex flex-col space-y-10 lg:space-y-16">
      <ImageTextSection data-reveal>
        <template #image>
          <img src="~/assets/images/general/comp-group.webp" alt="The competition team in 2024" loading="lazy">
        </template>
        <template #text>
          <p class="label eyebrow">
            Competition record
          </p>
          <h1>Results</h1>
          <p>
            In 2022 Boreas placed 2nd internationally with 69 university teams behind us.
            In 2024 we placed 1st nationally and 12th internationally and won the JustJoe Sportsmanship Award.
            In 2025 Zephyrus dropped a payload from over 100 ft. Ladybug is the 2026 aircraft.
          </p>
          <a
            class="press"
            href="https://www.pleasantonweekly.com/news/2022/07/21/amador-uavs-team-soars-to-second-place-in-international-competition"
            target="_blank"
            rel="noopener"
          >
            <span class="label press-tag">Press</span>
            <span class="press-title">Pleasanton Weekly wrote up the 2022 run</span>
            <span class="label press-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </template>
      </ImageTextSection>

      <ImageTextSection rtl data-reveal>
        <template #image>
          <img src="~/assets/images/general/drone-flight.webp" alt="One of our drones in flight" loading="lazy">
        </template>
        <template #text>
          <p class="label eyebrow">
            Origin
          </p>
          <h1>2018</h1>
          <p>
            We started on airplanes and then moved to multicopters. Every airframe since then is ours.
          </p>
          <ul class="chips">
            <li v-for="a in airframes" :key="a" class="label">
              {{ a }}
            </li>
          </ul>
        </template>
      </ImageTextSection>

      <ImageTextSection data-reveal>
        <template #image>
          <img src="~/assets/images/general/grass.webp" alt="Testing a drone in a grass field" loading="lazy">
        </template>
        <template #text>
          <p class="label eyebrow">
            Outreach
          </p>
          <h1>The rest of the year</h1>
          <p>
            Most of the year is SUAS. The rest is workshops and events.
          </p>
          <ul class="chips">
            <li v-for="o in outreach" :key="o" class="label">
              {{ o }}
            </li>
          </ul>
        </template>
      </ImageTextSection>
    </PageSection>
  </div>
</template>
<script setup lang="ts">
useHead({ title: "About AmadorUAVs" });

const log = [
  { year: "2018", hue: "violet", craft: "Prototype airplanes", result: "Founded on airplanes then moved to multicopters." },
  { year: "2022", hue: "cyan", craft: "Boreas (octocopter)", result: "2nd internationally at SUAS with 69 university teams behind us." },
  { year: "2024", hue: "cyan", craft: "Boreas (octocopter)", result: "1st nationally and 12th internationally plus the JustJoe Sportsmanship Award." },
  { year: "2025", hue: "magenta", craft: "Zephyrus", result: "Dropped a payload from over 100 ft." },
  { year: "2026", hue: "violet", craft: "Ladybug", result: "Twin-winch quad in flight test for SUAS 2026." },
];

const airframes = ["Ladybug", "Zephyrus", "Boreas (octocopter)", "Micron", "VTOL", "Fixed-wing"];

const outreach = ["Middle school workshops", "NXP Hovergames", "Redefining Mobility Summit", "Tri-Valley Innovation Fair", "ACE Code Day workshops"];
</script>

<style scoped>
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

.stat-n { font-family: var(--mono); font-size: 1.7rem; color: var(--fg); }

.log { border: 1px solid var(--line-soft); border-bottom: 0; }
.log .row { margin: 0; }
.log .idx { width: 4rem; flex-shrink: 0; }
.log-title { color: var(--fg); font-weight: 600; width: min(22rem, 40vw); flex-shrink: 0; }
.log-detail { color: var(--dim); }

/* column headings: the same three widths, in label type, so the year /
   aircraft / result reading is obvious without a caption */
.log-head .idx,
.log-head .log-title,
.log-head .log-detail { color: var(--faint); font-weight: inherit; }

@media (max-width: 640px) {
  .log .row { flex-wrap: wrap; }
  .log-title { width: auto; }
}

.press {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.3rem;
  border: 1px solid var(--line);
  padding: 0.9rem 1.1rem;
  transition: background 160ms linear, border-color 160ms linear;
}

.press:hover { background: var(--bg-2); border-color: var(--g2); }
.press-tag { color: var(--g3); flex-shrink: 0; }
.press-title { color: var(--fg); font-weight: 600; }
.press-arrow { margin-left: auto; color: var(--faint); transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1); }
.press:hover .press-arrow { transform: translateX(4px); color: var(--g3); }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 1.1rem 0 0;
}

.chips li {
  border: 1px solid var(--line);
  padding: 0.2rem 0.5rem;
  color: var(--g3);
}
</style>
