<template>
  <div>
    <PageSection hero>
      <template #background>
        <img src="~assets/images/general/Drone_testing_2.webp" alt="One of our drones in the air during a test flight">
      </template>
      <h1>Contact <span class="grad-text">Us</span></h1>
      <h2>New members in August.</h2>
    </PageSection>

    <!-- the ask, up front and unmissable -->
    <PageSection>
      <div class="split">
        <div data-reveal>
          <p class="label eyebrow">
            Joining
          </p>
          <h2 class="join-head">
            Apply in <span class="grad-text">Google Classroom</span>.
          </h2>
          <p class="join-body">
            The application is one Google Classroom assignment.
          </p>
          <NuxtLink to="mailto:officers@amadoruavs.com" class="btn btn-grad">
            officers@amadoruavs.com
          </NuxtLink>
        </div>
        <TraceImage :src="fair" alt="Our drones on the table at the Tri-Valley Innovation Fair" />
      </div>

      <div class="steps" data-reveal-group>
        <div v-for="s in steps" :key="s.n" class="step">
          <p class="label step-n num">
            {{ s.n }}
          </p>
          <h3>{{ s.title }}</h3>
          <p class="step-body">
            {{ s.body }}
          </p>
        </div>
      </div>
    </PageSection>

    <!-- everything else: how to reach us in the meantime -->
    <PageSection>
      <p class="label eyebrow">
        Channels
      </p>
      <div class="grid-hair cols-3">
        <NuxtLink
          v-for="link in socialLinks"
          :key="link.label"
          :to="link.url"
          target="_blank"
          rel="noopener"
          class="cell chan"
          :aria-label="link.label"
          data-reveal
        >
          <ClientIcon :name="link.icon" class="chan-icon h-7 w-7" />
          <span class="chan-label">{{ link.label }}</span>
          <span class="label chan-arrow" aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import fair from "~/assets/images/general/fair.webp";
import { LINKS } from "~/lib/site";
useHead({ title: "Contact Us" });

const steps = [
  {
    n: "01",
    title: "Wait for August",
    body: "The post goes up in August.",
  },
  {
    n: "02",
    title: "Submit the assignment",
    body: "Submit the Google Classroom assignment. That is the application.",
  },
  {
    n: "03",
    title: "Ask first",
    body: "Email officers@amadoruavs.com if the assignment is unclear.",
  },
];

const socialLinks = [
  { url: "https://www.youtube.com/channel/UCvOdhiomLIuf7heNPxDNJXw", icon: "fa-brands:youtube", label: "YouTube" },
  { url: "https://www.facebook.com/amadoruavs", icon: "fa-brands:facebook", label: "Facebook" },
  { url: "https://www.instagram.com/amadoruavs_team/", icon: "fa-brands:instagram", label: "Instagram" },
  { url: "https://www.twitter.com/amadoruavs", icon: "fa-brands:twitter", label: "Twitter" },
  { url: LINKS.github, icon: "fa-brands:github", label: "GitHub" },
  { url: LINKS.gitlab, icon: "fa-brands:gitlab", label: "GitLab" },
  { url: "https://discord.gg/EGuxbw47Cj", icon: "fa-brands:discord", label: "Discord" },
];
</script>

<style scoped>
.chan {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  transition: background 160ms linear;
}

.chan:hover { background: var(--bg-2); }
.chan-icon { color: var(--dim); transition: color 160ms linear; }
.chan:hover .chan-icon { color: var(--g3); }
.chan-label { color: var(--fg); font-weight: 600; }
.chan-arrow { margin-left: auto; color: var(--faint); transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1); }
.chan:hover .chan-arrow { transform: translateX(4px); color: var(--g3); }

.join-head { font-size: var(--size-head); margin-bottom: 0.8rem; }
.join-body { max-width: 56ch; margin-bottom: 1.4rem; }

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
  margin-top: clamp(2.5rem, 6vh, 4rem);
}

@media (max-width: 780px) {
  .steps { grid-template-columns: 1fr; }
}

.step { background: var(--bg); padding: 1.4rem; }
.step-n { color: var(--g3); margin-bottom: 0.7rem; }
.step h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
.step-body { color: var(--fg-soft); margin: 0; }
</style>
