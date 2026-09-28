<template>
  <div class="tm">
    <div class="tm-frame">
      <div class="tm-photo">
        <slot />
      </div>
      <div class="tm-links">
        <NuxtLink :to="`mailto:${email}`" aria-label="Email">
          <HeroIcon name="envelope" size="mini" class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink v-if="github != null" :to="`https://github.com/${github}`" target="_blank" aria-label="GitHub">
          <ClientIcon name="fa-brands:github" class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink v-if="linkedin != null" :to="`https://linkedin.com/in/${linkedin}`" target="_blank" aria-label="LinkedIn">
          <ClientIcon name="fa-brands:linkedin" class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink v-if="instagram != null" :to="`https://instagram.com/${instagram}`" target="_blank" aria-label="Instagram">
          <ClientIcon name="fa-brands:instagram" class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink v-if="spotifyHref" :to="spotifyHref" target="_blank" aria-label="Spotify">
          <ClientIcon name="fa-brands:spotify" class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink v-if="website != null" :to="website" target="_blank" aria-label="Website">
          <HeroIcon size="mini" name="globe-alt" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
    <p class="tm-name">
      {{ name }}<span class="tm-year num">'{{ year }}</span>
    </p>
    <p class="tm-title label">{{ officer ? "★ " : "" }}{{ title }}</p>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{
  name: string;
  year: string;
  title: string;
  officer?: boolean;
  email: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  /** Either a bare Spotify user id or a full profile URL. */
  spotify?: string;
  website?: string;
}>();

// Every profile on the team page is pasted in as a full share URL, which the
// old template then concatenated onto the profile prefix a second time — so
// none of the Spotify links worked. Take the value as given when it already
// is a URL, and only build one from a bare user id.
const spotifyHref = computed(() => {
  const v = props.spotify?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://open.spotify.com/user/${v}`;
});
</script>
<style scoped>
.tm { width: 100%; }

.tm-frame {
  position: relative;
  border: 1px solid var(--line-soft);
  transition: border-color 200ms linear;
}

.tm:hover .tm-frame { border-color: var(--g2); }

.tm-photo :deep(img) {
  width: 100%;
  aspect-ratio: 5 / 6;
  object-fit: cover;
  display: block;
  filter: saturate(0.85);
  transition: filter 240ms linear;
}

.tm:hover .tm-photo :deep(img) { filter: saturate(1.1); }

.tm-links {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 0.35rem;
  padding: 0.35rem 0.45rem;
  background: rgb(var(--bg-rgb) / 0.82);
  border-top: 1px solid var(--line-soft);
  border-left: 1px solid var(--line-soft);
  color: var(--dim);
  opacity: 0;
  transition: opacity 180ms linear;
}

.tm:hover .tm-links,
.tm:focus-within .tm-links { opacity: 1; }

.tm-links a:hover { color: var(--g3); }

.tm-name {
  margin: 0.6rem 0 0.1rem;
  color: var(--fg);
  font-weight: 600;
}

.tm-year {
  margin-left: 0.4rem;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--dim);
}

.tm-title { margin: 0; color: var(--dim); }
</style>
