# 003 — Move audio progress visuals with compositor transforms
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 Vue components and 1 shared composable surface

## Problem

The audio singleton updates `currentTime` from the browser's `timeupdate`
event, which drives progress styles repeatedly:

```ts
/* src/composables/useMusicPlayer.ts:65-67 — current */
audio.addEventListener('timeupdate', () => {
  if (audio) currentTime.value = audio.currentTime
})
```

```vue
<!-- src/components/home/MusicPlayer.vue:123-126 — current -->
<div class="music-player__progress-track">
  <div class="music-player__progress-fill" :style="{ width: progressPercent + '%' }" />
  <div class="music-player__progress-thumb" :style="{ left: progressPercent + '%' }" />
</div>
```

```css
/* src/components/home/MusicPlayer.vue:512-516 — current */
&__progress-fill {
  height: 100%;
  background: $accent-gradient;
  border-radius: 2px;
  transition: width 0.2s linear;
  position: relative;
}
```

The full Now Playing page has the same layout property:
`src/views/NowPlaying.vue:42` binds `width`, and
`src/views/NowPlaying.vue:358-363` transitions it.

## Target

The progress fill must be a full-width visual layer moved by compositor
transform, with the transform origin at the left edge:

```vue
<div
  class="music-player__progress-fill"
  :style="{ transform: `scaleX(${progressPercent / 100})` }"
/>
```

```scss
.music-player__progress-fill {
  width: 100%;
  transform-origin: left center;
  transition: transform 0.2s linear;
}
```

For the MusicPlayer thumb, add a full-track positioning layer whose own width
is the track width and move that layer with
`transform: translateX(<progressPercent>%)`; keep the thumb's existing
`translate(-50%, -50%)` centering transform on the thumb itself. Do not
transition `left` or `width`. During seeking, disable the fill transform
transition exactly as the current `&__progress--seeking &__progress-fill`
rule disables the width transition.

Apply the same `scaleX(progressPercent / 100)` and
`transform-origin: left center` change to
`src/views/NowPlaying.vue:42` and `:358-363`. Keep the slider's accessible
semantics and click/keyboard seeking behavior unchanged.

Also convert the low-frequency volume fill at
`src/components/home/MusicPlayer.vue:107` and `:468-472` from width to
`transform: scaleX(volumePercent / 100)` so no progress-related fill uses a
layout transition.

## Repo conventions to follow

- `src/components/home/MusicPlayer.vue:520-530` already uses transform for
  thumb centering; preserve that transform and compose with it rather than
  replacing it.
- `src/views/NowPlaying.vue:447-458` intentionally uses transform for lyric
  emphasis; follow the same transform-first convention.

## Steps

1. Update the MusicPlayer progress markup/styles to make the fill full-width,
   scale it from the left, and position the thumb with a transform layer.
2. Update the MusicPlayer volume fill to use a full-width scale transform.
3. Update the Now Playing fill binding and CSS to use scaleX.
4. Remove width/left transitions from these progress visuals and preserve the
   seeking override.

## Boundaries

- Do not change `progressPercent`, audio event handling, seek math, ARIA values,
  keyboard behavior, or the visual colors.
- Do not use a CSS variable on a parent to drive a child transform; set the
  transform on the element being moved.

## Verification

- **Mechanical**: `rg -n "progress-(fill|thumb).*width|transition: width|:style=\"\\{ left" src/components/home/MusicPlayer.vue src/views/NowPlaying.vue` finds no progress width/left transition; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: play audio on both player surfaces, scrub by pointer and
  keyboard, and confirm the fill stays visually attached to the left edge with
  no layout jitter. In DevTools Performance, confirm the progress update does
  not repeatedly trigger layout for the fill.
- **Done when**: progress and volume visuals update through transforms and
  seeking remains responsive.
