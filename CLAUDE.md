# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses yarn. `yarn.lock` is the lockfile.

- `yarn install` — install dependencies (runs `nuxt prepare` postinstall to generate `.nuxt/` types)
- `yarn dev` — dev server at http://localhost:3000
- `yarn build` — production build
- `yarn generate` — static site generation
- `yarn preview` — preview production build
- `npx eslint .` — lint (no lint script is defined in package.json)

There are no tests.

## Architecture

Nuxt 3 (v3.6.5) website for AmadorUAVs, a high-school drone team, styled with Tailwind CSS. Mostly static marketing/info pages plus a streaming video section.

- **Pages** (`pages/`): file-based routing. Most pages are compositions of the same building blocks: `PageSection`, `ImageTextSection`, `Feature`, `Accordian1`, `TeamMember`, etc. When adding a page, follow this pattern rather than writing bespoke layout markup.
- **Layouts** (`layouts/`): `default` wraps pages with `AppNav` / `AppFooter` and mounts `EffectsPageFx` (scroll reveals). `minimal` is a bare slot.
- **App shell** (`app.vue`): self-hosts Inter and DM Mono and applies the `"<title> | AmadorUAVs"` title template via `useHead`.
- **Animation** (`lib/hero`, `lib/motion.ts`, `lib/reveal.ts`, the tour and explorer modules): see [docs/animation-engine.md](docs/animation-engine.md). Three.js scenes are dynamic-imported. Do not add a new duration or ease without using `lib/motion.ts`.
- **Content** (`content/videos/*.md`): @nuxt/content markdown files with frontmatter (`title`, `code` = YouTube video ID, `start`, `end`, `tags`) drive the streaming pages (`pages/streaming/index.vue` lists them, `pages/streaming/videos/[id].vue` renders one). To add a stream, add a markdown file—no code changes needed.
- **Client-only widgets** live in `.client.vue` components (e.g. `ClientIcon.client.vue`).
- **Search** (`pages/search-results/[search].vue`): client-side filtering of site pages, rendered via `SearchItem`.
- **Types** (`types/index.d.ts`): ambient `NavPage`/`NavSubPage` types used by the nav.

## Styling

- Tailwind. Design tokens live in `assets/css/main.css` (kept in sync with `lib/theme.ts`). Text-heavy blocks use `prose prose-invert`.
- ESLint enforces double quotes, semicolons, 2-space indent, trailing commas on multiline, and Tailwind class ordering (`plugin:tailwindcss/recommended`).
