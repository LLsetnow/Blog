# 013 — Move gallery loading shimmer onto the compositor
- **Status**: DONE
- **Commit**: 3887f53
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 stylesheets

## Problem

Each unloaded gallery thumbnail runs a keyframe that changes
`background-position`. A cold home load can animate up to eight skeletons at
once, forcing recurring paint work instead of moving a composited layer.

```scss
/* src/components/home/ImageGallery.vue:189-205 — current */
&__skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Target

Keep the same restrained glass highlight but move a pseudo-element with
`transform`, which is compositor-friendly. The skeleton base is a static
`rgba(255, 255, 255, 0.04)`; its `::after` highlight travels at a constant
speed.

```scss
/* target */
.image-gallery__skeleton {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.image-gallery__skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 50%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  transform: translateX(-200%);
  animation: gallery-shimmer 1.2s linear infinite;
}

@keyframes gallery-shimmer {
  to { transform: translateX(300%); }
}
```

The reduced-motion state must stop the pseudo-element animation as well:

```scss
@media (prefers-reduced-motion: reduce) {
  .image-gallery__skeleton::after { animation: none !important; }
}
```

## Repo conventions to follow

- `src/components/home/MusicPlayer.vue:531-532` uses `transform` with a linear
  transition for continuously updating progress; constant-rate motion in this
  project is linear, not eased.
- `src/styles/global.scss:158-164` already stops the skeleton's current
  animation for reduced-motion users. Extend that exact policy to `::after`.

## Steps

1. Replace the current gradient/background-position `shimmer` declaration in
   `src/components/home/ImageGallery.vue` with the target static base and
   `::after` pseudo-element. Rename the keyframe to `gallery-shimmer` to avoid
   a generic global name.
2. Preserve the absolute inset and z-order so the skeleton still covers an
   unloaded thumbnail and disappears when `loadedThumbs` is updated.
3. In `src/styles/global.scss`, add
   `.image-gallery__skeleton::after` to the existing reduced-motion animation
   suppression. Do not disable thumbnail opacity loading or the separate
   spinner rule.

## Boundaries

- Do not change image fetching, `loading="lazy"`, fade-in opacity, gallery
  dimensions, or any image hover transform.
- Do not use `background-position`, `left`, `width`, or a JavaScript timer to
  move the shimmer.
- Do not add `will-change`; the placeholder is short-lived and should not keep
  layers alive after images load.

## Verification

- **Mechanical**: run `npm exec vue-tsc -- --noEmit` and `git diff --check`.
  Run `rg -n "background-position|animation: shimmer" src/components/home/ImageGallery.vue`;
  it must return no results.
- **Feel check**:
  - Disable the browser cache and reload the home page. Unloaded thumbnails
    show a calm, constant-speed highlight with no edge clipping.
  - In the Performance panel, observe a cold load: no animation should update
    `background-position` while skeletons are visible.
  - Emulate reduced motion and verify the static skeleton remains visible but
    its highlight does not travel.
- **Done when**: up to eight concurrent placeholders have the same visual
  intent without paint-driven background-position animation.
