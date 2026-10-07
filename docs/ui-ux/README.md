# Poiem UI/UX improvements

Reviewed and implemented on `poiem-motion-return`, continuing from `628c1c08`. Review completed 7 October 2026. The app retains its paper/ink palette, Momo artwork, flat surfaces, Standard motion, immediate Undo and existing data contracts.

Application changes are saved in local commits `39d2a611` (logging and recovery) and `9b61f51a` (Today, Insights and applied preferences). A separate evidence commit contains browser regressions, reviewed captures and this report.

## Changes

| Area | Improvement |
| --- | --- |
| Meal logging | The chosen meal slot follows Saved, Describe, Photo, Review, manual fallback, back navigation and reload. A visible destination line stays present in loading and unavailable states. |
| Repeat meals | Saved and Recent share explicit Log and Portion controls, quarter increments, nutrition previews and a definition of 1×. Logged macros and serving details match the preview. Save terminology is consistent. |
| Recovery | AI recovery copy reflects the access state and leads to a useful action. Coach failures attach Retry to the original message without adding a duplicate user bubble; cancelled, deleted and cleared requests ignore late responses. Privacy information remains available in disclosures. |
| Drafts and forms | Restored meals offer Continue and Start fresh. Errors identify and focus the relevant field. Totals remain visible and macros can be disclosed. Delayed durable hydration preserves early edits and cannot resurrect cleared drafts, including rapid reopen and account-wide clears. |
| Today | A smaller phone greeting and collapsible completed-step details bring the snapshot and Meals closer. Meals precede Water on phones; desktop keeps the summary and Water in the left lane. Momo unlock milestones use plain language. |
| You | A labelled native Category picker exposes every destination on phones. Everyday preferences apply immediately with local confirmation. Profile and AI setup retain explicit Save; pending profile edits do not overwrite applied preferences. Pause and target summaries use the applied state. |
| Insights | Zero/one weigh-in states explain what is available. Trend metrics appear when enough observations exist. Archive dates open the correct journal day; XP and freeze explanations use a disclosure. |

## Visual evidence

Open the [before-and-after gallery](gallery.html) for the changed routes at 390px and 1440px. Before images preserve the preceding commit's canonical captures. Photo had no preceding canonical baseline, so its before images were captured from an isolated build of that exact source in Windows Chromium and are labelled with that environment.

The canonical Linux run passed all **55** checks, including light and dark captures of Today at 320/390/768/1440, Log sheet at 320/390/1440, Today and Log sheet in 844×390 landscape, Describe, Photo, Manual, Saved, Insights, You and Coach, plus unchanged reference checks. Only deliberately changed route captures were refreshed after visual inspection; no comparison threshold was increased. Final captures live in [the visual baseline folder](../../web/app/e2e/visual/__screenshots__). Canonical narrow screenshots use a desktop browser viewport; separate mobile projects provide touch/mobile emulation.

This approved pass also closes the two desktop Log sheet snapshot differences left pending in the historical [motion report](../motion/evidence.md). That report preserves the narrower approval and source state at its original recording time; the current visual result is 55/55 above.

## Verification

| Check | Result |
| --- | --- |
| Unit tests | 99 files / **859 tests passed**. |
| TypeScript | `npx tsc -b` passed. |
| Scoped lint | `npx oxlint src e2e scripts` passed with 13 existing warnings and no errors. Dependency/build folders were excluded. |
| Builds | Cloud and local builds passed; local is the final performance preview. The existing >500 kB chunk warning remains. |
| Chromium and production | Initial full run: 163/167 passed. Two checks used retired labels, the landscape check still assumed Meals was the last section, and a repeat-row check reset during ongoing edits. Stable-source focused reruns passed **45 unique Chromium scenarios and 3 production scenarios**, covering all four failures plus logging, drafts, Retry, portion previews and archive/ring behavior. No product failure remains in those scenarios. |
| iPhone 13 and Pixel 7 profiles | **12 mobile scenarios verified** across route and focused reruns, with Chromium `isMobile`, touch and device scale factors. Twenty device/width/theme route walks cover 320/360/390/430 and landscape 844×390, core revised routes and every You category. Four keyboard-height checks use 390×400. Fractional scroll rounding permits at most 1 CSS pixel at viewport edges; hit testing must still succeed. |
| Canonical visuals | **55/55 passed**, Linux Playwright 1.61.1. |
| Diff hygiene | `git diff --check` passed. |

Browser checks run on owned isolated ports with local fixture data. Manual, Photo and Describe estimates use deterministic mocks where a successful AI reply is required. The mobile projects and the new landscape/320px captures are retained in the normal Playwright configuration.

## Performance evidence

Fresh [baseline chunk sizes](performance/baseline-chunks.json), [candidate chunk sizes](performance/candidate-chunks.json) and [cold signed-in JavaScript transfers](performance/initial-js.json) compare matching local-backend builds with the historical budget baseline `96ef630a`. That is the original motion baseline, not the immediately preceding UI commit. Gzip uses Node `gzipSync`, not Vite's displayed estimates.

| Quantity | Baseline gzip B | Candidate gzip B | Growth B | Existing allowance B | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| All JavaScript | 301907 | 308397 | +6490 | 10240 | Pass |
| All CSS | 61013 | 61010 | −3 | 2048 | Pass |
| Cold signed-in Today JavaScript | 250932 | 253336 | +2404 | 5120 | Pass |

The new runtime trace measures seven interactions ten times each at 390×844 with 4× CPU throttling on this Windows host. Timing starts at a trusted click and ends at the frame after feedback becomes visible (or the sheet disappears). It is a conservative paint proxy, not a browser INP score. Overlapping browser long tasks are retained. Cold navigation occurs before each scenario; initial loading outside the click-to-feedback window is excluded. Coach's remote response is mocked, and its metric covers local message insertion.

All **70 samples completed with zero page/scenario errors**. The **100 ms p95 / zero-long-task gate remains failed**:

| Interaction | Samples | p95 ms | Overlapping long tasks | Gate |
| --- | ---: | ---: | ---: | --- |
| Sheet open | 10 | 807.6 | 19 | Fail |
| Sheet close | 10 | 189.2 | 11 | Fail |
| Manual save | 10 | 1191.7 | 36 | Fail |
| Saved relog | 10 | 1046.2 | 47 | Fail |
| First-meal moment | 10 | 1148.9 | 40 | Fail |
| Second-log toast | 10 | 1282.5 | 34 | Fail |
| Coach send | 10 | 288.4 | 10 | Fail |

The [raw trace](performance/interaction-trace.json) preserves every sample and overlapping task. Nearest-rank p95 with ten samples is the maximum sample; long-task counts are totals across the ten measurement windows. No slow sample was removed and no gate was widened. Historical baseline measurements also failed these gates; comparing separate runs does not establish a causal improvement. Further cold-route/render profiling and representative Android timings remain required for responsiveness acceptance.

The trace records checkout base `628c1c08` with `dirty: true`, because the approved source changes and evidence were uncommitted when captured. It measured the final local build after the mobile-first cleanup. Reproduce from `web/app` after `npm run build:local` by starting an owned preview and running `node scripts/interaction-trace.mjs --url http://localhost:<port>/app/ --output <report-path> --repetitions 10`. A completed report that misses the runtime gate exits nonzero.

## Remaining device and release checks

Physical iOS Safari keyboard/address-bar behavior, notch/home-indicator spacing, real Android frame/input timings, screen-reader announcements and actual haptics still require device checks. Browser emulation and DOM assertions do not establish those outcomes. AI success/retry tests use deterministic local mocks; they do not verify a live provider's availability or latency.

Runtime responsiveness remains a measured acceptance gate; the detailed results below retain slow samples and any budget failure. These UI changes are committed locally, with no push, PR or deployment.
