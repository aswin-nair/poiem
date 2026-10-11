# Rendering verification

October 10, 2026 · Implementation `40be9ec3`

## Completed checks

- Units: **990 passed in 118 files**, two workers. Nine new checks cover no-DOM provider markup, separate Momo clip identifiers, changed appearance output and rendering architecture. Static rendering establishes markup, not actual skipped client rerenders.
- Scoped lint: **0 errors, 13 existing warnings** (twelve Fast Refresh exports and one accessibility-test children prop).
- Windows type check and local production build passed. Main JavaScript: **379.45 kB raw / 121.01 kB gzip**. This is one asset, not the total initial download.
- Six new browser cases passed: Today does not request the scoped feature modules after deferred work; Welcome pause/play works; Login's press and shared layout marker work; changing Momo expressions and outfits still render; setup heading focus and both motion preferences are preserved.
- **57/57** focused existing account, setup, Coach, motion, mascot and synthetic screen-edge cases passed in a separate batch with two workers and no retries.
- Canonical visuals: **63/63 passed** in the pinned Linux image, one worker and no retries. All baselines and the 200-pixel tolerance remained unchanged.
- **24/24** meal-feedback, phone and production-route cases passed in another batch with two workers and no retries: eight Chromium meal moments, six iPhone 13 viewport cases, six Pixel 7 viewport cases and four production cases. Phone cases cover core routes and You categories in both themes, landscape, and Manual/Coach inputs at a synthetic keyboard height. Both device projects use Chromium; this is not physical iOS Safari or Android certification.
- Final gallery: **24 pairs / 48 PNGs**, all pairs byte-identical. All captures have zero page errors and horizontal overflow, and source identity is rechecked after capture. The [independent viewer check](gallery-check.json) decodes all images, exercises four keyboard controls, and reports zero overflow at 320, 390 and 1440px. [Structured results](results.json) retain evidence hashes and the distinct failed timing gate.

The [regression tests](../../../../e2e/motion-loading.spec.ts) identify module requests in the local development server. Production asset footprints are measured separately by the [performance comparison](../performance/README.md).

## Reproduce

From `web/app`, using existing locked dependencies and Node 24+ (recorded runtime 24.14.1; capture helpers import TypeScript directly):

```text
npm run test -- --maxWorkers=2
npm run lint -- --ignore-path .gitignore --ignore-pattern '.cache/**' --ignore-pattern 'artifacts/**' --threads=2
npm run build:local
npx playwright test e2e/motion-loading.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --workers=2
npx playwright test e2e/auth.spec.ts e2e/coach-drafting.spec.ts e2e/coach-recovery.spec.ts e2e/mascot-motion.spec.ts e2e/motion-rules.spec.ts e2e/onboarding-ui.spec.ts e2e/onboarding.spec.ts e2e/safe-area-momo.spec.ts e2e/safe-areas.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --workers=2
npx playwright test e2e/log-moment.spec.ts e2e/mobile-ux.spec.ts e2e/production.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --project=mobile --project=mobile-pixel --project=production --workers=2
```

Canonical screenshots use the pinned `mcr.microsoft.com/playwright:v1.61.1-noble` image, installed Linux dependency volume, local backend, one worker and no retries. No baseline or tolerance change is intended by this pass.

The 57-case integration batch covers `auth`, first-session setup, Coach, motion, mascot and safe-area browser suites. These independent batches are reported separately; they are not one exhaustive end-to-end release run.

## Gallery history

The first gallery run captured all 48 product PNGs with zero page errors and zero horizontal overflow. Its report page then failed the 320px check with 27px overflow from the View select. An independent check reproduced that report-only issue. The gallery helper now constrains native selects inside a shrinking grid column. [Original manifest](gallery-first-attempt.json) and [first check](gallery-check-first-attempt.json) preserve that failure. Its inherited `coach-desktop-dark` failure label describes the last capture; the actual failed step was gallery validation, not Coach.

The second complete capture fixed that overflow, then failed exact keyboard label lookup because the wrapped labels included the options' text. The [second manifest](gallery-second-attempt.json) and [independent check](gallery-check-second-attempt.json) preserve that result. Explicit names now identify Screen, View and Theme; an independent check passed all four keyboard controls and all 48 image decodes at 320, 390 and 1440px. The final full capture uses that repaired report helper and rechecks source identity after capturing.

Reproduce the gallery separately from timing work, from `web/app`, with the sources at the labelled revisions and no concurrent source edits or builds:

```text
node docs/ui-enhancements/response-time/capture.mjs
node docs/ui-enhancements/response-time/verification/gallery-check.mjs
```

The helper exports the baseline if absent, reuses existing locked dependencies, checks tracked app/shared/package/asset inputs against each revision, and uses only its isolated development previews on 5297/5197. It closes those previews after capture. These settled screenshots do not measure performance or prove motion fidelity.

The first baseline build preparation omitted shared TypeScript inputs and then the existing Vercel rewrite file. Those builds stopped before an application artifact was produced. The exact inputs were added from `131bd0d7`; the final baseline and candidate Windows builds passed with matching configuration. An early candidate build preceded the explicit empty Google setting; it was replaced with the matching build before any controlled measurement. The final requested build hashes and source hashes are retained in the performance evidence.

This follow-up does not close the earlier [intermittent Pixel and other-engine loading failures](../../safe-areas/verification/README.md). Physical iOS/Android behavior, assistive technology, participant evidence, field performance and real cloud durability remain separate release work. No push or deployment is included.
