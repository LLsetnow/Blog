# 009 — Remove decorative tilt from high-frequency home cards
- **Status**: DONE
- **Commit**: 3887f53
- **Severity**: HIGH
- **Category**: Purpose & frequency / Performance
- **Estimated scope**: 4 source files; delete one now-unused component

## Problem

Almost every dense, high-frequency home surface is wrapped in `TiltEffect`,
including navigation, status, gallery, social links, and the greeting card.
The component reads element geometry and writes a three-dimensional transform
on every mousemove. Its default 8 degree rotation and 3% scale do not explain a
state change or a spatial relationship; they are decorative motion on surfaces
users scan and click repeatedly.

```vue
<!-- src/views/HomePage.vue:5-60 — current excerpt -->
<div class="home-page__cell" :style="getWidgetStyle('greeting')">
  <TiltEffect :disabled="isDragMode">
    <GreetingCard />
  </TiltEffect>
</div>

<div class="home-page__cell home-page__nav-cell" data-widget="nav" :style="getWidgetStyle('nav')">
  <TiltEffect :disabled="isDragMode">
    <NavMenu />
  </TiltEffect>
</div>
```

```ts
/* src/components/common/TiltEffect.vue:51-76 — current excerpt */
function onMouseMove(event: MouseEvent): void {
  if (props.disabled || prefersReducedMotion.value) return
  const element = tiltRef.value
  if (!element) return

  element.style.transition = 'transform 0.1s ease-out'
  const rect = element.getBoundingClientRect()
  // …calculate a pointer-relative rotation…
  element.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${props.scale}, ${props.scale}, ${props.scale})`
}

function onMouseLeave(): void {
  // …
  element.style.transition = 'transform 0.5s ease'
}
```

The global mini player is also wrapped, so its playback controls rotate while a
pointer is trying to press them:

```vue
<!-- src/App.vue:43-46 — current -->
<div v-if="showPlayer" class="player-wrapper" ref="playerRef">
  <TiltEffect :disabled="isMini">
    <MusicPlayer :mini="isMini" />
  </TiltEffect>
</div>
```

## Target

The home canvas and floating player remain visually rich through the existing
gradient backdrop, glass depth, focused hover styles, and deliberate modal /
lightbox transitions. They do not rotate, scale, or run pointer-following code
while a reader moves across the page.

- Remove every `TiltEffect` wrapper and import from `src/views/HomePage.vue`.
- Render `<MusicPlayer :mini="isMini" />` directly inside `.player-wrapper` in
  `src/App.vue`; remove its `TiltEffect` import.
- Delete `src/components/common/TiltEffect.vue` once no import remains.
- Remove the now-dead `.tilt-effect` selector from the reduced-motion block in
  `src/styles/global.scss`; preserve all other reduced-motion selectors.
- Do not add a replacement card-scale, cursor-follow, or spring animation.

## Repo conventions to follow

- Home widgets already use component-local interaction feedback, e.g.
  `src/components/home/MusicPlayer.vue:417-428` has explicit property
  transitions and a press state.
- The project intentionally disables continuous decorative movement for
  reduced-motion users in `src/styles/global.scss:141-188`; this plan removes
  the same nonessential movement for the normal high-frequency reading path.

## Steps

1. In `src/views/HomePage.vue`, remove the `TiltEffect` import. Replace every
   `<TiltEffect :disabled="isDragMode">…</TiltEffect>` pair with its existing
   child component, preserving each surrounding `.home-page__cell`, its
   `data-widget`, and all event bindings exactly.
2. In `src/App.vue`, remove the `TiltEffect` import and wrapper. Keep the
   `v-if`, `.player-wrapper`, `ref`, and `<MusicPlayer :mini="isMini" />`
   unchanged.
3. Confirm with `rg -n "TiltEffect|tilt-effect" src` that only a dead global
   selector remains. Delete that selector from `src/styles/global.scss` without
   weakening the adjacent gallery or spinner reduced-motion rules.
4. Delete `src/components/common/TiltEffect.vue` only after the search returns
   no source import or usage.

## Boundaries

- Do not alter widget coordinates, drag mode, canvas scaling, music playback,
  or the `GradientWaves` backdrop.
- Do not replace the removed effect with an animation library or new dependency.
- Do not change hover color/opacity or press feedback that is already local to a
  component.
- If any non-home consumer of `TiltEffect` appears after the commit stamped
  above, stop and report it instead of deleting the component.

## Verification

- **Mechanical**:
  - Run `rg -n "TiltEffect|tilt-effect" src`; expect no results.
  - Run `npm exec vue-tsc -- --noEmit`; expect success.
  - Run `git diff --check`; expect no output.
- **Feel check**:
  - On desktop, sweep the pointer quickly across the home cards and the
    full-size music player. Card edges and controls must remain spatially
    stable while their existing local hover states still respond.
  - Enter layout drag mode and verify widgets can still be moved and saved.
  - Start audio, navigate away from home, and verify the compact player still
    appears in its existing bottom-right position.
- **Done when**: no homepage or player element follows pointer movement, while
  all existing click, drag, and playback behaviour is intact.
