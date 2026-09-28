<template>
  <div>
    <div v-if="pending || video === null" class="vid-loading">
      <p class="label">
        Loading&hellip;
      </p>
    </div>
    <PageSection v-else>
      <p class="label eyebrow">
        Recording
      </p>
      <div class="vid-frame" data-reveal>
        <iframe
          :src="`https://www.youtube.com/embed/${video.code}?enablejsapi=1&version=3&playerapiid=ytplayer`"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="vid-iframe"
        />
      </div>
      <div class="vid-meta" data-reveal>
        <h1>{{ video.title }}</h1>
        <p class="vid-when label num">
          <span class="vid-date">{{ new Date(video.start).toLocaleDateString("en-us", { year: "numeric", month: "short", day: "numeric" }) }}</span>
          <span>{{ new Date(video.start).toLocaleTimeString("en-us", { hour: "numeric", minute: "numeric" }) }}</span>
          <span aria-hidden="true">&ndash;</span>
          <span>{{ new Date(video.end).toLocaleTimeString("en-us", { hour: "numeric", minute: "numeric" }) }}</span>
        </p>
        <div class="vid-body">
          <ContentRendererMarkdown :value="video.body" />
        </div>
      </div>
    </PageSection>
  </div>
</template>
<script setup lang="ts">
const { id } = useRoute().params;
const { data: video, pending } = await useAsyncData("video", () => queryContent(`/videos/${id}`).findOne());
</script>

<style scoped>
.vid-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}

.vid-frame {
  position: relative;
  margin: 1.4rem 0 2rem;
  padding: 3px;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--bg), var(--bg)) padding-box,
    var(--grad) border-box;
}

.vid-iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  background: #000;
}

.vid-meta h1 { max-width: 32ch; }

.vid-when {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin: 0.7rem 0 1.8rem;
  color: var(--dim);
}

.vid-date { color: var(--fg); font-weight: 600; }

.vid-body :deep(p:last-child) { margin-bottom: 0; }
</style>
