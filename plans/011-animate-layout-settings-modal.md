# 011 — Give the layout settings modal an enter and exit transition
- **Status**: TODO
- **Commit**: 3887f53
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Purpose
- **Estimated scope**: 2 Vue components

## Problem

The settings trigger conditionally mounts a Teleported panel. Both its dimmer
and centred surface arrive and disappear in a single frame, so the user gets no
visual explanation that an editing layer has opened above the home canvas.

```vue
<!-- src/views/HomePage.vue:105-112 — current -->
<LayoutSettings
  v-if="isSettingsOpen"
  :widgets="layouts"
  @close="closeSettings"
  @drag="enterDragMode"
  @update-size="updateSize"
/>
```

```vue
<!-- src/components/home/LayoutSettings.vue:1-5 — current -->
<Teleport to="body">
  <div class="layout-settings-overlay" @click.self="$emit('close')">
    <div class="layout-settings glass-card">
      <!-- settings content -->
    </div>
  </div>
</Teleport>
```

## Target

Keep the component mounted so an inner Vue `Transition` controls both entering
and leaving. The overlay fades; the centred panel fades and scales from 0.97 to
1. Modal transform origin remains `center` because it is a centred modal, not a
trigger-anchored popover.

```vue
<!-- src/views/HomePage.vue target -->
<LayoutSettings
  :open="isSettingsOpen"
  :widgets="layouts"
  @close="closeSettings"
  @drag="enterDragMode"
  @update-size="updateSize"
/>
```

```vue
<!-- src/components/home/LayoutSettings.vue target structure -->
<Teleport to="body">
  <Transition name="layout-settings">
    <div v-if="open" class="layout-settings-overlay" @click.self="$emit('close')">
      <div class="layout-settings glass-card">
        <!-- preserve all existing content -->
      </div>
    </div>
  </Transition>
</Teleport>
```

```scss
/* target values */
.layout-settings-enter-active { transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1); }
.layout-settings-leave-active { transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1); }
.layout-settings-enter-active .layout-settings,
.layout-settings-leave-active .layout-settings {
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center;
}
.layout-settings-enter-from,
.layout-settings-leave-to { opacity: 0; }
.layout-settings-enter-from .layout-settings { opacity: 0; transform: scale(0.97); }
.layout-settings-leave-to .layout-settings { opacity: 0; transform: scale(0.98); }
```

Under `prefers-reduced-motion: reduce`, keep an opacity-only 120ms fade and
force the panel transform to `none`.

## Repo conventions to follow

- `src/components/common/ToastNotification.vue:49-70` supplies the existing
  explicit enter/leave pattern and `cubic-bezier(0.23, 1, 0.32, 1)` curve.
- `src/styles/global.scss:141-188` preserves opacity feedback for reduced
  motion while removing position changes; use the same policy locally here.

## Steps

1. In `src/views/HomePage.vue`, remove only `v-if="isSettingsOpen"` and pass
   a boolean `:open="isSettingsOpen"` prop to `LayoutSettings`.
2. In `src/components/home/LayoutSettings.vue`, add `open: boolean` to
   `LayoutSettingsProps`.
3. Wrap the current overlay in `<Transition name="layout-settings">` inside
   the existing `Teleport` and put `v-if="open"` on the overlay. Preserve all
   click handlers, controls, emits, and Teleport target.
4. Add the exact class rules above to the scoped style. Add a local
   `prefers-reduced-motion` rule: enter/leave transition is `opacity 120ms
   ease`; both panel transforms are `none`.

## Boundaries

- Do not change widget resizing, drag mode, clipboard export, or the modal's
  visual dimensions.
- Do not change the existing open/close event contract beyond adding `open`.
- Do not delay opening on button click or add a keyframe animation.

## Verification

- **Mechanical**: run `npm exec vue-tsc -- --noEmit` and `git diff --check`.
- **Feel check**:
  - Open from the gear button. The overlay should fade in and the centred panel
    should settle from a subtle 0.97 scale within 220ms.
  - Close via backdrop and close button. The current panel should fade out
    cleanly; repeated open/close actions must not flash stale content.
  - With reduced motion enabled, verify no scale or positional movement occurs,
    but the opacity feedback remains.
- **Done when**: settings state is no longer a hard visual cut and no editing
  action or close path is delayed.
