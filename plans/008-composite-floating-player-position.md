# 008 — Move the floating player with transforms during scroll
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 Vue component

## Problem

The persistent player follows the home grid by writing four layout properties
from a scroll handler:

```ts
/* src/App.vue:89-101 and 213-220 — current */
function syncToGrid() {
  const anchor = document.querySelector<HTMLElement>('[data-widget="music"]')
  if (!anchor) return false
  const r = anchor.getBoundingClientRect()
  isMini.value = false
  applyStyle({
    position: 'fixed',
    left: r.left + 'px',
    top: r.top + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    zIndex: '260',
  })
  return true
}

function onScroll() {
  if (route.path !== '/') return
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    syncToGrid()
  })
}
```

```scss
/* src/App.vue:232-235 — current */
.player-wrapper {
  position: fixed;
  z-index: 260;
  will-change: left, top, width, height;
}
```

The scroll path only needs to update viewport position, but it currently writes
`left` and `top` (and rewrites size) on every captured scroll frame. `will-change`
on layout properties does not make those writes compositor-only.

## Target

Keep the wrapper fixed at `left: 0; top: 0` and move it with a direct transform:

```scss
.player-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 260;
  will-change: transform;
}
```

`syncToGrid` and `syncToCorner` must set
`transform: translate3d(<left>px, <top>px, 0)` directly on the wrapper. Width
and height may still be updated when the anchor or viewport actually changes,
but the scroll handler must update only the transform after the initial size is
known. Do not add a transition to the wrapper: scroll-following motion must not
lag behind the scroll gesture.

The corner target in `syncToCorner` remains
`window.innerWidth - 160 - 24` by `window.innerHeight - 56 - 24`; only its
positioning mechanism changes.

## Repo conventions to follow

- `src/composables/useLayoutEditor.ts:155-162` already uses direct DOM
  transforms for pointer-driven movement; follow that direct-transform style.
- Keep the existing `requestAnimationFrame` coalescing in `onScroll`.

## Steps

1. Refactor `applyStyle` calls so the wrapper has a stable zero origin and a
   `translate3d` transform for both grid and corner positions.
2. Change `.player-wrapper` to `left: 0`, `top: 0`, and `will-change: transform`.
3. Ensure scroll updates do not rewrite width/height unless a resize or fresh
   route target requires it.
4. Preserve route, resize, MutationObserver, and player visibility behavior.

## Boundaries

- Do not change player dimensions, mini/full mode, z-index, route logic, or
  anchor observation behavior.
- Do not add CSS transitions to the scroll-following wrapper.
- Do not remove the existing RAF coalescing.

## Verification

- **Mechanical**: `rg -n "will-change: left|will-change:.*width|left: r\\.left|top: r\\.top" src/App.vue` returns no layout-property will-change or scroll-position writes; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: scroll the home page while audio plays and resize the window.
  The player must stay locked to its anchor with no lag or accumulated offset;
  navigate away and confirm the corner mini player still lands at the same
  24px margins.
- **Done when**: scroll-following position uses transform and geometry remains
  unchanged.
