<template>
  <div class="divide-y divide-stone-800">
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/streaming/football-mixing.webp" alt="Our team mixing a broadcast at a football game">
      </template>
      <h1>Streaming<span class="grad-text">.</span></h1>
      <h2>
        We stream school sports and events live.
      </h2>
    </PageSection>
    <PageSection class="flex flex-col space-y-10 lg:space-y-16">
      <ImageTextSection>
        <template #image>
          <img src="~/assets/images/streaming/football-filming.webp" alt="A group picture of our team in 2019">
        </template>
        <template #text>
          <h1>Broadcasts</h1>
          <p>
            SUAS got cancelled in 2021 so we streamed sports and then graduation.
            That program is AVHS Events.
          </p>
        </template>
      </ImageTextSection>
    </PageSection>
    <PageSection section-id="browse" data-hue="cyan">
      <p class="label eyebrow">
        Archive
      </p>
      <h2 class="st-head">
        All streams
      </h2>
      <div class="st-grid">
        <NuxtLink
          v-for="(video, i) in videos"
          :key="video._path"
          :to="`/streaming${video._path}`"
          class="st-card"
          data-reveal
        >
          <div class="st-thumb">
            <img :src="`https://img.youtube.com/vi/${video.code}/0.jpg`" :alt="`Thumbnail for ${video.title}`" loading="lazy" width="480" height="270">
            <span class="st-rec label" aria-hidden="true"><i />REC</span>
          </div>
          <div class="st-copy">
            <p class="label st-idx num">
              {{ String(i + 1).padStart(2, "0") }}
            </p>
            <h3>{{ video.title }}</h3>
            <p class="st-when label num">
              {{ new Date(video.start).toLocaleDateString("en-us", { year: "numeric", month: "short", day: "numeric" }) }}
            </p>
            <p v-if="video.description" class="st-desc">
              {{ video.description }}
            </p>
            <span class="label st-cta">Watch <span aria-hidden="true">&rarr;</span></span>
          </div>
        </NuxtLink>
      </div>
    </PageSection>
  </div>
</template>
<script setup lang="ts">
useHead({
  title: "Streaming",
});
const { data: videos } = await useAsyncData("videos", () => queryContent("/videos").sort({ start: -1 }).find());

</script>

<style scoped>
.st-head {
  font-size: var(--size-head);
  margin-bottom: 1.8rem;
}

.st-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (max-width: 900px) {
  .st-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 620px) {
  .st-grid { grid-template-columns: 1fr; }
}

.st-card {
  position: relative;
  display: block;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--bg-2), var(--bg-2)) padding-box,
    linear-gradient(var(--line-soft), var(--line-soft)) border-box;
  transition: transform 200ms cubic-bezier(0.33, 0, 0.2, 1), background 200ms linear;
}

.st-card:hover,
.st-card:focus-visible {
  transform: translateY(-3px);
  background:
    linear-gradient(var(--bg-2), var(--bg-2)) padding-box,
    var(--grad) border-box;
}

.st-card::after {
  content: "";
  position: absolute;
  inset: -1px;
  z-index: -1;
  background: var(--grad);
  opacity: 0;
  filter: blur(18px);
  pointer-events: none;
  transition: opacity 240ms linear;
}

.st-card:hover::after,
.st-card:focus-visible::after { opacity: 0.3; }

.st-thumb {
  position: relative;
  border-bottom: 1px solid var(--line-soft);
  overflow: hidden;
}

.st-thumb img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  transition: transform 300ms cubic-bezier(0.33, 0, 0.2, 1);
}

.st-card:hover .st-thumb img { transform: scale(1.04); }

.st-rec {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.45rem;
  background: rgb(0 0 0 / 0.75);
  color: var(--g1);
}

.st-rec i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--g1);
}

.st-copy { padding: 1.1rem 1.2rem 1.3rem; }
.st-idx { color: var(--hue); margin-bottom: 0.5rem; }
.st-card h3 { font-size: 1.05rem; margin-bottom: 0.4rem; }
.st-when { color: var(--dim); margin: 0 0 0.6rem; }

.st-desc {
  margin: 0 0 0.9rem;
  color: var(--fg-soft);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.st-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--hue);
  transition: gap 160ms linear;
}

.st-card:hover .st-cta { gap: 0.65rem; }
</style>
