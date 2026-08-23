# 005 — Complete reduced-motion coverage
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 global stylesheet and 1 tilt component

## Problem

Reduced motion is currently handled only for the route transition in
`src/styles/global.scss:128-139`, selected Now Playing transitions in
`src/views/NowPlaying.vue:496-502`, and the WebGL loop in
`src/components/common/GradientWaves.vue:326-399`. Other motion remains active:

```scss
/* src/components/home/ImageGallery.vue:187-204 — current */
.image-gallery__skeleton {
  animation: shimmer 1.2s ease-in-out infinite;
}
```

```scss
/* src/components/common/TiltEffect.vue:60-70 — current */
.tilt-effect {
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
  will-change: transform;
}
```

The same gap exists for Toast transitions, image/lightbox keyframes, Favorite
and ServiceStatus spinners, MusicPlayer spinner, and the ImageGallery preview
tilt.

## Target

Add one global reduced-motion block to `src/styles/global.scss` after the
existing page block. It must preserve opacity/color comprehension feedback but
remove continuous/decorative movement:

```scss
@media (prefers-reduced-motion: reduce) {
  .tilt-effect,
  .image-gallery__preview-image {
    transition: none !important;
    transform: none !important;
  }

  .image-gallery__skeleton,
  .image-gallery__spinner,
  .favorites__spinner,
  .service-status__spin,
  .music-player__spinner {
    animation: none !important;
  }

  .project-post__body img {
    opacity: 1 !important;
    animation: none !important;
  }

  .project-post__lightbox,
  .project-post__lightbox-img {
    animation: none !important;
  }
}
```

The exact generated class names must be confirmed against the current source;
do not use broad selectors such as `* { animation: none }` because that would
remove useful state feedback. In `TiltEffect.vue`, also add a
`matchMedia('(prefers-reduced-motion: reduce)')` guard so pointer handlers do
not write 3D transforms when reduced motion is enabled; update the guard when
the media query changes.

For ImageGallery's preview, reduced motion must still allow the loaded image to
become visible immediately; only the transform/transition is removed.

## Repo conventions to follow

- `src/components/common/GradientWaves.vue:354-404` is the existing good
  example: it stops motion but paints a static frame.
- Keep essential opacity/color state changes; do not globally disable all
  transitions.

## Steps

1. Add the scoped global reduced-motion rules with the exact behavior above.
2. Add a reactive reduced-motion guard to TiltEffect's mouse handlers and clean
   up its media-query listener on unmount.
3. Confirm every animation/keyframe listed by `rg -n "animation:|@keyframes" src`
   is either covered or intentionally static.

## Boundaries

- Do not alter GradientWaves' existing lifecycle or frame cap.
- Do not remove color/opacity feedback from buttons, cards, or focus states.
- Do not change normal-motion values.

## Verification

- **Mechanical**: `rg -n "prefers-reduced-motion" src` includes the global
  fallback and TiltEffect guard; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: toggle reduced motion in DevTools Rendering. Shimmer,
  spinners, 3D tilt, and lightbox motion must stop; loaded content and state
  changes must remain visible without blank opacity-0 elements.
- **Done when**: no decorative movement remains under reduced motion and the
  page remains understandable.
