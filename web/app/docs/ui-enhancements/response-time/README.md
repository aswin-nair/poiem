# UI rendering follow-up

October 10, 2026 · Baseline `131bd0d7` · Implementation `40be9ec3`

This follow-up addresses repeated rendering and an unnecessary initial animation download after the [screen-edge work](../safe-areas/README.md). It preserves the current Neo Brutalist layout, animation recipes, mascot scenes, motion preferences, focus behavior and data rules. All work is local.

## Changes

- Animated Welcome, Login, Onboarding and Admin screens load a no-DOM `MotionScreen` provider with their screen. Its synchronous `domMax` supports Login's shared layout marker from the first mount. Global `MotionConfig reducedMotion="user"` remains above the router. Today and everyday screens keep their existing CSS and motion hooks without requesting those features.
- Momo's pure SVG drawing uses default shallow memo comparison. Per-instance clip identifiers, all appearance props and keyed pose changes remain. Immutable outfit updates continue to redraw the mascot.
- Toast context keeps the same value while its stable callback is unchanged. Showing or dismissing a toast does not invalidate all context consumers; lifetime, hover/focus pausing, Undo and announcements retain their existing behavior.
- Coach's formatted reply text uses default shallow memo comparison. Editing the composer does not reformat unchanged reply strings. Markup, copying, retry, cancellation, deletion and follow-scroll behavior are unchanged.

These are rendering changes. The controlled comparison measures the combined candidate; it does not attribute an effect to each change individually.

## Evidence

- [Before and after gallery](gallery.html): ordinary phone and desktop layouts, both themes.
- [Performance comparison](performance/README.md): exact production builds, requested assets and unchanged action-feedback method.
- [Verification and limitations](verification/README.md): batch outcomes, source identity and remaining gates.
- [Structured results](verification/results.json): source revisions, separate check counts, raw evidence hashes and open release work.

The combined requested JS/CSS computed gzip footprint on Today falls **12.79%**, from 312,341 to 272,381 bytes. This excludes fonts and images and does not establish a response-speed gain. Both builds completed all seventy measured actions without functional errors; **all seven action-feedback budgets still fail**.

Local checks passed: **990 unit tests**, **63 unchanged canonical visual cases**, and separate browser batches of **6 new motion cases**, **57 existing integration cases** and **24 phone/meal-feedback/production cases**. Lint has zero errors and thirteen existing warnings; type check and local production build pass. Physical devices, other browser engines, assistive technology, field performance and cloud durability remain separate work.

The gallery contains **24 pairs / 48 unmodified PNGs** across Today, Welcome, sign in, first-session introduction, local Admin preview and a synthetic Coach conversation. All 24 pairs are byte-identical after the rendering changes. The final capture records zero app page errors and horizontal overflow; all images decode, four keyboard controls work, and the report fits at 320, 390 and 1440px. This is settled reduced-motion Chromium appearance evidence, with fixed UTC calendar context and zero synthetic insets. It does not certify animation fidelity or physical-phone behavior.

The previous [M5 measurements](../recovery/performance/README.md) remain tied to `04552501`. The new baseline includes the completed screen-edge pass; these reports must not be combined as one continuous benchmark or release pass.
