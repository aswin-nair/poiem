# Poiem · Playful Neo Brutalist UI

October 7, 2026 · `poiem-motion-return`

This document and its gallery preserve the `8e7e968a` Neo Brutalist snapshot and that snapshot's validation results. See the [latest animation update](../screen-play/gallery.html) for the new freestanding Momo scenes and action feedback, with current results in its update notes.

## What changed

- Brighter yellow, peach, pink, sky and mint panels in both themes, thicker ink outlines and hard offset shadows on primary actions and feature panels.
- Today has framed Momo and day-ring panels, coloured macro tiles, bold meal headers and a sky Water card. Small-screen values can wrap without splitting their units.
- Logging, Saved, Insights, You and Coach share poster headings and stronger controls. Repeat Log buttons now show their full 44px face instead of the older invisible-border treatment.
- Momo occasionally appears with one of 20 local jokes and the visitor's outfit. Got it dismisses; Mute Momo saves the existing preference. Lively allows four visits per session, Calm two. Reduced motion stays static. Forms, keyboards, dialogs, receipts, Undo, hidden tabs and focused workflows defer or dismiss cameos.
- Cameo code loads during its waiting period, after the daily screen opens. Jokes make no provider request and add no sound or haptics.

## Screenshots

Open the [before-and-after gallery](gallery.html). It contains 54 comparisons against `c9705494` and four new Momo cameo views. Today and the shared components cover 320/390/768/1440px; log sheet adds 320px; Today and log sheet include 844×390 landscape. The other changed screens and cameos cover 390/1440px in both themes.

The preserved `before/canonical` images are the previous committed baselines. The `after` images are the reviewed Linux Chromium baselines. The earlier [UX review](../../../../docs/ui-ux/README.md) remains separate.

## Verification

- 867 unit checks in 101 files, including bright-panel contrast and Momo cadence, preferences and non-repeating joke selection.
- Type checks pass; scoped lint has no errors and 13 existing warnings.
- Local and cloud builds pass; cloud build metadata verified. The existing large entry-chunk warning remains.
- Full browser regression passes: 190 cases, including both phone profiles, keyboard-height checks, all settings categories, logging, dialogs, swipe rows and touch targets.
- Final canonical screenshots pass: 59 checks, covering 58 images plus the Today alignment check. The 54 changed images were captured before accepting them, with visual review across the changed route compositions on phone and desktop in both themes; Momo adds four new views. One Saved capture timed out under concurrent load, succeeded alone, and then passed both full verification runs.
- The gallery loads all eleven screen choices in both themes without missing images or page errors.
- The final Momo loading/timing/mute/reload/touch checks and production smoke checks pass: 15 cases. They include real touch emulation at 360×844 and 844×390, and preserving scroll position after dismissal.

### Download sizes

Measured from the final local production build. [Detailed measurements](assets.json) retain the historical `96ef630a` budget baseline and the previous `c9705494` values.

| Gzip bytes | Historical baseline | Previous UI | New UI | Growth / limit |
|---|---:|---:|---:|---:|
| All JavaScript | 301,907 | 308,397 | 312,126 | 10,219 / 10,240 |
| All CSS | 61,013 | 61,010 | 62,623 | 1,610 / 2,048 |
| Cold Today JavaScript | 250,932 | 253,336 | 253,557 | 2,625 / 5,120 |

All three download budgets pass. The JavaScript budget has 21 bytes of headroom, so further feature work needs to recheck it.

## Remaining checks

Physical iOS Safari and Android keyboard/address-bar behaviour, notch and home-indicator spacing, haptics and screen-reader behaviour still need device checks. Chromium's iPhone 13 and Pixel 7 profiles provide touch/device emulation, not Safari certification.

The previous strict interaction-latency gate remains open. This pass measures download size and UI behaviour; it does not claim the earlier latency failures have been fixed.
