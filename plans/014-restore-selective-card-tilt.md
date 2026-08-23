# 014 — Restore selective low-amplitude 3D tilt for showcase cards

- **Status**: DONE
- **Commit**: 37768c8
- **Baseline commit**: `0ce46c0` on branch `codex/restore-selective-tilt`
- **Severity**: MEDIUM
- **Category**: Purpose & frequency / Performance / Accessibility
- **Estimated scope**: 2 source files; 2 plan files
- **Supersedes**: the all-surface removal portion of 009, by explicit product direction

## Problem

Plan 009 correctly removed the old `TiltEffect` from every high-frequency home
surface: it rotated controls, navigation, the player, status panels, and social
links on every pointer movement. That made frequent interaction more stable,
but it also removed the distinctive depth cue from the three display-oriented
cards where it supports the blog's visual character: the greeting, GitHub, and
gallery cards.

The current home page renders those three cards directly:

```vue
<!-- src/views/HomePage.vue:5-48 — current excerpt -->
<div class="home-page__cell" :style="getWidgetStyle('greeting')">
  <GreetingCard />
</div>

<div class="home-page__cell" :style="getWidgetStyle('github')">
  <GitHubCard />
</div>

<div class="home-page__cell" :style="getWidgetStyle('gallery')">
  <ImageGallery />
</div>
```

The prior implementation used 8 degrees of rotation, 3% scaling, and direct
geometry reads and transform writes for every mousemove. Restoring that shape
unchanged would recreate the performance and interaction problems that 009
removed.

## Target

Add one intentionally limited `HoverTilt` wrapper for showcase cards only.

- Wrap exactly `GreetingCard`, `GitHubCard`, and `ImageGallery` in
  `src/views/HomePage.vue`.
- Use a maximum rotation of **4 degrees** and a maximum scale of **1.015**.
- Activate only for a real mouse on a device matching
  `(hover: hover) and (pointer: fine)` and not matching
  `(prefers-reduced-motion: reduce)`.
- Coalesce pointer samples to one `requestAnimationFrame` transform write per
  frame. Cache element geometry on pointer entry; do not call
  `getBoundingClientRect()` in the move handler.
- Ease reset with `180ms cubic-bezier(0.23, 1, 0.32, 1)`, while live tracking
  may use a short linear transform transition to avoid visible lag.
- Use `will-change: transform` only during active tracking; remove it when the
  pointer leaves or capability gating disables the effect.

`NavMenu`, `MusicPlayer`, `ServiceStatus`, `CronTasks`, the heatmap, social
links, settings button, drag handles, and every other interactive control must
remain unwrapped and spatially stable. `src/App.vue` must continue to render
the music player directly.

## Repo conventions to follow

- `src/components/common/ToastNotification.vue:49-60` uses the project's
  `cubic-bezier(0.23, 1, 0.32, 1)` curve for brief, interruptible UI motion.
- Plan 006 already gates transform hover motion to fine hover pointers; this
  component must uphold the same device boundary in JavaScript and CSS.
- Plan 009 remains valid for high-frequency controls. This plan restores depth
  only where it communicates a display-card affordance rather than a control
  state.

## Steps

1. Create `src/components/common/HoverTilt.vue` with typed `maxTilt` and
   `scale` props defaulting to `4` and `1.015`. It must render a single wrapper
   around its slot and use pointer events rather than mouse-only events.
2. On mount, subscribe to the fine-hover and reduced-motion media queries. On
   a capability change, cancel any pending animation frame, clear the cached
   geometry, reset the inline transform, and mark tracking inactive. Remove
   listeners and cancel a pending frame on unmount.
3. On mouse `pointerenter`, cache the wrapper rect and begin tracking. On
   `pointermove`, retain only the latest coordinates and schedule a single
   animation-frame callback. In that callback, calculate pointer-relative
   `rotateX`, `rotateY`, and `scale3d` values and write the transform. Ignore
   non-mouse pointers.
4. On `pointerleave` and `pointercancel`, cancel any queued frame, clear the
   cache and tracking state, and reset the transform. Keep reset motion in CSS;
   do not add timers or a physics dependency.
5. Import `HoverTilt` in `src/views/HomePage.vue` and wrap only the greeting,
   GitHub, and gallery component tags. Preserve each existing
   `.home-page__cell`, widget style, drag behaviour, gallery overlay, and
   music-player anchor unchanged.
6. Update this plan to `DONE`, record the implementation commit, and add plan
   014 to `plans/README.md` once the implementation has passed verification.

## Boundaries

- Do not modify `src/App.vue`, widget coordinates, canvas scaling, drag mode,
  player positioning, or the `GradientWaves` backdrop.
- Do not revive the deleted `TiltEffect` component or its 8 degree / 3% values.
- Do not wrap navigation, the music player, task/status cards, social links,
  heatmap, settings, or any other button/control.
- Do not add a dependency, global pointer listener, or permanently promoted
  compositor layer.
- Do not use tilt as a focus, active, loading, route, modal, or lightbox state
  indicator.

## Verification

- **Mechanical**:
  - Run `rg -n "HoverTilt" src`; expect references only in
    `HomePage.vue` and the new `HoverTilt.vue`.
  - Confirm `HomePage.vue` contains exactly three `<HoverTilt>` wrappers and
    `App.vue` contains none.
  - Run `npm exec vue-tsc -- --noEmit` successfully.
  - Run `git diff --check` with no output.
- **Feel check**:
  - On a desktop mouse, the greeting, GitHub, and gallery cards should respond
    smoothly but subtly, never exceeding 4 degrees or 1.5% scale.
  - Sweep rapidly across those cards; motion must follow without stale jumps or
    accumulating lag, then settle cleanly when leaving.
  - Verify navigation, music controls, task/status panels, social controls,
    drag controls, and settings do not rotate or scale.
  - With reduced motion or a coarse/no-hover pointer, all three cards remain
    static while their normal click/tap behaviour works.
- **Done when**: three showcase cards regain restrained depth on fine-pointer
  desktops, and every high-frequency control remains stable and accessible.
