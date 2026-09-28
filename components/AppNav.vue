<template>
  <header ref="rootEl" class="nav">
    <div class="nav-inner">
      <NuxtLink to="/" class="nav-logo" aria-label="AmadorUAVs home">
        <Logo class="nav-mark" />
        <span class="label nav-word">AmadorUAVs</span>
      </NuxtLink>

      <nav class="nav-links" aria-label="Main">
        <template v-for="page in NAV" :key="page.title">
          <NuxtLink v-if="page.link" :to="page.link" class="label nav-link">
            {{ page.title }}
          </NuxtLink>
          <div v-else class="nav-group">
            <button
              type="button"
              class="label nav-link nav-trigger"
              :aria-expanded="open === page.title"
              :aria-controls="`nav-panel-${slug(page.title)}`"
              @click="open = open === page.title ? null : page.title"
            >
              {{ page.title }}
              <span class="nav-chev" aria-hidden="true">&#9662;</span>
            </button>
            <div
              :id="`nav-panel-${slug(page.title)}`"
              v-show="open === page.title"
              class="nav-panel"
            >
              <NuxtLink
                v-for="sub in page.subPages"
                :key="sub.link"
                :to="sub.link"
                class="label nav-sub"
                @click="open = null"
              >
                {{ sub.title }}
              </NuxtLink>
            </div>
          </div>
        </template>
      </nav>

      <div class="nav-tail">
        <form class="nav-search" role="search" @submit.prevent="submitSearch">
          <label for="site-search" class="sr-only">Search</label>
          <input
            id="site-search"
            v-model="search"
            type="search"
            placeholder="SEARCH"
            class="nav-input label"
            required
          >
        </form>
        <NuxtLink :to="LINKS.suas" target="_blank" rel="noopener" class="nav-ico" aria-label="AUVSI SUAS">
          <CustomIconSuas class="nav-ico-svg" />
        </NuxtLink>
        <NuxtLink :to="LINKS.github" target="_blank" rel="noopener" class="label nav-ico-text">
          GitHub
        </NuxtLink>
        <button
          type="button"
          class="label nav-burger"
          aria-controls="nav-mobile"
          :aria-expanded="mobile"
          :aria-label="mobile ? 'Close the main menu' : 'Open the main menu'"
          @click="mobile = !mobile"
        >
          {{ mobile ? "Close" : "Menu" }}
        </button>
      </div>
    </div>

    <div id="nav-mobile" v-show="mobile" class="nav-mobile">
      <template v-for="page in NAV" :key="'m' + page.title">
        <NuxtLink v-if="page.link" :to="page.link" class="label nav-mobile-link" @click="mobile = false">
          {{ page.title }}
        </NuxtLink>
        <template v-else>
          <NuxtLink
            v-for="sub in page.subPages"
            :key="'m' + sub.link"
            :to="sub.link"
            class="label nav-mobile-link"
            @click="mobile = false"
          >
            {{ sub.title }}
          </NuxtLink>
        </template>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { NAV, LINKS } from "~/lib/site";

const rootEl = ref<HTMLElement | null>(null);
const open = ref<string | null>(null);
const mobile = ref(false);
const search = ref("");

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function submitSearch() {
  if (!search.value) return;
  mobile.value = false;
  await navigateTo("/search-results/" + encodeURIComponent(search.value));
}

const route = useRoute();
watch(() => route.fullPath, () => {
  open.value = null;
  mobile.value = false;
});

// A dropdown you can open but not dismiss is a trap for anyone not using a
// mouse. Escape closes it and returns focus to its trigger; a click or a
// focus landing anywhere outside the nav closes it too.
onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (open.value) {
      const trigger = rootEl.value?.querySelector<HTMLElement>(".nav-trigger[aria-expanded='true']");
      open.value = null;
      trigger?.focus();
    } else if (mobile.value) {
      mobile.value = false;
      rootEl.value?.querySelector<HTMLElement>(".nav-burger")?.focus();
    }
  };
  const onOutside = (e: Event) => {
    const target = e.target as Node | null;
    if (target && rootEl.value?.contains(target)) return;
    open.value = null;
  };

  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onOutside);
  document.addEventListener("focusin", onOutside);

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("pointerdown", onOutside);
    document.removeEventListener("focusin", onOutside);
  });
});
</script>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  /* solid, no backdrop-filter: blurring the animated canvas underneath
     re-renders the blur every frame and was a measurable lag source */
  background: rgb(var(--bg-rgb) / 0.94);
  border-bottom: 1px solid var(--line-soft);
}

.nav-inner {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0 var(--gutter);
  height: var(--nav-h);
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 1.6vw, 1.5rem);
  /* NO overflow clipping here: the About dropdown is absolutely positioned
     below this bar, and hidden overflow clipped it to an empty box. Overflow
     is prevented structurally instead — min-width:0 on the flex children
     plus the width-ordered media queries below that shed optional chrome. */
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--fg);
  flex-shrink: 0;
}

.nav-logo:hover { color: var(--accent); }

.nav-mark {
  height: 24px;
  width: auto;
}

.nav-word { color: inherit; }

.nav-links {
  display: flex;
  align-items: center;
  gap: clamp(0.7rem, 1.5vw, 1.4rem);
  margin-left: auto;
  min-width: 0;
}

.nav-link {
  color: var(--fg-soft);
  transition: color 160ms linear;
  background: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.nav-link:hover,
.router-link-active.nav-link { color: var(--accent); }

.nav-group { position: relative; }

.nav-chev { font-size: 8px; color: var(--faint); }

.nav-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  left: -0.8rem;
  min-width: 9rem;
  background: var(--bg-2);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
}

.nav-sub {
  padding: 0.6rem 0.9rem;
  color: var(--fg-soft);
  border-bottom: 1px solid var(--line-soft);
}

.nav-sub:last-child { border-bottom: 0; }
.nav-sub:hover { background: var(--bg-3); color: var(--accent); }

.nav-tail {
  display: flex;
  align-items: center;
  gap: clamp(0.6rem, 1.2vw, 1rem);
  flex-shrink: 0;
  min-width: 0;
}

.nav-input {
  width: 7.5rem;
  padding: 0.35rem 0.5rem;
  background: transparent;
  border: 1px solid var(--line);
  color: var(--fg);
}

.nav-input::placeholder { color: var(--dim); }
.nav-input:focus { border-color: var(--accent); }

.nav-ico { color: var(--dim); }
.nav-ico:hover { color: var(--accent); }
.nav-ico-svg { height: 20px; width: 20px; }

.nav-ico-text { color: var(--dim); }
.nav-ico-text:hover { color: var(--accent); }

.nav-burger { display: none; color: var(--fg-soft); }

.nav-mobile { display: none; }

/* .sr-only is global (assets/css/main.css) */

/* shed optional chrome in width order, well before anything can clip */
@media (max-width: 1180px) {
  .nav-ico-text { display: none; }
}

@media (max-width: 1080px) {
  .nav-search { display: none; }
}

@media (max-width: 980px) {
  .nav-ico { display: none; }
}

@media (max-width: 900px) {
  .nav-links { display: none; }
  .nav-search { display: none; }
  .nav-ico, .nav-ico-text { display: none; }
  .nav-burger { display: block; margin-left: auto; }

  .nav-mobile {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--line-soft);
    background: var(--bg-2);
  }

  .nav-mobile-link {
    padding: 0.9rem var(--gutter);
    color: var(--fg-soft);
    border-bottom: 1px solid var(--line-soft);
  }

  .nav-mobile-link:hover { color: var(--accent); }
}
</style>
