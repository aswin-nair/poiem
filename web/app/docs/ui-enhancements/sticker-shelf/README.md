# Sticker shelf

Built 13 October 2026, following Little adventures and the request to start the Sticker Shelf.

## Experience

Choose a collected sticker in **Today → Little adventures → Sticker book**, then choose **Pin on Today**. One favorite appears above the collapsed book with a matching Momo comment. Change sticker opens the collection; unpinning keeps the discovery in the book. Clearing the book removes the favorite too.

Only a deliberate pin plays the 500ms sticker stamp and 600ms Momo cheer. Controls and text stay stationary. Reopening Today and updates from another tab never replay the shelf celebration. Calm mode and OS/profile reduced motion disable it. Muted or hidden Momo removes his drawing and commentary while retaining the shelf with neutral text.

Pinning moves keyboard focus to the shelf heading. Changing a sticker focuses the album heading. Unpinning from the shelf returns focus to the book's summary; unpinning within a keepsake leaves the same button focused. If another tab clears a shelf containing focus, focus returns to the summary.

## Persistence

The existing account-scoped version-1 browser collection accepts an optional validated `pinned` field. A pin must refer to an owned sticker with a valid answer. Existing collections remain compatible. The shelf shares the book's reset and account-deletion cleanup; it is local to this browser and is not cloud-synced or included in journal backups.

Readable saved state is authoritative, including clears from another tab. Only explicitly unsaved choices and pin/unpin intentions survive failed writes. Failed pinning keeps the local shelf visible with an honest notice outside the closed book. A later successful action saves pending changes. Stale views cannot resurrect a cleared favorite.

No journal data format, API, AI provider, nutrition domain, or Expo code changed. The existing guest, archived-day, and tracking-pause gates remain in place.

## Verification

- Full unit suite: **1,086 passed across 127 files**, including 28 collection/storage checks.
- Shelf browser scenarios: **all 36 passed across their latest runs**, covering desktop, iPhone 13 and Pixel 7 Chromium emulation. The final targeted layout run passed all three projects.
- Existing Little adventures browser regression suite: **30 passed**.
- Approved Linux Today screenshot comparisons: **10 passed**, covering 320, 390, 768, 1440 and 844×390 landscape in both themes. No approved baseline changed.
- Lint: no errors; 13 existing warnings outside this feature.
- Local production build: passed, including TypeScript compilation.

The first shelf run passed 35 cases; the screenshot loop checked for a pin before the page finished mounting. It now waits for the book summary. The added footer reachability assertion initially used nearest-edge scrolling, then assumed navigation always occupied the bottom edge. It now centers the footer and checks rectangle overlap against either the phone bar or desktop sidebar. The corrected layout checks all pass. These were test corrections; no product CSS change was needed.

Screenshots include actual before/after Today views at 390 and 1440px in both themes, plus 320px shelf and book captures and real touch-device emulation. The collected-sticker captures were copied from the successful existing-flow regression run; the old gallery's historical screenshots were restored afterward. All captures use fictional fixture data. Open [the gallery](gallery.html) to compare them.

The complete unrelated browser suite was not rerun. Physical iOS Safari, actual browser chrome and device haptics remain checks for a real phone. Nothing was pushed or deployed.

## Run the feature checks

From `web/app`:

```powershell
npm run test -- --maxWorkers=2
npx playwright test --config docs/ui-enhancements/sticker-shelf/verification/config.ts --workers=2 --output=.cache/sticker-shelf-results
npx playwright test --config docs/ui-enhancements/little-adventures/verification/config.ts --workers=2 --output=.cache/sticker-shelf-adventures-results
```

Both browser configurations use the isolated local preview on port 5194. They do not use the user's 5173 or 4173 previews. Browser layout tests regenerate documentation screenshots; keep earlier galleries' historical evidence when checking a later feature.
