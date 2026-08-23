# 002 — Remove the blocking navigation morph
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: HIGH
- **Category**: Purpose & frequency / Interruptibility
- **Estimated scope**: 1 Vue component

## Problem

The main home navigation turns a route click into a 500ms FLIP animation and
does not navigate until `transitionend` fires:

```ts
/* src/components/home/NavMenu.vue:93-145 — current */
async function onNavClick(path: string) {
  if (!expanded.value || transitioning.value) return
  const el = expandedRef.value
  if (!el) return
  pendingPath.value = path
  const first = el.getBoundingClientRect()
  expanded.value = false
  transitioning.value = true
  await nextTick()
  const newEl = collapsedRef.value
  if (!newEl) return
  const last = newEl.getBoundingClientRect()
  const dx = first.left - last.left
  const dy = first.top - last.top
  const scaleX = first.width / last.width
  const scaleY = first.height / last.height
  animStyle.value = {
    transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
    transition: 'none',
    transformOrigin: 'top left',
  }
  newEl.getBoundingClientRect()
  animStyle.value = {
    transform: 'translate(0, 0) scale(1, 1)',
    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transformOrigin: 'top left',
  }
}

function onTransitionEnd(): void {
  transitioning.value = false
  animStyle.value = {}
  emit('collapse')
  if (pendingPath.value) {
    router.push(pendingPath.value)
    pendingPath.value = null
  }
}
```

This is a primary navigation interaction, so the decorative morph is more
costly than useful: it delays feedback, blocks repeated clicks, and uses a
visible overshoot curve.

## Target

Selecting a navigation item must call `router.push(path)` immediately and must
not depend on `transitionend`, `nextTick`, a pending path, or a 500ms animation.
The route transition in `src/styles/global.scss:103-119` remains the only page
transition.

Use this handler shape:

```ts
function onNavClick(path: string): void {
  void router.push(path)
}
```

Remove the animation-only FLIP state (`expandedRef`, `collapsedRef`,
`animStyle`, `transitioning`, `pendingPath`), the `nextTick` import, the
`@transitionend` listener, and the collapsed Teleport markup if it is no longer
reachable. Keep the expanded navigation links and their route targets intact.
If the component retains a collapse event for another caller, emit it only from
an explicit non-navigation collapse action; route selection must not wait on it.

## Repo conventions to follow

- `src/router/index.ts:74-95` already handles route scroll timing separately;
  do not add a second navigation delay here.
- The existing page transition is asymmetric and bounded at 260ms enter / 160ms
  leave; do not recreate the removed 500ms morph elsewhere.

## Steps

1. Simplify `onNavClick` to the exact immediate `router.push` handler.
2. Remove only state, refs, imports, template listeners, and inline styles that
   existed solely for the collapsed FLIP morph.
3. Keep the expanded menu styling, link labels, icons, and routing unchanged.

## Boundaries

- Do not change the global page transition.
- Do not change route definitions or scroll behavior.
- Do not add a replacement delay or bounce animation.

## Verification

- **Mechanical**: `rg -n "pendingPath|transitioning|transitionend|cubic-bezier\\(0\\.34" src/components/home/NavMenu.vue` returns no matches; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: click each home navigation item repeatedly. The route should
  begin immediately, the click should never be blocked by a visual morph, and
  browser back/forward should still work.
- **Done when**: no route click waits for a transition event and the page
  transition remains the only navigation animation.
