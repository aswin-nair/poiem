# Motion slice evidence

Recorded 6 October 2026. Worktree: `.claude/worktrees/poiem-motion-return`, branch `poiem-motion-return`, stacked on unmerged `poiem-motion-safety` (`26ae69a8`). This continues Claude’s `4e20708f` handoff. Source fixes are `b2f76271`; core browser coverage is `a88209b6`, obstacle repair `4f52bd75`, Today baselines `a2de9355`, clearance optimization `7b718501`, and isolated calorie count-up `e3cd04a9`. Nothing was pushed or deployed.

## What changed in this continuation

- Saved star hover no longer inherits a scale; its active state keeps the flat 2 px press.
- An already-announced pending level is cleared silently, with receipt/sheet/paused gates preserved.
- The planner and toast share punctuation handling, including Unicode ellipsis.
- First-meal live feedback names the handover and other newly earned pieces once, then the level.
- The floating receipt reports its height. Today reserves bottom scroll clearance, retains it on dismissal and clamps it to the current viewport on rotation. The bounded card scrolls on short screens. Arrival/removal do not resize existing content.
- Today summary spacing is restored at phone/tablet widths, preserving the earlier approved UI fix.
- Card-height bookkeeping no longer triggers a Today render. The calorie count-up now rerenders only its readout, preserving its 700 ms timing and reduced-motion behavior without redrawing meals, the ring and Momo every frame.
- Browser helpers use the current card/status surfaces; logging guards, quiet controls, meter translation, Coach following, ring closure and first-meal ownership have explicit coverage.

Scope remains the approved fixed Standard B1–B4 slice and one B6 progress note. Staged rewards, new intensity/reminder controls, visit metadata, return hooks and telemetry remain paused. No synced field, dependency, font, audio or remote asset was added.

## Build budget

Baseline: [baseline.md](baseline.md), revision `96ef630a5f37e04a24ceba826510342a3f4b280b`. Final build uses empty `VITE_GOOGLE_CLIENT_ID`, cloud backend and release `after`; Node v24.14.1, npm 11.11.0, Vite 8.1.0. Asset gzip uses the same Node `gzipSync` script, not Vite’s displayed estimates. [Final per-chunk data](after-chunks.json).

| Quantity | Baseline gzip B | Candidate gzip B | Delta B | Allowed growth B | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| All JS | 301913 | 304451 | +2538 | 10240 | Pass |
| All CSS | 61013 | 60092 | −921 | 2048 | Pass |
| HTML entry JS | 162581 | 159520 | −3061 | 5120 | Proxy only |
| Cold signed-in JS (local fixture) | 250932 | 249965 | −967 | 5120 | Pass |

The HTML entry is a proxy, not the complete signed-in request set. The separate [cold signed-in Today capture](initial-js.json) uses identical local backend builds, captures successful JavaScript requests through the visible calorie meter and a one-second font-ready settling window, and sums gzip of every requested asset, including `appearance-init.js`. It decreased by 967 B. The JSON records both revisions and every requested asset/size. The baseline was extracted into scratch space; no other checkout changed. Cloud authentication/API transfers are outside that local fixture measurement. The existing >500 kB entry warning remains.

## Browser interaction measurement

`node web/app/scripts/interaction-trace.mjs` uses Chromium 149, 390×844 UTC and CDP 4× CPU throttling on Windows 11 ARM (Snapdragon X1P64100). Ten samples each cover sheet open and close, Manual save, Saved relog, first-meal card, second-log toast and Coach send. Sheet open/close produce separate rows, 70 samples total.

Measurement starts at a trusted click event captured in the page. It ends at the frame after feedback becomes present with nonzero opacity (or the sheet is absent), a conservative paint proxy. Real `performance.now`, timers and rAF are used; only the fixture calendar date is offset. Browser-reported long tasks overlapping the input→feedback window are conservatively attributed; initial loading outside that window is excluded. Reported durations are quantized, so an entry reported as exactly 50 ms is retained rather than filtered away at the boundary. Coach responses are mocked, and the measured feedback is local sent-message insertion, not model/network latency. Sound/haptics are off; the floating overlay is hidden by the test hook, while the card’s decorative Momo remains enabled.

A concurrent one-sample smoke run was slow and is excluded from acceptance. Final candidate and extracted-baseline runs are sequential after browser/visual tests stop. The 100 ms p95 / zero-long-task budgets are reported below; OS/Android frame rate and physical sound/haptics are not inferred from CDP timing.

The first candidate run completed all 70 interactions without page errors, but failed both runtime budgets on this host. Review found one avoidable rerender of Today when its card reported its height. Commit `7b718501` moves this geometry bookkeeping to a retained ref and an owned CSS property; it no longer rerenders the page or its Momo drawings just to reserve bottom space. A new state-update case confirms the clearance survives changing water. Review also found that the existing calorie count-up rerendered the entire page on each frame; `e3cd04a9` isolates it in a small readout component. All 36 final regression cases passed after that change.

Final [candidate samples](interaction-trace.json) and [baseline samples](baseline-interaction-trace.json) retain every timing and overlapping task. This measures outcome feedback, not merely the button’s earlier pressed state, and does not wait for the entrance animation to finish. A comparison cannot turn an absolute budget failure into a pass.

| Interaction | Baseline p95 ms | Candidate p95 ms | Baseline long tasks | Candidate long tasks | Absolute gate |
| --- | ---: | ---: | ---: | ---: | --- |
| Sheet open | 715.0 | 988.2 | 20 | 20 | Fail |
| Sheet close | 207.4 | 273.9 | 10 | 15 | Fail |
| Manual save | 1503.0 | 1539.8 | 44 | 48 | Fail |
| Saved relog | 1760.7 | 1719.9 | 54 | 55 | Fail |
| First-meal moment | 1476.1 | 1362.8 | 59 | 49 | Fail |
| Second-log toast | 1537.4 | 1371.7 | 41 | 44 | Fail |
| Coach send | 309.4 | 314.0 | 10 | 10 | Fail |

Each row has ten samples per build; nearest-rank p95 is consequently the maximum sample. Long-task columns are total overlapping task counts across those ten windows, not per-action averages. Both runs completed all 70 interactions with zero page/scenario errors. The baseline also breaches every absolute runtime gate. Host/run variation is visible in the intermediate captures, so these small samples do not establish causal improvement or regression. The two render changes remove concrete unnecessary work; that is not proof that the responsiveness budget is met.

**Open performance finding:** the 100 ms / zero-long-task gate remains failed. Cold route/feedback rendering needs profiling on this host and representative Android hardware before release acceptance. No limit was widened, no slow sample was discarded from the final reports, and no retention/performance certification is claimed. This continuation fixes the identified redundant Today renders; the remaining profiling is a release acceptance requirement.

The candidate preview was built with the application logic at `e3cd04a9`; the later Home header edit only corrects a comment. Reports have `dirty: true` because the new harness and evidence were uncommitted during capture. `harnessCommit` records checkout HEAD at capture; the harness itself is committed with this evidence. To reproduce, build locally, start a preview on a free owned port, then run `node scripts/interaction-trace.mjs --url http://localhost:<port>/app/ --output <report-path>` from `web/app`. A completed report with a budget failure makes the harness exit nonzero.

## Automated gates

| Check | Evidence |
| --- | --- |
| Web unit tests | 96 files /799 tests passed. |
| Web TypeScript | `npx tsc -b` passed. |
| Web lint | Passed with 13 existing warnings, 0 errors. The sandboxed retry that traversed ignored dependencies was stopped; the normal-access run respected repository ignores. |
| Product | 5 files /66 tests passed. |
| API | 46 files /201 tests passed after an esbuild filesystem-access retry. |
| API TypeScript | Passed. |
| Builds | Cloud then local passed; local is the final preview build. |
| Size budgets | JS +2538 B, CSS −921 B, cold signed-in JS −967 B: all within the approved growth caps. |
| Runtime budgets | **Failed**, all seven interaction rows; raw baseline and candidate reports retained above. |
| Focused W3 | 34 browser tests passed; motion-rules repeated 3×, 18 checks passed. |
| Complete Chromium + production |149 original cases:145 passed;3 failed after machine/network suspension,1 still expected the retired reward toast. All4 are covered by the final 23/23 passing regression rerun. The optimization then passed 13/13 receipt/ring cases and 1 new water-state/clearance case, making 150 verified scenarios across these runs. No application failure remains in this suite. |
| Final source regression | 36/36 passed after `e3cd04a9`: Home, receipt/ring, motion rules, UI consistency and obstacles. Unit/lint/types/cloud/local gates also passed with this source. |
| Canonical Linux visual | 43/45 passed; two desktop log-sheet baseline refreshes await approval as described below. |

The final new receipt/ring scenarios include special feedback at repeat tiers, single cues, durable ownership after deletion, Undo, refresh/history dedupe, paused state, equal nutrition-independent ring state, preference fallbacks and accessible labels. Geometry checks hit-test Add snack while the card is present at 320/390px, phone landscape and 200% text, including rotation after enlargement. Dismissal at the scroll end preserves row position and scroll height; the FAB remains keyboard operable.

## Visual review and approval limitation

Canonical image: `mcr.microsoft.com/playwright:v1.61.1-noble`, Docker29.8.1. All eight Today stills were reviewed at 320/390/768/1440 in light/dark and refreshed explicitly. The ring/progress-note insertion and phone summary spacing are deliberate; the calorie hero remains the only hero and meter stripe period is preserved.

### Before and after Today

Before images preserve the canonical snapshots at baseline `96ef630a`; after images are the reviewed `a2de9355` snapshots, verified again after the final optimization. These show the approved slice as a whole, including the recovered phone spacing.

| Viewport / theme | Before | After |
| --- | --- | --- |
| 390 light | [Baseline](before/today-390-light.png) | [Candidate](../../web/app/e2e/visual/__screenshots__/today-390-light.png) |
| 390 dark | [Baseline](before/today-390-dark.png) | [Candidate](../../web/app/e2e/visual/__screenshots__/today-390-dark.png) |
| 1440 light | [Baseline](before/today-1440-light.png) | [Candidate](../../web/app/e2e/visual/__screenshots__/today-1440-light.png) |
| 1440 dark | [Baseline](before/today-1440-dark.png) | [Candidate](../../web/app/e2e/visual/__screenshots__/today-1440-dark.png) |

### Remaining log-sheet differences

The first Linux run had 35 passes and 10 screenshot differences: eight Today captures and two 1440px log-sheet captures whose backdrop is Today. After the approved Today refresh, the final source run (`test-results/readout-linuxvisual`) has 43 passes and exactly those 2 remaining failures: 20,980 pixels in light and 52,156 in dark. The sheet foreground was reviewed against the original: content/geometry stayed the same, with an additional one-pixel-high separator raster difference. Automatic approval review rejected refreshing those two captures because the approved plan scoped baseline updates to Today. They remain unchanged pending the user’s explicit approval; no threshold was loosened or background masked to suppress the differences.

## Human evidence still required

- **PENDING:** physical Android input/frame profiling under representative device load.
- **PENDING:** actual screen-reader announcement/focus checks (including first meal, repeat log, Undo, paused state and live preference changes).
- **PENDING:** physical sound/haptic checks and consented dogfood using [the protocol](dogfood-protocol.md).
- **PENDING:** Track0 merge, rebase and subsequent release gates; no production release claim.

Browser DOM/accessibility assertions and static screenshots cover specific contracts; they do not certify assistive-technology behavior, real mobile frame rates or population retention.
