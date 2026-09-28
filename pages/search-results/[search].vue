<template>
  <div>
    <PageSection>
      <p class="label eyebrow">Search</p>
      <h1 class="sr-head">Results for "<span class="grad-text">{{ search }}</span>"</h1>
      <div v-if="filtered.length" class="sr-list">
        <SearchItem v-for="page in filtered" :key="page.link" :page="page" />
      </div>
      <div v-else class="sr-empty">
        <p>
          Nothing matched. Try drone or team or sponsor.
        </p>
      </div>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import SearchItem from "~/components/SearchItem.vue";

const route = useRoute();
const search = String(route.params.search || "");

interface SitePage { title: string; terms: string; link: string }

const pages: SitePage[] = [
  {
    title: "Home",
    terms: "home amadoruavs mission hero drone uav autonomous aircraft",
    link: "/",
  },
  {
    title: "Ladybug ('26)",
    terms: "ladybug drone uav aircraft quadcopter airframe specs walkaround wireframe 2026 suas motors mn7005 props arms carbon fibre latch pixhawk 6x flight controller raspberry pi ai hat compute elrs 915 rc link gimbal siyi a8 camera esc myxa zubax battery 6s4p rs50 winch payload delivery testing simulation design decisions gallery photos",
    link: "/ladybug",
  },
  {
    // The standalone Design Documentation page was folded into the Ladybug
    // page; the search entry survives it and lands on the process section.
    title: "Design Documentation",
    terms: "design documentation technical papers tdp reports engineering process build log blog history cad onshape fea simulate ladybug 2026 season historical record trade study decisions",
    link: "/ladybug#process",
  },
  {
    title: "Zephyrus ('25)",
    terms: "zephyrus drone uav aircraft quadcopter airframe 2025 specs walkaround motors props arms carbon fibre pixhawk 6x flight controller jetson orin gimbal siyi a8 camera gps gnss f9p esc myxa battery payload testing simulation",
    link: "/zephyrus",
  },
  {
    title: "About AmadorUAVs",
    terms: "about club history competition suas auvsi awards record story flight log amador valley high school outreach workshops",
    link: "/about",
  },
  {
    title: "The Team",
    terms: "team members member alumni roster people students leads president mechanical software electrical operations",
    link: "/team",
  },
  {
    title: "Contact Us",
    terms: "join contact email discord recruit membership signup interest how to join get involved",
    link: "/join",
  },
  {
    title: "Sponsor",
    terms: "sponsor sponsors sponsorship donate support funding partners tiers",
    link: "/sponsor",
  },
  {
    title: "Streaming",
    terms: "stream streams streaming video videos live flights youtube",
    link: "/streaming",
  },
  {
    title: "Flight Testing",
    terms: "flight testing drone testing test flights process trials ladder stages hover navigation rtk auto-landing endurance safety pilot foothill field",
    link: "/drone-testing",
  },
  {
    title: "Payload Testing",
    terms: "payload testing drop winch winches spool servo mg90s dampers delivery tests medkit drop rig",
    link: "/payload-testing",
  },
];

const filtered = computed(() => {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = pages
    .map((page) => {
      const hay = (page.title + " " + page.terms).toLowerCase();
      let score = 0;
      for (const w of words) {
        if (page.title.toLowerCase().includes(w)) score += 3;
        else if (hay.includes(w)) score += 1;
      }
      return { page, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((r) => r.page);
});

useHead({ title: `Search: ${search}` });
</script>

<style scoped>
.sr-head {
  font-size: var(--size-head);
  margin-bottom: 2rem;
  overflow-wrap: anywhere;
}

.sr-list {
  border: 1px solid var(--line-soft);
  border-bottom: 0;
}

.sr-list :deep(.row) { margin: 0; }

.sr-empty { color: var(--fg-soft); }

.sr-home {
  color: var(--g3);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
