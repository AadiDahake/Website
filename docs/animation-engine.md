# Animation engine

The site is mostly static pages. Motion lives in a few client-only systems that share one vocabulary and one rule: nothing animates when it cannot be seen, and a visitor with reduced motion, no JavaScript, or no WebGL still gets the content.

Three.js and anime.js never land in the entry bundle. `nuxt.config.ts` splits them into their own chunks, and every 3D scene is pulled in with a dynamic `import()` from its Vue component. Scroll reveals are the exception: anime.js is imported statically inside `lib/reveal.ts` on purpose, explained below.

| What you see | Where it runs | Driver |
| --- | --- | --- |
| Sections fading up, numbers counting | Every page, via `components/effects/PageFx.vue` | anime.js |
| Homepage mission (Ladybug searches, drops a box, flies home) | `components/HeroSearch.vue` | `lib/hero` |
| Zephyrus walkaround | `components/ZephTour.vue` | `lib/zephtour.ts` |
| Ladybug you can orbit and pick apart | `components/LadybugExplorer.vue` | `lib/ladybugexplorer.ts` |
| Photos that draw themselves in as line art | `components/TraceImage.vue` | `lib/trace.ts` |
| Soft gradient that follows the cursor | `layouts/default.vue` | one CSS transform |

`lib/boreastour.ts` and `components/BoreasTour.vue` are the same walkaround, built for the 2022 airframe. No page mounts them right now.

## Shared vocabulary

`lib/motion.ts` is the only place durations and eases are named. Reuse these. A new number in a one-off call is how the site starts to feel like five different sites.

```ts
EASE.entrance     // "out(3)"    things arriving
EASE.entranceSoft // "out(2)"
EASE.pop          // "out(4)"    counters, snaps
EASE.exit         // "in(2)"
EASE.mech         // "inOut(2)"  mechanical moves
EASE.violent      // "inOut(4)"
EASE.linear

DUR.pop           // 180ms
DUR.entrance      // 380ms
DUR.entranceLong  // 750ms
DUR.exit          // 240ms
DUR.mech          // 700ms
DUR.camera        // 1200ms
```

The ease strings match anime.js v4 exactly: `in(p)` is `t^p`, `out(p)` is `1 - (1-t)^p`, `inOut(p)` splits that at the halfway point. `lib/hero/track.ts` reimplements the same three so the homepage can drop anime.js and still hit the same curves.

Also in `lib/motion.ts`:

- `prefersReduced()` reads `prefers-reduced-motion`. Every system treats that as a finished pose, not as a slower animation.
- `gateToView(el, onRun)` starts work only while the element is on screen and the tab is visible. Returns a cleanup.
- `makeClock()` clamps frame delta to 50ms so a tab that slept does not teleport the aircraft.
- `rendererBudget(w, h)` caps device pixel ratio and total pixels. A fullscreen Retina canvas with MSAA is the usual reason a scene stutters.
- `clamp`, `lerp`, `smooth` (smoothstep), and `mulberry32` (seeded random, so scatter is the same every load).

## Scroll reveals

`components/effects/PageFx.vue` mounts `initReveal()` after hydration and again on every route change. The markup is the source of truth. The effect only adds motion.

Put these on server-rendered elements:

- `data-reveal` fades that element up from 22px.
- `data-reveal-group` does the same to each direct child, staggered by 90ms.
- `data-count="20"` counts from 0 to that number. Optional `data-prefix` and `data-suffix` (the suffix is how "20 FPS" and "22 MIN" are written).

Hide-then-observe happens in the same turn as the animator being ready. anime.js is imported statically in `lib/reveal.ts` because a dynamic import once left elements at `opacity: 0` for a whole network round trip. With JavaScript disabled, nothing is hidden, so the page is still readable.

Reduced motion skips the animation and paints the final count immediately.

## Homepage hero

`initHero()` in `lib/hero/index.ts` plays one cinematic and then parks. The aircraft is the real Ladybug CAD (`loadLadybugSolid`), shaded, with props, a gimbal, a spotlight, and a winch. There is no precomputed video. It renders live.

Until the mesh and the first frame are ready, the SVG in `[data-poster]` is what the visitor sees. That poster is also the reduced-motion and no-WebGL state (`hero--static` on the host). The canvas fades in over it, then the poster is removed.

### Mission clock

Beats are written on a 13 second grid. One scale factor retimes the whole sequence:

```ts
const RAW_TOTAL = 18600;
const SPEED = 20000 / 13000;
const K = (ms: number) => ms * SPEED;
```

Author a new beat as `K(2400)`, not as a raw millisecond on the stretched clock. Caption windows in `HeroSearch.vue` (`data-w="2700,5900"`) are on that same 13 second grid and get scaled when the engine reads them.

Phases, in authored milliseconds:

| Clock | Phase | What the camera does |
| --- | --- | --- |
| 0–1000 | STANDBY | Props spin up. Gimbal follows the pointer. |
| 1000–2400 | APPROACH | Swing to a side view of one arm. |
| 2400–4700 | AIRFRAME | Track along the carbon arm. |
| 4700–5800 | ORBIT | Spin around and pull out. |
| 5800–6900 | ACQUIRE | Drop below. Gimbal and spotlight wake. |
| 6900–8300 | SCAN | The beam sweeps. What it touches goes off-white. |
| 8300–9900 | TRACK | Pan, tilt, and zoom onto the find. |
| 9900–10600 | DELIVER | Pull wide so the aircraft and the find share the frame. |
| 10600–12900 | FLYOVER | It flies over the find, banks, brakes, hovers. |
| 12900–15650 | DROP | Winch pays out. Camera rides down with the box. |
| 15650–16300 | RETRACT | Line reels back in. |
| 16300–18600 | RTB | Home. Parked pose is the drone, back at the opening camera. |

After RTB the mission clock stops. Props wind down to a slow idle (a stopped prop reads as broken), the airframe leans toward the cursor, and the gimbal tracks it. That handover is eased. Snapping the gimbal to the pointer in one frame is a visible pop.

`R` replays. `P` pauses the clock only. Props and the gimbal keep moving, so a pause looks like an aircraft holding station. The Pause and Replay buttons stay hidden until the engine is actually running.

`?heroT=0.5` pins the clock at that fraction of the mission (0 to 1) and turns smoothing off, so you can inspect a beat. `?stats` draws a frame-time overlay: step time, JS time, GPU submit time, pixel ratio, draw calls.

### Two timelines

The 3D choreography does not use anime.js. About forty numeric tracks (camera, gimbal, envelopes, dim groups) are seeked every frame. A general timeline walks child tweens and allocates as tweens start and finish, which showed up as spikes mid-mission.

`TrackTimeline` in `lib/hero/track.ts` is the replacement. It only accepts plain objects of numbers, and segments on one property must not overlap. At the first `seek` it compiles the schedule into typed arrays. After that, evaluation is a cursor walk and writes the number back onto the object. Cost does not change as segments start and end.

```ts
const tl = new TrackTimeline({ defaults: { ease: "inOut(2)" } });
tl.add(cam, { dist: 0.62, duration: K(1300) }, K(1000));
// later, every frame:
tl.seek(missionT);
```

The objects it drives:

- `cam` — orbit camera: `dist`, `az`, `el`, and look-at `tx ty tz`.
- `gim` — gimbal yaw and pitch.
- `env` — `drive` (rotor speed), `beam`, `field`, `box`, `title`, `pan`, `invert`, `narrow`.
- `fly` — aircraft translation and bank during the flyover and return.
- `win` — winch payout and the release that leaves the box in the world.
- `dims` — how visible each material group is: `shell`, `soft`, `avionics`, `accent`, `props`, `winch`. A level near zero means the part has faded into the page ground, not that it went black.

Camera values are not used raw. Each channel is followed by a critically damped spring (`SMOOTH_TIME` about 90ms) so a segment that starts at full ease-out velocity does not step. Replay and `?heroT` reset or bypass that spring.

Captions stay on CSS. Showing one used to start a handful of JS tweens, and reading their start values forced layout at the exact moment the text appeared. `showCap` swaps between two identical keyframe classes (`cap--in-a` / `cap--in-b`) so the animation restarts without a reflow. Callout positions are the one DOM write per frame that has to stay: a projected 3D point becomes a `translate3d`.

### Markup the hero reads

All of this is in `components/HeroSearch.vue`. The engine queries the host. It does not own the copy.

| Attribute | Role |
| --- | --- |
| `[data-stage]` | Sized element. The canvas fills it. A `ResizeObserver` on this drives resolution. |
| `canvas` | WebGL surface. |
| `[data-poster]` | SSR still. Removed after the first real frame. |
| `[data-hero-watch]` | Elements that keep the loop alive while intersecting. The stage has this. |
| `[data-title]` | Headline. Opacity follows `env.title`. |
| `[data-hint]` | Status line ("Mission in flight", then the replay hint). |
| `[data-w="start,end"]` | Caption window, authored on the 13s grid. The heading inside needs `[data-split]` so words can stagger. |
| `[data-callout="arm"]` | Label glued to a marker on the aircraft or the field. Keys: `arm`, `motor`, `gimbal`, `target`, `drop`. |
| `[data-detect]` | "FOUND" readout during the track beat. |
| `[data-hud-phase]` `[data-hud-alt]` `[data-hud-gimbal]` | Diegetic readout. Text is written only when the integer value changes. |
| `[data-hero-pause]` `[data-hero-replay]` | Buttons. Hidden in markup until `hero--playable`. |

### Drawing the aircraft

`lib/hero/pen.ts` is a small CAD line builder. Parts are authored once at the origin and stamped with a transform stack (four arms, four motors). The result is a handful of merged `LineSegments`, one per material, so the aircraft is about a dozen draw calls instead of hundreds of objects.

`lib/hero/ladybug-drone.ts` assembles that line work around the solid mesh from `lib/hero/ladybug-solid.ts`. The solid mesh is not the raw Onshape export. `scripts/ladybug-solid-pack.mjs` rebuilds it: instanced subassemblies, welded vertices, quadric decimation, crease-split normals, baked ambient occlusion, and a part-color palette. Runtime shading reads that packed asset. It does not decimate on the visitor's machine.

`lib/hero/field.ts` is the ground, the target, and the spotlight stamp. `lib/hero/invert.ts` is the spotlight's color inversion: one extra draw with a destination-reading blend, no render target and no post pass. The fragment shader solves the cone analytically, so the edge is antialiased and the shader only runs over the cone's screen footprint.

Materials that fade on later in the mission would otherwise compile their shaders mid-flight, at a fixed beat, which reads as a hitch. `warmUp()` draws one invisible frame with everything visible before the clock starts, so that compile happens during the poster.

### Frame pacing

The loop counts animation frames. It does not compare `performance.now()` deltas to decide whether to skip. Some browsers quantize those timestamps, and a threshold then skips erratically even when the scene is cheap.

On a 120Hz panel the hero renders every second tick (about 60fps) at full resolution. On 60Hz it renders every tick. If frames arrive late for two windows in a row, it drops one more step and holds that cadence. It does not drop resolution. An uneven frame rate reads as stutter more than a lower, even one does.

While the probe is running (the first couple of dozen ticks, which overlap hydration), it renders every other tick so the start of the mission is not the expensive moment.

The loop stops when `[data-hero-watch]` leaves the viewport or the tab is hidden. Cleanup on unmount cancels the frame, disconnects observers, removes listeners, and disposes geometries, materials, and the renderer.

Pointer moves do not call `getBoundingClientRect`. The stage rect is cached and refreshed on scroll and resize. Rotor hover tests are a ray against four known discs, not a triangle raycast.

## Walkaround tours

`initZephTour` (and the unused Boreas twin) is a shorter cousin of the hero. It autoplays a list of `STOPS`, each a camera pose on a named part, then crash-zooms back to the whole aircraft and parks. Props keep spinning. The cursor still leans the airframe.

These tours still use an anime.js timeline. They have far fewer tracks than the homepage, and the chip labels are DOM, which is where anime earns its cost. Chips are `[data-chip="start,end"]` elements. Times here are real milliseconds on that tour's own clock, not `K()` values.

`R` replays. Left and right arrows jump between stops, including while it is parked. Keys are ignored when the tour is off screen or focus is in a text field.

`?tourT=0.5` pins the tour the same way `?heroT` pins the hero.

Pixel ratio comes from `rendererBudget`. The hero uses a higher cap of its own because that scene is the one people judge.

## Ladybug explorer

`initLadybugExplorer` is not a timeline. Nothing plays. The reader orbits, and clicking a part (or a row in the part list) ghosts the rest of the aircraft so that part can be read on its own. Ghost opacity is low enough to see through the shell to the Pixhawk. Dim would still hide it.

Picking is a GPU id pass, not a raycast. The packed mesh stores quantized positions, so a CPU ray test against those numbers would miss. The view renders when the camera moves or a selection is easing, and not otherwise. There is no idle `requestAnimationFrame`.

Part names and camera targets live in `lib/ladybug-parts.ts`. A part that is not listed there never lights up, even if the mesh contains it.

## Photo traces

`initTrace` draws a Sobel edge image of the photograph, tinted along the brand gradient, then sweeps that drawing on with a CSS mask and fades the real photo through it. The line art is the photo's own edges.

Any failure (decode, CORS, a browser that garbles canvas readback) shows the photograph and hides the canvas. Reduced motion shows the photograph immediately. The effect is decoration. The photo is the content.

## Cursor glow

The fixed gradient in `layouts/default.vue` is not part of the 3D engine. Pointer events are coalesced to one transform write per frame, and CSS eases that transform. It is disabled for reduced motion and for coarse pointers. It does not use `mix-blend-mode`. A blend layer over the hero's canvas made Chrome composite stale frames over scrolled content.

## When you change it

- Add page motion with `data-reveal`, `data-reveal-group`, or `data-count` before you write a new animator.
- Take durations and eases from `lib/motion.ts`.
- Keep three.js and anime.js behind a dynamic import, except `lib/reveal.ts`.
- On the hero, write times with `K()` and do not overlap two segments of the same property. `TrackTimeline` assumes the previous segment's end value is this segment's start.
- Do not read layout (`getBoundingClientRect`, `offsetWidth`, computed style) inside the frame loop, a pointer handler, or the moment a caption appears.
- Do not allocate per frame. The callout list and the phase table are built once for this reason.
- Gate long-running loops on visibility, and dispose WebGL resources in the cleanup the component already calls from `onBeforeUnmount`.
- Reduced motion, no JS, and no WebGL each need a designed still state. The poster, the un-hidden reveal, and the plain photo are those states.
- If a beat hitches at the same moment every play, suspect a shader compiling as it fades in, or a layout read as text appears, before you suspect the mesh.
