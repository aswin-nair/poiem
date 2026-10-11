# Interaction layout comparison

11 October 2026 · Baseline `84d0cf1e` · Implementation `bc85116f`

## Initial-load results

All twelve loads completed with zero page errors. Requested JS/CSS estimates were identical across each source's six samples:

| Computed gzip bytes | Baseline | Candidate | Change |
|---|---:|---:|---:|
| JavaScript | 211,951 | 212,219 | +268 |
| CSS | 60,430 | 60,430 | 0 |
| Combined | 272,381 | 272,649 | +268 (+0.10%) |

This pass adds a small download cost for the memo/cap/safety logic. It does not improve the download-size target. The preceding pass's larger download reduction is separate evidence.

| Three-sample LCP, ms | Baseline median (range) | Candidate median (range) |
|---|---:|---:|
| 390×844 | 2,176 (2,088–2,432) | 2,088 (2,020–2,248) |
| 1440×900 | 1,620 (1,468–1,796) | 1,792 (1,580–2,004) |

Loading results are mixed: the phone median is lower and the desktop median higher. These small ordered samples do not establish a stable speed gain. Maximum observed lab CLS was 0.00431 baseline and 0.00707 candidate; these are not field percentiles. [Raw load samples](initial-load.json).

## Action results

Both sources completed 70 actions with zero functional errors. Both returned budget exit 1: all seven groups exceed p95 ≤100ms and have overlapping long tasks.

| Action | Baseline p95, ms | Candidate p95, ms | Baseline/candidate overlapping tasks |
|---|---:|---:|---:|
| Open log sheet | 981.9 | 830.9 | 22 / 23 |
| Close log sheet | 980.8 | 221.1 | 20 / 18 |
| Manual save | 1,732.5 | 1,290.4 | 49 / 44 |
| Saved meal repeat | 1,590.9 | 1,203.6 | 55 / 49 |
| First meal receipt | 1,342.4 | 1,121.4 | 47 / 42 |
| Later log toast | 1,683.8 | 1,175.7 | 51 / 38 |
| Coach send | 364.0 | 476.3 | 10 / 10 |

Six groups are lower in this run; Coach send is higher. This is an ordered, small local sample and does not prove causal improvement. The performance acceptance gate remains failed. [Baseline actions](baseline-interactions.json), [candidate actions](candidate-interactions.json), [verified build/source comparison](comparison.json).

## Method

This compares the exact preceding source with the combined UI changes. The helper builds both sources afresh on Windows Node 24.14.1 with the existing shared dependency installation, identical lockfiles, local backend and empty Google client ID. The baseline is exported under `.cache/layout-work-baseline-84d0cf1e`; the active checkout remains the candidate. No package/API/domain/persistence changes are included.

[capture.mjs](capture.mjs) verifies all tracked app, configuration, script, shared, package and asset inputs against the labelled Git blobs. It forces the TypeScript project check, then wraps each committed Vite configuration with matching explicit client values and disabled environment-file embedding, builds production assets and writes the normal local release-info record. The wrapper retains the committed plugins, aliases, rewrites and build options; it does not install dependencies or change product source. Build logs, settings, wrapper hashes, full input hashes and every generated dist file hash are retained per attempt. The helper checks its preview ports 5299/5199 are free, closes its own previews and rechecks all tracked inputs, lockfiles, generated files and its own code after measurement. Keep source, builds, other browser work and profiling frozen during measurement. A later documentation commit may have identical product source.

Initial loads have three paired baseline/candidate samples at 390×844 and 1440×900 in fresh Chromium contexts with disabled browser cache, 4× CPU throttle and unthrottled localhost. APIs and external origins are blocked. Calendar context is fixed, while performance clocks remain real. Requested JS/CSS through Calories readiness, font readiness and two further seconds are measured. Computed gzip excludes fonts/images and differs from encoded bodies and transfer sizes. Small ordered local samples establish neither stable loading speed nor field LCP/CLS percentiles.

Actions use the unchanged [interaction harness](../../../../scripts/interaction-trace.mjs), ten repetitions of seven actions. It measures trusted click capture → visible/absent feedback DOM → following rAF. It excludes input queue delay, is not presented-frame latency or INP, and may force layout through polling. Own-element opacity does not establish ancestor opacity/clipping/paint. Long tasks overlap the interval temporally, without proven causal attribution; cold-page work can overlap. Coach replies are mocked, so this is local send feedback, not model latency.

The acceptance budget remains p95 ≤100ms with zero overlapping long tasks. Ten samples make nearest-rank p95 the maximum. Baseline precedes candidate in paired initial loads, and all baseline actions precede candidate actions. OS caches are not cleared and order is not randomized, so warming and host effects remain. Both runs omit the historical `--baseline` selector mode for retired UI; output file/revision identifies the source even when progress says “candidate.”

The fixture hides floating overlay art while leaving geometry effects active. A passing or faster run here would not establish the cost of production-visible Momo. The separate browser/gallery cases exercise visible Momo and its safety.

## Reproduce

Use Windows Node 24+ and existing locked dependencies. Export `84d0cf1e` with `web/app`, `web/shared`, `web/vercel.json`, `web/assets` and `packages` to the named baseline cache and link its app dependencies. Stop other browser/build work; the helper performs both controlled builds before measuring. From the repository root:

```text
node web/app/docs/ui-enhancements/layout-work/performance/capture.mjs
```

Budget child exit 1 is retained as failure. Helper completion is not a passing performance result. The previous [response-time report](../../response-time/performance/README.md) retains its own source and measurements; do not merge historical samples into this comparison.
