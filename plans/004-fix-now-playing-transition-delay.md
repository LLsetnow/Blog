# 004 — Remove the accidental cover transition delay
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 style declaration

## Problem

The Now Playing cover currently nests a duration token after another duration:

```scss
/* src/views/NowPlaying.vue:278-296 — current */
&__cover {
  aspect-ratio: 1;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(45, 45, 58, 0.28);
  transition: transform 0.6s $transition-base, box-shadow 0.6s ease;
}
```

`$transition-base` is `0.3s ease` in
`src/styles/variables.scss:78`, so the first transition expands to
`transform 0.6s 0.3s ease`: a 600ms duration plus an unintended 300ms delay.
Play/pause state therefore waits before the cover reacts.

## Target

Use the repository's base transition token once for both properties:

```scss
transition: transform $transition-base, box-shadow $transition-base;
```

This produces a 300ms transition with no delay and the existing token's
`ease` curve. Keep the idle scale (`scale(0.94)`) and both shadow values intact.

## Repo conventions to follow

- Shared timings live in `src/styles/variables.scss:76-79`.
- `src/views/NowPlaying.vue:362` already uses a separate property plus a token;
  do not concatenate a raw duration with a token that already contains one.

## Steps

1. Replace only the `&__cover` transition declaration with the exact target.
2. Do not modify the cover class binding or idle transform.

## Boundaries

- Do not change the music state logic, artwork, shadow values, or layout.
- Do not change `$transition-base` globally.

## Verification

- **Mechanical**: `rg -n "0\\.6s \\$transition-base|0\\.3s ease.*transition" src/views/NowPlaying.vue` returns no accidental nested token; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: toggle play/pause while watching the cover. It should begin
  responding immediately, settle within 300ms, and still retain the deliberate
  idle shrink.
- **Done when**: computed transition has no 300ms delay.
