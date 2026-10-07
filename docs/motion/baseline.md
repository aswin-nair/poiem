# Motion slice baseline

Starting revision: `96ef630a5f37e04a24ceba826510342a3f4b280b` (`poiem-motion-return`, stacked on Track 0).

Recorded 2026-10-05 on Windows, Node v24.14.1, npm 11.11.0, Vite 8.1.0. Fresh cloud build with empty Google client ID and release `baseline`. Gzip uses Node `gzipSync`; compare the same method for the final build, not Vite's separately calculated sizes.

Base checks: 82 test files / 667 tests passed, including the new size-script test. The unchanged application/Track 0 suite accounts for 81 files / 666 tests. Cloud TypeScript/build passed; existing >500 kB entry warning recorded.

| Quantity | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| All JS | 931612 | 301913 |
| All CSS | 353613 | 61013 |
| HTML entry JS | 512856 | 162581 |

[Per-chunk report](baseline-chunks.json) contains every asset. The entry metric is not a claim about all deferred signed-in network transfers; the final evidence will state its measured coverage.

Budgets: JS growth ≤10 KiB gzip total, CSS growth ≤2 KiB gzip total, initial signed-in JS growth ≤5 KiB gzip; no new runtime dependencies/fonts/audio/remote assets. One choreography, ≤6 moving decorations, no canvas particles. Input-to-feedback p95 ≤100 ms, no attributable long tasks >50 ms; real Android frame profiling remains human evidence.

Install: locked app dependencies had no reported audit vulnerabilities; the existing API dependency tree reported 16 (3 moderate, 13 high). No audit fixes or dependency updates were performed. Generated API runtime changes from installation are not part of this slice.

Before visuals: existing Linux visual baselines remain the approved reference. No snapshots have been refreshed. Windows runtime/after captures and Docker availability are recorded in the final evidence.
