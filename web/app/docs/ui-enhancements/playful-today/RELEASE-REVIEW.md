# Release review — 14 October 2026

Scope: Momo playroom, sticker interactions, Sticker pairs and the Little Joy Trail; regression coverage for existing logging and account flows.

## Evidence

- 1,101 unit tests passed across 129 files.
- Local release suite covered 40 scenarios: login/sign-up, meal estimation and editing, photo retry, saved-meal sorting/portions, Momo behavior, and journey layouts. One manual-draft recovery case exceeded its 60-second budget during navigation; it passed unchanged in an isolated rerun (33.5 seconds). The other 39 had no recorded failures.
- 28 cloud-client scenarios passed with intercepted fictional responses: account 500/reconnect, queued writes, session expiry, account switching, large-photo preparation, retry, cancellation and EXIF orientation. These do not certify the live backend or actual AI provider.
- Cloud production build passed. Local production build passed during journey implementation; this review adds only tests and documentation. Lint has zero errors and 13 existing warnings.
- All 12 journey route/postcard screenshots inspected: 320, 390 and 1440 pixels, light and dark. No layout correction was needed. Six layout scenarios check minimum 44px controls, overflow, detours, return focus, storage updates and clearing the book.
- Existing implementation evidence includes three phone/desktop journey completion scenarios and six Sticker pairs scenarios.

Open `journey-gallery.html` for the visual review. Fixed navigation is hidden only in component captures. Fixtures are fictional.

## Reproduction

Run from web/app:

```text
npm run test -- --maxWorkers=2
npx playwright test --config docs/ui-enhancements/playful-today/verification/release.config.ts --output=.cache/journey-release --reporter=list
npx playwright test --config docs/ui-enhancements/playful-today/verification/release.config.ts --grep "manual fallback" --output=.cache/journey-fallback-recheck --reporter=list
npx playwright test --config docs/ui-enhancements/account-recovery/verification/cloud.config.ts --project=desktop --output=.cache/journey-cloud-release --reporter=list
npm run build:cloud
```

## Release boundary

CI follow-up: the full Linux browser run on 57a298ed passed 497 of 498 tests. The remaining system reduced-motion case exposed media-query selectors with lower specificity than the fresh sticker/Momo animation selectors. The correction matches their specificity, so the later reduced-motion rules win without weakening the test. All 12 focused desktop/iPhone/Pixel Chromium motion scenarios and eight design-system tests passed locally. The local Docker daemon was unavailable; the pushed CI run must confirm the Linux result.

Physical iPhone Safari/Android device checks, live-service smoke checks and final CI results remain separate release gates. No production deployment was performed by this review. The previous main squash snapshot was verified byte-for-byte against 84e932a4 before reconciling Git history; the reconciliation changed no application files.

Rollback: revert the feature changes through a reviewed commit. The game is transient and journey progress uses the existing sticker collection, so no database migration or new persisted format needs reversing.
