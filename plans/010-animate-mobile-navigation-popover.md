# 010 — Animate the mobile navigation popover from its trigger
- **Status**: TODO
- **Commit**: 3887f53
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Physicality & origin
- **Estimated scope**: 1 Vue component

## Problem

The compact navigation button changes `menuOpen`, but the menu uses `v-show`
and has no transition. The trigger and anchored dropdown simply appear or
disappear, despite being an occasional spatially connected interaction.

```vue
<!-- src/components/layout/AppLayout.vue:20-40 — current excerpt -->
<button
  class="app-layout__nav-pill"
  :class="{ 'app-layout__nav-pill--open': menuOpen }"
  @click.stop="menuOpen = !menuOpen"
>
  <!-- avatar and icon -->
</button>
<nav v-show="menuOpen" class="app-layout__nav-dropdown">
  <router-link to="/" class="app-layout__nav-dropdown-item">首页</router-link>
  <!-- remaining routes -->
</nav>
```

```scss
/* src/components/layout/AppLayout.vue:246-261 — current excerpt */
&__nav-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  // …glass surface styles…
}
```

## Target

The menu enters from the top-right pill it belongs to, without delaying a
route click. It fades and travels only 8px, with no bounce or scale-from-zero.

```vue
<!-- target structure -->
<Transition name="mobile-nav">
  <nav v-if="menuOpen" class="app-layout__nav-dropdown">
    <!-- keep every existing router-link unchanged -->
  </nav>
</Transition>
```

```scss
/* target transition values */
.app-layout__nav-dropdown { transform-origin: top right; }

.mobile-nav-enter-active {
  transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.mobile-nav-leave-active {
  transition: opacity 140ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-enter-active,
  .mobile-nav-leave-active { transition: opacity 120ms ease; }
  .mobile-nav-enter-from,
  .mobile-nav-leave-to { transform: none; }
}
```

## Repo conventions to follow

- `src/components/common/ToastNotification.vue:49-70` already uses Vue
  transition classes with the exact `cubic-bezier(0.23, 1, 0.32, 1)` entrance
  curve; use that established deliberate curve rather than adding a dependency.
- The desktop and mobile menus both close on route change in
  `src/components/layout/AppLayout.vue:72-74`; preserve that behaviour.

## Steps

1. In `src/components/layout/AppLayout.vue`, wrap the existing mobile `<nav>`
   in `<Transition name="mobile-nav">` and change only its visibility
   directive from `v-show` to `v-if="menuOpen"`. Do not change any link paths,
   labels, active classes, or the button click handler.
2. Add `transform-origin: top right` to `&__nav-dropdown`.
3. Add the exact enter/leave classes and reduced-motion override above in the
   same scoped style block. Keep all values explicitly property-scoped;
   never use `transition: all`.

## Boundaries

- Do not change desktop navigation, header layout, route timing, or the
  `menuOpen` watch.
- Do not animate route navigation itself; a selected link must still navigate
  immediately while the outgoing menu is allowed to leave.
- Do not add focus trapping or a dialog role in this motion-only plan.

## Verification

- **Mechanical**: run `npm exec vue-tsc -- --noEmit` and `git diff --check`.
- **Feel check**:
  - At a viewport below 768px, open and close the pill repeatedly. The menu
    must retarget smoothly without a jump and appear to grow from its trigger.
  - Click a menu route while it is open. The URL must change immediately; the
    menu close must not block it.
  - Emulate `prefers-reduced-motion: reduce`; only opacity changes and there is
    no travel or scale.
- **Done when**: the mobile menu has a concise, trigger-originated transition
  and route selection remains immediate.
