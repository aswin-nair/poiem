# Keep focus on the selected control

11 October 2026 · Local follow-up to the keyboard-focus concern found during photo/connection verification.

Baseline: `945a1fff` on `poiem-motion-return`. The app source was unchanged when the reproduction ran.

Implementation: `0fea531455c22c77778b41ebd38eb34b15374a37`, saved locally.

## Confirmed defect

The route helper waits for a heading to mount, then focuses it in an animation frame. Previously, that request was unconditional. If a person selected a field before the frame ran, the delayed heading could take focus away.

The reproduction pauses the real app's route frame, opens Manual, fills the actual meal field and selects “and”. The field is focused before advancing 200 ms and inactive afterward on the original source, at both 390px and 1440px. Both original assertions failed. [Baseline log](verification/before.log), [390px trace](verification/before-390-trace.zip), [1440px trace](verification/before-1440-trace.zip).

This confirms the separate route-focus defect. It does not prove the cause of the earlier intermittent Pixel 7 failure, whose original run did not retain an active-element timeline. The [photo/connection report](../upload-connection/README.md) preserves that distinction.

## Changes

- A screen that already owns focus in its content, page header or dialog keeps it.
- Once another control receives focus, the pending heading request retires its observer, animation frame and focus listener. Later blur or DOM updates cannot revive it.
- Ordinary route arrival still announces its heading. A retained navigation link does not prevent focus reaching a slow-loading destination.
- The existing log-sheet return and Settings hash/panel behavior remain in place. The effect still follows pathname changes; Settings owns its query/hash destinations.

The production change is confined to `src/App.tsx`. No styles, artwork, nutrition rules, persistence, service APIs, model settings or screenshot baselines change.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Unit suite | 1,024 passed across 121 files | [Log](verification/unit.log) |
| Lint | Zero errors, 13 existing warnings | [Log](verification/lint.log) |
| Type check and local production build | Passed | [Log](verification/build.log) |
| Final browser pass | 24/24 passed, one worker, no retries | [Log](verification/final.log) |
| Earlier extended navigation/Settings batch | 39/40 passed; new paused-clock fixture failed before its target mounted | [Log](verification/history/regression-initial.log) |

The final browser selection covers pending Manual field/button focus, text selection and draft retention, no restart after blur, ordinary heading focus, keyboard navigation, leaving a still-loading screen, iPhone 13/Pixel 7 touch emulation, Settings direct panel/hash/recovery focus, first-paint sheet focus/Escape/restoration, confirmation Dismiss/Undo, the existing Manual/Coach keyboard-height cases in both themes, and production `/app/` routes. It runs with one worker, tracing and no retries.

The earlier extended batch additionally passed delayed Settings heading arrival, Support/About recovery links at 320/390/1440 in both themes, failed route download/reload/return behavior, unknown hashes, and all exact Settings search cases including large text. Expected failed-import console messages are deliberately induced by the route recovery fixtures.

To rerun the 13 focused route/Settings/sheet cases from `web/app`:

```text
npx playwright test e2e/route-focus.spec.ts e2e/settings-deep-link-recovery.spec.ts e2e/sheet-ready.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --workers=1 --retries=0 --trace=on
```

### Fixture history

The first draft used an exact label that omitted the field's “Required” text and was interrupted before reaching the race. The corrected reproduction then failed both focus assertions against unchanged production code. A phone-context setup attempt was rejected by Playwright before tests ran because browser-level options were supplied inside a describe group; it now supplies context emulation options only. [Setup log](verification/history/device-config.log).

After the fix, the first focused batch passed 10/11. Its new AI-panel test paused the clock before the lazy screen mounted and failed because the target did not exist. A second version advanced 16 ms per poll; the extended batch passed 39/40 with the same readiness failure. The final supplemental AI-panel test uses the normally advancing seeded clock and still asserts panel focus before and after 200 ms. It passed in the final 24-case batch. The deterministic Manual race tests retain their paused frame and assertions. Focus assertions and their timeouts remain unchanged. [First focused log](verification/history/focused-initial.log), [paused Settings context](verification/history/paused-settings-context.md), [trace](verification/history/paused-settings-trace.zip).

## Reviewed captures and limits

The [comparison gallery](gallery.html) shows the field after the pending frame on both versions. The initial selected-field captures establish the same starting selection.

| Viewport | Initial selection | Before | After |
| --- | --- | --- | --- |
| 390px | [Selected](images/selected-390.png) | [Focus lost](images/before-390.png) | [Focus retained](images/after-390.png), [trace](verification/after-390-trace.zip) |
| 1440px | [Selected](images/selected-1440.png) | [Focus lost](images/before-1440.png) | [Focus retained](images/after-1440.png), [trace](verification/after-1440-trace.zip) |

These comparisons use light-theme Chromium at phone and desktop widths. Additional phone contexts use touch, mobile user agents and device scale factors on Chromium; shortened viewports simulate keyboard space. They do not establish physical Safari keyboard, address-bar or assistive-technology behavior. The initial already-focused branch is covered indirectly by route-owned focus checks, rather than a dedicated fixture forcing pre-effect control focus.

Local fictional account data is used; API requests are intercepted. No live provider, real account or deployment is checked. Full canonical visual suites and performance measurements are not rerun for this focus-only change. Existing physical-device, other-engine, cloud-staging, participant and performance release checks remain open. Changes are saved locally; no push or deployment is included.
