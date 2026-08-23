# 001 — Replace broad transitions with explicit properties
- **Status**: DONE
- **Commit**: 4a90369
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 15 Vue/SCSS files, mechanical style-only change

## Problem

The project has repeated `transition: all` declarations on high-frequency cards,
buttons, tags, and navigation items. This lets unrelated properties such as
padding, layout, backdrop, and other future style changes animate accidentally.
The shared button mixin is the highest-leverage case:

```scss
/* src/styles/glassmorphism.scss:32-51 — current */
@mixin glass-button {
  @include glass;
  border-radius: $radius-md;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  color: $text-primary;
  font-size: $font-size-sm;
  transition: all $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: transparent;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      inset 0 0 10px 3px rgba(255, 255, 255, 0.15),
      $glass-shadow;
  }

  &:active {
    transform: scale(0.97);
  }
}
```

The same broad declaration appears at these exact locations and must be
replaced as part of this plan: `src/views/HomePage.vue:283,343`,
`src/views/News.vue:181`, `src/views/Projects.vue:161`,
`src/views/ProjectPost.vue:463`, `src/views/Favorites.vue:566`,
`src/components/layout/AppLayout.vue:272`,
`src/components/home/LayoutSettings.vue:277`,
`src/components/home/MusicPlayer.vue:284,319,407`,
`src/components/home/NavMenu.vue:169`,
`src/components/home/GitHubCard.vue:27`,
`src/components/home/EmailWidget.vue:60`,
`src/components/home/WeChatWidget.vue:58`, and
`src/components/home/BilibiliWidget.vue:30`.

## Target

Remove every `transition: all` under `src/`. Preserve the current visual
behavior by listing only properties that the same selector actually changes.
Use the existing `$transition-fast` (`0.15s ease`) or `$transition-base`
(`0.3s ease`) tokens; do not introduce new durations in this plan.

Use these exact property mappings:

- `glass-button`: `background, color, box-shadow, transform`.
- Home settings and drag buttons: the currently changed `background`,
  `box-shadow`, `color`, `opacity`, and/or `transform` properties only.
- Projects/News tags and the mobile dropdown item: `background, color,
  border-color` only.
- Project back button: `background, color, border-color, transform`.
- Favorites pager: `background, color, opacity, transform`.
- Music mini button: `opacity, transform`; full player: `background,
  box-shadow`; action buttons: `background, color, transform`.
- Nav expanded item: `background, color, box-shadow`; remove the hover
  `backdrop-filter` change from the transition list.
- GitHub, Email, WeChat, and Bilibili widgets: `color, opacity` only.

For example, the shared mixin must become:

```scss
transition: background $transition-fast,
            color $transition-fast,
            box-shadow $transition-fast,
            transform $transition-fast;
```

## Repo conventions to follow

- Motion tokens remain in `src/styles/variables.scss` at lines 76-79.
- `src/styles/glassmorphism.scss:20` already uses an explicit property list;
  match that style rather than adding a second motion system.

## Steps

1. Replace the shared `glass-button` declaration in
   `src/styles/glassmorphism.scss` using the exact mapping above.
2. Replace every listed component-level `transition: all` declaration with
   the smallest explicit property list matching its adjacent hover/active
   rules. Do not change colors, shadows, transforms, or markup.
3. Run `rg -n "transition:\\s*all" src` and require zero matches.

## Boundaries

- Do not touch existing explicit transitions that already name properties.
- Do not change the visual values of hover or active states.
- Do not change component markup, dependencies, or motion timing tokens.

## Verification

- **Mechanical**: `rg -n "transition:\\s*all" src` returns no matches; `npm exec vue-tsc -- --noEmit` exits 0.
- **Feel check**: hover the home widgets, navigation items, tag filters,
  player controls, and pager buttons. Confirm color/background/shadow changes
  still transition while layout changes do not animate unexpectedly.
- **Done when**: no `transition: all` remains and all listed interactions keep
  their intended visual feedback.
