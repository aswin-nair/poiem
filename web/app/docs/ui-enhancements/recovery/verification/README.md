# Local verification

October 10, 2026 · Source candidate `04552501`

[Results](results.json) and the [delivery report](../README.md) record final outcomes, earlier failures and rechecks. The count of one run is not an aggregate release pass. Units, lint and the final Windows production build passed. The pinned Linux visual pass passed all 63 comparisons with the existing 200-pixel tolerance. Phone and production coverage passed all 16 cases; final route/focus checks passed all 23.

## Reproduce client checks

From `web/app`, use the existing locked dependencies:

```powershell
npm run test -- --maxWorkers=2
npm run lint -- --ignore-path .gitignore --ignore-pattern '.cache/**' --ignore-pattern 'artifacts/**' --threads=2
$env:VITE_GOOGLE_CLIENT_ID=''
npm run build:local
npx playwright test --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --workers=2
npx playwright test --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=mobile --project=mobile-pixel --project=production --workers=1
```

The [local configuration](local.config.ts) mirrors the isolated configuration used during development: ports 5194 and 4194, local backend and no Google client ID. The user's existing 5173 and 4173 servers are left alone. The final build must exist before production tests. Local Windows browser/temp-cache processes required the tool's approved sandbox exception; a permission failure before tests start is distinct from a product failure.

## Pinned comparison and other engines

Canonical screenshots use `mcr.microsoft.com/playwright:v1.61.1-noble`, the exact locked Linux dependencies and local backend. Run the existing `visual` project in that environment after building. Review actual/expected/diff images before updating a deliberate baseline; do not increase the tolerance to hide a difference.

The [focused engine configuration](engines.config.ts) selects backup review, Settings departure, sheet readiness, direct-link/download recovery and navigation on Firefox and WebKit. It uses port 5196, two workers and no retries. Run from `web/app` inside the same pinned image:

```sh
npx playwright test --config=docs/ui-enhancements/recovery/verification/engines.config.ts --output=.cache/m5-engines
```

This focused desktop-engine coverage is separate from physical Safari/Chrome, native camera/keyboard/selection/clipboard behavior, screen readers, full browser journeys and real cloud staging. Synthetic sync fixtures establish presentation only. See the [acceptance checklist](../../E2E-CHECKLIST.md) for the remaining release conditions.
