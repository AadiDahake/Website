# AmadorUAVs

The team website. Nuxt 3, Tailwind, and a client-side animation engine for the homepage mission, the aircraft tours, and the scroll reveals.

## Setup

Yarn is the package manager. `yarn.lock` is the lockfile.

```bash
yarn install
yarn dev
```

The dev server is at http://localhost:3000.

```bash
yarn build      # production build
yarn generate   # static export
yarn preview    # preview the production build
npx eslint .    # lint
```

There are no tests.

## Animation

How the motion works, which file owns which scene, and the rules that keep it smooth: [docs/animation-engine.md](docs/animation-engine.md).

Read that before changing the homepage hero, a walkaround, the Ladybug explorer, or a `data-reveal` attribute.
