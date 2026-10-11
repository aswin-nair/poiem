# Controlled local performance comparison

October 10, 2026 · Planning baseline `923f2e4e` → source candidate `04552501`

This is local lab evidence. It does not establish field LCP, INP, real-device performance or a release pass. The baseline is a planning comparison, not a validated deployed rollback target.

## Conditions

- Windows 11 build 26200, Snapdragon X X1P64100, Node 24.14.1 and Playwright Chromium 149.0.7827.55.
- Both revisions built on the same host with the same dependency lockfile, local backend and empty Google client ID. No source changes or builds during measurement.
- Separate production previews on ports 5299 (baseline) and 5199 (candidate). Synthetic account and fixed calendar context; performance clocks, timers and trusted input remain real.
- Fresh context per load, disabled browser cache, 4× CPU throttle, unthrottled localhost. External origins and API calls are blocked for initial-load measurements. The interaction harness mocks Coach and blocks other API requests; it measures local send feedback, not model latency.
- Three initial-load samples at each of 390×844 and 1440×900. Baseline precedes candidate within each pair; the order is not randomized and OS/file caches are not cleared.
- All successful requested JS/CSS through the visible Calories progressbar, font readiness and a further two seconds are included. `gzipSync` gives a comparable asset footprint; it is distinct from actual response compression and wire transfer. Actual encodings, resource body sizes and transfer sizes are also retained.
- Ten repetitions of seven feedback actions at 390×844 / 4× CPU: open/close logging sheet, manual log, Saved repeat, first-meal moment, later-log toast and Coach send. Trusted click → visible/absent feedback DOM → following animation frame is a feedback proxy. Attributable long tasks overlap that interval. It does not measure actual frame presentation or browser INP.

The source candidate is committed. Reports can mark the checkout dirty because documentation, reviewed screenshots and local scratch files were pending; app source matches `04552501`. Both traces use the same current harness and fixture. The harness's `--baseline` option targets a much older retired UI and is intentionally omitted for `923f2e4e`; revision fields identify the baseline run.

## Evidence

- [Initial loads and every requested asset](initial-load.json)
- [Baseline interaction samples](baseline-interactions.json)
- [Candidate interaction samples](candidate-interactions.json)
- [Capture helper](capture.mjs)

Results are summarized in the [recovery delivery report](../README.md). All samples, including cold-start outliers and failures, remain in the raw files. Three load samples are too few for a percentile or stable speed claim. The interaction budget is p95 ≤100ms with zero attributable long tasks; the broader field targets remain LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at p75.

## Initial-load result

| Metric | Baseline | Candidate | Change |
|---|---:|---:|---:|
| Requested JS gzip footprint | 260,715 B | 251,560 B | −9,155 B / −3.51% |
| Requested CSS gzip footprint | 55,063 B | 59,573 B | +4,510 B / +8.19% |
| Combined computed footprint | 315,778 B | 311,133 B | −4,645 B / −1.47% |
| JS/CSS encoded response bodies | 316,196 B | 311,550 B | −4,646 B |
| Recorded JS/CSS transfer sizes | 320,396 B | 317,850 B | −2,546 B / −0.79% |
| Requested JS/CSS files | 14 | 21 | +7 |

These sizes were identical across all three samples and both widths. Smaller route code reduces the computed JS footprint, while more shared requests and CSS limit the total transfer reduction. Comparing only the main bundle would substantially overstate the initial-load saving.

| LCP, three samples per width | Baseline median (range) | Candidate median (range) |
|---|---:|---:|
| 390×844 | 2,760ms (1,964–5,176) | 2,740ms (1,616–16,104) |
| 1440×900 | 2,436ms (1,980–4,404) | 2,028ms (1,892–3,908) |

The candidate phone's 16,104ms sample is an unexplained timing outlier and remains included. These variable samples support no stable loading-speed claim. Maximum observed CLS was 0.0041 baseline and 0.0038 candidate; all twelve loads had no page error. This small controlled set does not establish field LCP/CLS acceptance.

## Action feedback result

| Action, ten samples each | Baseline p95 | Candidate p95 | Overlapping long tasks, baseline / candidate |
|---|---:|---:|---:|
| Open log sheet | 2,189.8ms | 1,215.1ms | 24 / 28 |
| Close log sheet | 813.4ms | 318.2ms | 13 / 21 |
| Manual log | 2,339.1ms | 1,876.1ms | 52 / 55 |
| Saved repeat | 2,101.0ms | 2,247.6ms | 56 / 58 |
| First-meal moment | 1,765.2ms | 2,183.3ms | 50 / 52 |
| Later-log toast | 1,728.0ms | 1,780.6ms | 46 / 58 |
| Coach send feedback | 7,973.2ms | 577.0ms | 10 / 10 |

Each revision completed all seventy actions with no functional error. Both runners returned budget exit 1: every action misses the ≤100ms / zero-long-task condition. With ten samples, this harness's nearest-rank p95 is the largest sample. It retains timing outliers; it does not establish a stable improvement or regression rate. Long-task counts sum tasks overlapping each measured interval across the ten samples; they are not tasks per action or field attribution.

The lab response-time gate remains **failed**. Profile main-thread work before claiming a fix. A source review found that Today eagerly downloads the 25,747-byte animation feature chunk although its animated React components are in lazy Welcome/Login/Onboarding/Admin screens. Deferring that provider to those screens is a concrete next download experiment. Stable Momo drawings, Toast context and Coach message formatting are additional rendering candidates. None has been applied or measured in this snapshot. Preserve mascot collision checks, modal focus, existing motion preferences and persistence semantics while investigating; these results do not justify shortening animation durations or changing data rules.

## Reproduce

Run from the repository root with the locked dependencies installed in `web/app`. Prepare an exact archive of `923f2e4e` at `.cache/core-baseline`, including its packages. Its `web/app/node_modules` may point to the same locked installed dependencies because the lockfiles match. Build both app directories with `npm run build:local`, `VITE_DATA_BACKEND=local` and an empty `VITE_GOOGLE_CLIENT_ID`. Use the same Windows runtime for both builds.

Stop other test/build/browser work and ensure ports 5299 and 5199 are free. Run:

```powershell
node web/app/docs/ui-enhancements/recovery/performance/capture.mjs
```

The helper starts and stops only its own preview processes and writes this directory's three reports. The separate interaction runner can return exit code 1 when a budget fails; the capture helper records those exits and continues to preserve both revisions. A helper exit of zero alone is not a performance pass.
