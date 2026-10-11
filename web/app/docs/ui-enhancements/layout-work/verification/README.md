# Interaction layout verification

11 October 2026 · Implementation `bc85116f`

## Checks

- **994 unit checks passed in 119 files**, two workers. Four new architecture guards cover immutable/date inputs, cap invalidation, receipt fallback and shared Momo safety observation. Source guards do not measure speed or prove skipped client renders.
- Scoped lint: zero errors; thirteen existing warnings.
- Type check and local production build passed. The final controlled comparison builds both revisions afresh on Windows with local backend and empty Google client ID, after the canonical visual run. Candidate main JavaScript is 379.51 kB raw / 121.29 kB gzip; this is one asset, not the initial download total.
- Four new browser checks passed in a one-worker, 17-case Momo/layout batch: Coach grows/shrinks and changes its height cap; Momo steps aside for the real log dialog; one mutation burst with speech mounted produces one obstacle scan; an absent floating host does not continuously retry placement. All thirteen existing Momo interlude cases passed in that batch, including mute/reload and calm/session limits.
- **68/68 combined browser cases passed**, two workers, no retries: 52 Chromium Today/Coach/meal/Momo/synthetic-inset cases, six iPhone 13 emulation cases, six Pixel 7 emulation cases and four production-route cases. Phone coverage includes core routes and You panels in both themes, landscape, and Manual/Coach inputs at synthetic keyboard height. Both phone projects use Chromium. [Final integration log](integration-final.log).
- **63/63 canonical visual cases passed** on the corrected source, one worker, no retries, pinned Linux image. No baseline or 200-pixel tolerance changed. [Final visual log](canonical-final.log).
- Gallery: **16 pairs / 32 PNGs**, every pair byte-identical, zero page errors and zero horizontal overflow. The [independent viewer check](gallery-check.json) decodes all images, exercises four keyboard controls and confirms zero overflow at 320, 390 and 1440px. Representative Today, Coach and desktop Momo captures were visually reviewed. The Momo fixture pokes the real character and waits for its optional speech node; geometry may keep that speech hidden. The gallery does not claim a visible speech bubble or animation fidelity.
- The [structured results](results.json) bind the gallery hashes, retained logs and one controlled measurement attempt. All 140 measured actions completed without functional errors, but both sources failed all seven timing budgets. Those failures remain open.

## Fixture history

The initial implementation `1f5010d2` passed 49 cases in the broader browser batch but timed out on the two existing long-clock Momo cases. Both timed out again in an isolated, one-worker run with traces enabled. The exact baseline `84d0cf1e` passed both unchanged fixtures in 9.7 seconds. The merged safety check was scheduling a new frame after trying to move an absent host; `place()` could not update that missing host's position. The correction in `bc85116f` requires a mounted host before retrying placement. The original time limits and assertions are unchanged. The 17-case rerun passed, with mute/reload at 3.2 seconds and calm/session limits at 2.3 seconds. [Timer regression evidence](timer-regression.json) records the separate runs; this was a product regression, not merely a slow-host assumption.

The first focused run had 24 passes and two failures in the new fixtures. The logging selector matched both the desktop navigation button and hero button; it now scopes to Main navigation. The Coach fixture confirmed the new cap, then expected desktop window resizing to automatically reveal a still-focused textarea that was below the window. It now explicitly scrolls the focused control into view before checking reachability. This tests supported scrolling and cap behavior; it does not establish phone keyboard auto-reveal. Product source did not change between those runs.

The original results remain in local `.cache/layout-work-focused.log` and failure images. This history is not silently treated as a green first run. The final integrated batch uses the corrected fixtures and the saved source.

The first gallery attempt captured Today and Coach pairs, then failed before the baseline receipt save: the exact `Food name` lookup omitted the label's `Required` suffix. The [retained manifest](gallery-first-attempt.json) and [failure screenshot](gallery-first-failure.png) show a loaded Manual screen. The helper now uses the same label prefix as the existing meal tests; no product source changed for that repair.

The second gallery attempt reached baseline desktop Momo, then timed out waiting for speech after poking the host. [Retained manifest](gallery-second-attempt.json) and [failure screenshot](gallery-second-failure.png) preserve the loaded Today screen. The cause was not established. The helper now waits for Calories, fonts/layout and initial effects before the real poke; this does not force speech visibility or change the product.

## Reproduce

Use Node 24+ (recorded 24.14.1) and existing locked dependencies. From `web/app`:

```text
npm run test -- --maxWorkers=2
npm run lint -- --ignore-path .gitignore --ignore-pattern .cache/** --ignore-pattern artifacts/** --threads=2
npm run build:local
npx playwright test e2e/layout-work.spec.ts e2e/mascot-motion.spec.ts e2e/coach-drafting.spec.ts e2e/home.spec.ts e2e/log-moment.spec.ts e2e/momo-interlude.spec.ts e2e/safe-area-momo.spec.ts e2e/coach-recovery.spec.ts e2e/mobile-ux.spec.ts e2e/production.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --project=mobile --project=mobile-pixel --project=production --workers=2 --retries=0
node docs/ui-enhancements/layout-work/capture.mjs --candidate bc85116f
node docs/ui-enhancements/layout-work/verification/gallery-check.mjs
```

Canonical visuals use the existing Linux dependency volume and pinned `mcr.microsoft.com/playwright:v1.61.1-noble` image, one worker, no retries, and unchanged baselines/tolerance. The gallery uses isolated local development previews 5297/5197, source/hash verification before and after capture, blocked APIs/external requests and reduced motion. Its phone labels describe CSS viewports. The separate phone suite uses Chromium touch/device emulation, which does not certify iOS Safari or Android hardware.

The [earlier engine/loading failures](../../safe-areas/verification/README.md) remain unclosed. Browser passing batches, static appearance and timing results are separate evidence; none closes all release gates.
