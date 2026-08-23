# 006 — Gate transform hover effects to pointer devices
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: MEDIUM
- **Category**: Accessibility / Purpose & frequency
- **Estimated scope**: 5 Vue stylesheets

## Problem

Several transform hover effects are unconditional. Touch browsers can emulate
hover during a tap, producing sticky or unnecessary motion:

```scss
/* src/components/home/ImageGallery.vue:175-184 — current */
img {
  transition: transform 0.3s ease;
}

&:hover img {
  transform: scale(1.1);
}
```

```scss
/* src/views/Favorites.vue:447-458 — current */
transition: transform 0.2s ease, box-shadow 0.2s ease;

&:hover {
  transform: translateY(-4px);
}
```

The same issue exists for Now Playing control scale at
`src/views/NowPlaying.vue:385-391`, the mini player button at
`src/components/home/MusicPlayer.vue:284-293`, the home settings gear at
`src/views/HomePage.vue:283-292`, and the Layout Settings action buttons at
`src/components/home/LayoutSettings.vue:277-297`.

## Target

Wrap only transform-based hover rules in:

```scss
@media (hover: hover) and (pointer: fine) {
  &:hover {
    transform: ...;
  }
}
```

Keep the existing transitions and active/pressed feedback outside the media
query. Specifically gate ImageGallery image scale, Favorites card lift, Now
Playing button scale, mini player button scale, home settings rotation, and the
two Layout Settings button lifts. Color/background/opacity hover feedback may
remain available to touch devices.

## Repo conventions to follow

- `src/styles/global.scss:121-126` already contains a mobile pointer-related
  media block; add local hover media blocks beside the affected selectors.
- Press feedback such as `src/styles/glassmorphism.scss:50-52` remains available
  because it is `:active`, not hover.

## Steps

1. Wrap each listed transform hover declaration in the exact hover/pointer media
   query.
2. Leave `:active` transforms and normal layout transforms untouched.
3. Confirm no listed selector can apply transform from `:hover` outside the
   pointer media query.

## Boundaries

- Do not remove hover color/opacity feedback.
- Do not change transform scale/rotation values or durations.
- Do not add JavaScript pointer detection.

## Verification

- **Mechanical**: `npm exec vue-tsc -- --noEmit` exits 0; inspect the five
  stylesheets to confirm each transform hover is inside the media query.
- **Feel check**: test with a mouse and a touch/emulated touch device. Mouse
  hover keeps the lift/scale/rotation; touch taps do not leave a transformed
  card or button behind.
- **Done when**: transform hover motion is limited to fine hover pointers.
