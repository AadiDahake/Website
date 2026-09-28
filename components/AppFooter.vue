<template>
  <footer class="foot">
    <div class="wrap foot-inner">
      <div class="foot-block">
        <div class="foot-brand">
          <Logo class="foot-mark" />
          <p class="foot-name">{{ ORG.legalName }}</p>
        </div>
        <p class="label foot-meta">{{ ORG.location }}</p>
        <p class="label foot-meta"><a class="foot-mail" :href="`mailto:${ORG.email}`">{{ ORG.email }}</a></p>
        <p class="label foot-meta num">&copy; {{ ORG.years }} &middot; EIN {{ ORG.ein }}</p>
      </div>

      <nav class="foot-links" aria-label="Footer">
        <NuxtLink to="/ladybug" class="label foot-link">Ladybug ('26)</NuxtLink>
        <NuxtLink to="/zephyrus" class="label foot-link">Zephyrus ('25)</NuxtLink>
        <NuxtLink to="/drone-testing" class="label foot-link">Flight Testing</NuxtLink>
        <NuxtLink to="/payload-testing" class="label foot-link">Payload Testing</NuxtLink>
        <NuxtLink to="/about" class="label foot-link">About AmadorUAVs</NuxtLink>
        <NuxtLink to="/team" class="label foot-link">The Team</NuxtLink>
        <NuxtLink to="/ladybug#process" class="label foot-link">Design Docs</NuxtLink>
        <NuxtLink to="/streaming" class="label foot-link">Streaming</NuxtLink>
        <NuxtLink to="/sponsor" class="label foot-link">Sponsor</NuxtLink>
        <NuxtLink to="/join" class="label foot-link">Contact Us</NuxtLink>
        <NuxtLink :to="LINKS.suas" target="_blank" rel="noopener" class="label foot-link">AUVSI SUAS</NuxtLink>
        <NuxtLink :to="LINKS.github" target="_blank" rel="noopener" class="label foot-link">GitHub</NuxtLink>
        <NuxtLink :to="LINKS.gitlab" target="_blank" rel="noopener" class="label foot-link">GitLab</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ORG, LINKS } from "~/lib/site";
</script>

<style scoped>
.foot {
  /* positioned above z-0 layers: the home page's fixed 3D canvas paints
     over static elements otherwise */
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--line);
  background: var(--bg-2);
  padding: clamp(2.5rem, 6vh, 4rem) 0;
}

.foot-inner {
  display: flex;
  justify-content: space-between;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.foot-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--fg);
  margin-bottom: 0.75rem;
}

.foot-mark { height: 28px; width: auto; }

.foot-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--fg);
}

.foot-meta { color: var(--dim); line-height: 1.9; }
.foot-mail { color: var(--fg-soft); }
.foot-mail:hover { color: var(--accent); }

.foot-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(8rem, 1fr));
  gap: 0.55rem 2rem;
  align-content: start;
}

.foot-link { color: var(--fg-soft); }
.foot-link:hover { color: var(--accent); }
</style>
