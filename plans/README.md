# Animation optimization plans

Baseline commit: `4a90369` on branch `codex/animations-optimize`.

| # | Plan | Severity | Status | Dependency |
|---:|---|---|---|---|
| 001 | Replace broad transitions with explicit properties | HIGH | DONE | — |
| 002 | Remove the blocking navigation morph | HIGH | DONE | — |
| 003 | Move audio progress visuals with compositor transforms | HIGH | DONE | — |
| 004 | Remove the accidental cover transition delay | HIGH | DONE | — |
| 005 | Complete reduced-motion coverage | MEDIUM | DONE | 001, 006, 007 |
| 006 | Gate transform hover effects to pointer devices | MEDIUM | DONE | 001 |
| 007 | Animate toast stacking with explicit move transitions | MEDIUM | DONE | 001, 005 |
| 008 | Move the floating player with transforms during scroll | MEDIUM | DONE | — |
| 009 | Remove decorative tilt from high-frequency home cards | HIGH | DONE | — |
| 010 | Animate the mobile navigation popover from its trigger | MEDIUM | DONE | — |
| 011 | Give the layout settings modal an enter and exit transition | MEDIUM | DONE | — |
| 012 | Make image lightboxes reversible instead of one-way keyframes | MEDIUM | DONE | — |
| 013 | Move gallery loading shimmer onto the compositor | MEDIUM | DONE | — |
| 014 | Restore selective low-amplitude 3D tilt for showcase cards | MEDIUM | DONE | 009 |

## Recommended execution order

1. 001 — remove the broad transition surface first.
2. 002 — unblock primary navigation.
3. 003 — move the continuously updating audio visuals to transforms.
4. 004 — fix the accidental Now Playing delay.
5. 008 — optimize the persistent player scroll path.
6. 006 — gate touch-sensitive hover transforms.
7. 007 — make toast stacking interruptible.
8. 005 — apply reduced-motion coverage after the final motion selectors are in place.

## Supplemental opportunities (2026-08-24)

The current audit adds five independent follow-up plans. Execute them in this
order after the completed 001–008 set:

1. 009 — remove the highest-frequency decorative motion and its pointer work.
2. 013 — keep eight concurrent loading placeholders compositor-friendly.
3. 010 — add a small, trigger-originated transition to the mobile popover.
4. 011 — add modal entry/exit feedback without delaying the settings action.
5. 012 — make image lightboxes reversible, including their close path.
6. 014 — restore restrained depth only to the greeting, GitHub, and gallery
   showcase cards; it deliberately keeps 009's control-stability gains.

The audit also found two lower-priority polish candidates not turned into plans:
standardise music-control press depth (`scale(0.97)`) and avoid interpolating
glass-card shadows on high-frequency hover. They can be revisited after real
device feel checks of the five plans above.

Plans are intentionally independent at the source level except where noted.
The executor must stop if the cited code has drifted from the baseline instead
of improvising outside the stated scope.

Implemented in commits `410903e` and `ef00fc1`.
