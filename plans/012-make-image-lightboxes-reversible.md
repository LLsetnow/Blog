# 012 — Make image lightboxes reversible instead of one-way keyframes
- **Status**: DONE
- **Commit**: 3887f53
- **Severity**: MEDIUM
- **Category**: Interruptibility / Missed opportunities
- **Estimated scope**: 3 Vue or SCSS files

## Problem

Both image lightboxes insert an overlay with `v-if`; the gallery preview exits
immediately, while the project-post lightbox only has keyframe entrances.
Neither can reverse cleanly when a user opens and closes it quickly.

```vue
<!-- src/components/home/ImageGallery.vue:26-48 — current excerpt -->
<Teleport to="body">
  <div v-if="previewIndex !== null" class="image-gallery__preview" @click="closePreview">
    <div v-if="previewLoading" class="image-gallery__spinner" />
    <div ref="previewRef" class="image-gallery__preview-image" @click.stop>
      <img :src="images[previewIndex].full" @load="onPreviewLoaded" />
    </div>
  </div>
</Teleport>
```

```vue
<!-- src/views/ProjectPost.vue:82-102 — current excerpt -->
<Teleport to="body">
  <div v-if="lightboxSrc" class="project-post__lightbox" @click="closeLightbox">
    <img
      :src="lightboxSrc"
      class="project-post__lightbox-img"
      :style="{ transform: `scale(${lightboxScale})` }"
      @click.stop
    />
  </div>
</Teleport>
```

```scss
/* src/views/ProjectPost.vue:631-672 — current excerpt */
&__lightbox { animation: pj-lb-fadein 0.2s ease; }
&__lightbox-img { animation: pj-lb-zoomin 0.25s ease; }
@keyframes pj-lb-zoomin {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
```

## Target

Use Vue transition classes so overlays can reverse from their current state.
The overlay fades; a new wrapper, not the zoomable image itself, scales from
0.97 to 1. This avoids conflict with the project image's existing inline
`transform: scale(${lightboxScale})` wheel zoom.

Use these exact values for both lightboxes:

```scss
/* target transition values */
.lightbox-enter-active { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1); }
.lightbox-leave-active { transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1); }
.lightbox-enter-active .lightbox-frame,
.lightbox-leave-active .lightbox-frame {
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center;
}
.lightbox-enter-from,
.lightbox-leave-to { opacity: 0; }
.lightbox-enter-from .lightbox-frame { opacity: 0; transform: scale(0.97); }
.lightbox-leave-to .lightbox-frame { opacity: 0; transform: scale(0.98); }
```

Implement the class names as `gallery-preview-*` plus
`.image-gallery__preview-frame`, and `project-lightbox-*` plus
`.project-post__lightbox-frame`; do not use the generic selectors literally.

For `ProjectPost`, introduce a separate `lightboxOpen` ref. On image click:
set `lightboxSrc`, `lightboxAlt`, and `lightboxScale = 1`, then set
`lightboxOpen = true`. `closeLightbox()` must set only `lightboxOpen = false`.
An `@after-leave` handler clears `lightboxSrc` and `lightboxAlt` and resets the
scale. This keeps the current zoom visible during the leave transition.

Under reduced motion, both overlays use only `opacity 120ms ease`; each new
frame's transform is `none`.

## Repo conventions to follow

- `src/components/common/ToastNotification.vue:49-70` is the established Vue
  transition-class pattern and uses the same deliberate strong ease-out curve.
- `src/styles/global.scss:141-188` already disables the existing gallery and
  project-post lightbox animation for reduced-motion users. Extend that block
  for the two new frame elements; do not remove the existing image safeguards.

## Steps

1. In `src/components/home/ImageGallery.vue`, put the existing preview overlay
   inside `<Transition name="gallery-preview">` within the `Teleport`. Keep
   its `v-if="previewIndex !== null"`. Insert
   `.image-gallery__preview-frame` around `.image-gallery__preview-image`; keep
   `previewRef`, image loading state, click stop, and mouse tilt on the inner
   preview-image unchanged.
2. Add `gallery-preview-*` opacity/frame transform transition classes. Do not
   animate the existing `backdrop-filter`, and do not set persistent
   `will-change` on the frame.
3. In `src/views/ProjectPost.vue`, add `lightboxOpen` and an
   `afterLightboxLeave()` cleanup handler. Replace the overlay condition with
   `v-if="lightboxOpen"`, wrap it in `<Transition name="project-lightbox"
   @after-leave="afterLightboxLeave">`, and add a
   `.project-post__lightbox-frame` around the existing zoomable image.
4. Remove `pj-lb-fadein` / `pj-lb-zoomin` and their `animation` declarations.
   Add the matching `project-lightbox-*` transition classes; retain the image's
   inline wheel-zoom transform exactly as it is.
5. In `src/styles/global.scss`, include both frame selectors in the existing
   reduced-motion transform override. Add opacity-only 120ms transition rules
   for both transition-name class pairs and force their enter/leave frame
   transforms to `none`.

## Boundaries

- Do not change image source selection, preload behavior, loading spinner,
  gallery preview tilt angles, wheel zoom bounds, or Escape/click-to-close
  semantics.
- Do not introduce keyframes, animation libraries, blur animation, or a
  `scale(0)` state.
- Do not animate the project image element directly; its transform belongs to
  wheel zoom and must remain independent of entry/exit motion.

## Verification

- **Mechanical**: run `npm exec vue-tsc -- --noEmit`, `git diff --check`, and
  `rg -n "pj-lb-fadein|pj-lb-zoomin" src`; the last command must return no
  results.
- **Feel check**:
  - Open and close a gallery image repeatedly. The dimmer and image frame
    should reverse smoothly instead of snapping; the inner pointer tilt must
    still work only after load.
  - Open a project-post image, wheel-zoom it, then close it. The leave should
    preserve the current zoom while fading, and the next open should reset to
    scale 1.
  - Emulate reduced motion; both paths retain a short fade but have no scale or
    travel.
- **Done when**: all four open/close paths (gallery/project × open/close) are
  transition-driven and no inline zoom transform is overwritten.
