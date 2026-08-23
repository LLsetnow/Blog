# 007 — Animate toast stacking with explicit move transitions
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 Vue component

## Problem

Toasts are rendered through `TransitionGroup`, but only enter and leave classes
exist:

```vue
<!-- src/components/common/ToastNotification.vue:3-12 — current -->
<TransitionGroup name="toast">
  <div v-for="t in toasts" :key="t.id" class="toast-container__item">
    {{ t.text }}
  </div>
</TransitionGroup>
```

```scss
/* src/components/common/ToastNotification.vue:49-65 — current */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}
```

`useToast.ts:14-17` adds and removes messages independently, so when one toast
expires the remaining stack repositions. Without `.toast-move`, that movement
snaps. `transition: all` also permits unintended properties to animate.

## Target

Replace the broad transitions with these exact classes:

```scss
.toast-enter-active {
  transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.toast-leave-active {
  transition: opacity 140ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.toast-move {
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}
```

Keep the current enter/leave transforms (`translateY(12px)` and
`translateY(-8px)`) and opacity values. Do not use keyframes; transitions can
retarget when multiple toasts are added or removed quickly.

## Repo conventions to follow

- The project uses Vue `TransitionGroup` here and Vue `Transition` in
  `src/App.vue:33-37`; keep the existing class-name convention.
- The strong ease-out curve is the one defined in the animation audit playbook:
  `cubic-bezier(0.23, 1, 0.32, 1)`.

## Steps

1. Replace `.toast-enter-active` and `.toast-leave-active` with the exact
   property-specific declarations.
2. Add `.toast-move` with the exact transform transition.
3. Leave toast order, duration, markup, and container positioning unchanged.

## Boundaries

- Do not change `useToast.ts` or toast lifetime values.
- Do not animate `height`, `margin`, `padding`, or `backdrop-filter`.
- Do not add a JavaScript animation loop.

## Verification

- **Mechanical**: `rg -n "toast-move|toast.*transition: all" src/components/common/ToastNotification.vue` shows the move class and no broad transition; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: trigger two or more toasts quickly, then let the first expire.
  New toasts should enter fast, remaining toasts should glide into place, and
  rapid add/remove operations must not restart the entire stack from zero.
- **Done when**: entry, exit, and stack repositioning are all interruptible.
