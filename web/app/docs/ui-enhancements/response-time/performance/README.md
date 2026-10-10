# Controlled rendering comparison

October 10, 2026 · Exact baseline `131bd0d7` → implementation `40be9ec3`

## Method

Both sources use the same existing dependency lockfile, local backend, empty Google client ID and Windows build host. The baseline is a Git archive in `.cache/response-time-baseline-131bd0d7`; its app, shared build inputs, static assets and package sources come from that revision. Its dependency directory links the existing installed dependencies. The active checkout remains on the candidate. No package installation is required.

The [capture helper](capture.mjs) starts only its production previews on ports 5299 and 5199. It checks the implementation source against each labelled Git revision, records normalized source hashes, the lockfile hash, build index hash and requested asset hashes, then closes its browser and previews. Keep source, builds and browser-test work frozen during measurement. A later documentation-only commit can have identical source; reports preserve the revision actually measured.

Initial loads use fresh Chromium contexts, disabled browser cache, 4× CPU throttle and unthrottled localhost. Each of 390×844 and 1440×900 receives three paired baseline/candidate samples. Calendar context is fixed; performance clocks and input remain real. External and API requests are blocked. Requested JavaScript/CSS through Calories readiness, font readiness and two further seconds are included. Computed gzip footprint is distinct from actual encoded bodies and transfer sizes. Fonts and images are outside this JS/CSS footprint.

Actions use ten repetitions each of log-sheet open/close, manual save, Saved repeat, first-meal confirmation, ordinary toast and Coach send. The unchanged harness starts at trusted click capture, polls for visible/absent feedback DOM, then records the following animation frame. It excludes pre-dispatch input delay and does not establish presented-frame latency or INP. Its style/geometry reads can force layout; own-element opacity does not establish ancestor opacity, clipping or actual paint. Cold-page effects can overlap the action. Long tasks are reported by temporal overlap, not proven causation. Coach replies are mocked, so send feedback is not model latency.

The existing lab budget remains p95 ≤100ms with zero overlapping long tasks. With ten samples the nearest-rank p95 is the maximum. Three load samples do not establish stable loading speed or field p75 targets. Preserve every sample and error.

Baseline precedes candidate within each paired initial load; the order is not randomized and OS/file caches are not cleared. All baseline actions complete before candidate actions. The runs therefore retain possible order, warming and host-load effects. The harness's historical `--baseline` option is omitted for both revisions because it selects a retired UI. Its progress text calls both runs “candidate”; each report's revision and output file identify the actual source.

## Initial-load observations

| Requested JS/CSS measure | Baseline | Candidate | Change |
| --- | ---: | ---: | ---: |
| Computed JavaScript gzip footprint | 251,911 B | 211,951 B | −39,960 B / −15.86% |
| Computed CSS gzip footprint | 60,430 B | 60,430 B | 0 |
| Combined computed footprint | 312,341 B | 272,381 B | −39,960 B / −12.79% |
| Encoded response bodies | 312,759 B | 272,710 B | −40,049 B |
| Recorded transfer sizes | 319,059 B | 277,510 B | −41,549 B / −13.02% |
| Requested JS/CSS files | 21 | 16 | −5 |

The computed footprint and request counts were identical across all three samples at both widths. Today no longer requests the animation feature file or its four associated feature dependencies; the reorganized main and Momo assets are also included in the total. Computed gzip uses Node's default compression; Vite's displayed gzip figure can differ. Compare the same metric on both sides.

| LCP, three samples per width | Baseline median (range) | Candidate median (range) |
| --- | ---: | ---: |
| 390×844 | 2,836ms (1,884–4,756) | 1,660ms (1,496–1,756) |
| 1440×900 | 1,600ms (1,272–1,864) | 1,296ms (1,284–1,404) |

All twelve loads recorded no page error. Maximum CLS was 0.0046 baseline and 0.0039 candidate. These small, ordered local samples do not establish stable speed, field p75 LCP/CLS or INP. Every load and requested asset remains in [initial-load.json](initial-load.json).

## Action-feedback observations

| Action, ten samples each | Baseline p95 | Candidate p95 | Overlapping long tasks, baseline / candidate |
| --- | ---: | ---: | ---: |
| Open log sheet | 1,017.1ms | 1,083.4ms | 19 / 22 |
| Close log sheet | 245.1ms | 261.4ms | 18 / 14 |
| Manual save | 1,158.2ms | 1,242.6ms | 44 / 42 |
| Saved repeat | 1,159.7ms | 1,207.4ms | 44 / 49 |
| First-meal moment | 1,417.7ms | 1,178.5ms | 47 / 47 |
| Ordinary toast | 950.7ms | 1,083.0ms | 47 / 41 |
| Coach send feedback | 345.2ms | 334.2ms | 10 / 10 |

Both sources completed all seventy actions with **zero functional errors**. Both returned budget exit 1: **all seven actions miss** the unchanged p95 ≤100ms / zero-overlapping-task condition. Candidate p95 is higher on five actions and lower on two; this mixed, small, ordered sample supports no general response-speed claim. It does not establish a stable regression rate either. Counts sum tasks overlapping all ten measured intervals for each action, not tasks per click or field attribution.

The measured initial download reduction is retained; **the response-time gate remains failed**. These changes do not justify shortening animation recipes, changing focus timing or altering data semantics. Raw samples, long-task intervals, harness hash and errors are retained in [baseline-interactions.json](baseline-interactions.json) and [candidate-interactions.json](candidate-interactions.json).

## Diagnosis

A separate one-repetition CPU profile of the baseline measured all seven actions without functional errors. It recorded substantial browser work and React/Home/mascot activity; the profile does not isolate one cause. Profiling overhead makes those timings unsuitable for the budget comparison. The optional `--cpu-profile-dir` harness flag records `.cpuprofile` files only when requested, and the harness records its file hash and profile directory. Budget runs omit that flag.

[Retained raw profiles and derivation](diagnosis/methodology.md) preserve the original diagnostic report and weighted sample analysis. That earlier dirty harness predates file-hash metadata; its exact bytes and original served-byte hashes were not retained. Later exact-revision build excerpts provide mapping context. Two negative raw sample intervals remain unchanged and disclosed; excluding them leaves the four selected estimates unchanged. Profile sums cover the whole profiler window, not only click feedback.

Exact bundle locations distinguish repeated minified names. The baseline profile mapped Home rendering to `index-J9I0-g20.js:16:16593`, the overlay to `:16:2963`, its stage collision check to `:16:11581`, and its separate bubble check to `:16:12944` (one-based). The Saved-repeat profile recorded about 135ms self time in Home and 110ms in the stage check. A rectangle read inside the receipt measurement at `:10:74257` recorded 37ms in manual save; Coach's resize code at `CoachPage-BFUc0Nw0.js:33:3105` recorded a 53ms viewport-height getter during send. These are individual profiled samples, not comparative gains or stable costs.

The fixture's `hideOverlay` suppresses visible roaming art while leaving its geometry effects active. Those costs require a separate measurement with production-visible Momo and explicit user settings. Generic browser `(program)` work occupies much of the profiles, and some rectangle reads belong to Playwright's own polling. Do not attribute all layout or long tasks to the mascot.

Concrete next experiments are to share one collision-geometry snapshot per scheduled frame, memoize Today day/group derivations and stable rows, use ResizeObserver's border-box size for receipt updates after the initial before-paint clearance, and cache Coach's height cap until viewport resize. Each needs its own collision, Undo, focus, date-rollover and short-screen checks. None is included in `40be9ec3`.

## Reproduce

From the repository root, using Node 24+ (recorded runtime 24.14.1; the helpers import TypeScript directly), export `131bd0d7` with `web/app`, `web/shared`, `web/vercel.json`, `web/assets` and `packages` into the named baseline cache directory, link its app dependencies, then build both apps with `npm run build:local`, `VITE_GOOGLE_CLIENT_ID` empty and the local backend. Use the same runtime for both builds. Stop only conflicting task-owned previews; leave the user's other services alone.

```text
node web/app/docs/ui-enhancements/response-time/performance/capture.mjs
```

The interaction child processes return exit 1 when a budget fails. The helper retains those exits and reports for both revisions; helper completion alone is not a performance pass.

Raw files are `initial-load.json`, `baseline-interactions.json` and `candidate-interactions.json`. The verification report records their observed outcomes and separates unverified physical-device, browser-engine, field-performance and cloud-durability work.
