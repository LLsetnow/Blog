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

## Recommended execution order

1. 001 — remove the broad transition surface first.
2. 002 — unblock primary navigation.
3. 003 — move the continuously updating audio visuals to transforms.
4. 004 — fix the accidental Now Playing delay.
5. 008 — optimize the persistent player scroll path.
6. 006 — gate touch-sensitive hover transforms.
7. 007 — make toast stacking interruptible.
8. 005 — apply reduced-motion coverage after the final motion selectors are in place.

Plans are intentionally independent at the source level except where noted.
The executor must stop if the cited code has drifted from the baseline instead
of improvising outside the stated scope.

Implemented in commits `410903e` and `ef00fc1`.
