# Little adventures

Built 13 October 2026 in response to the choice **Personal challenges and collections**.

## Experience

Today has a collapsed, optional panel beneath the existing companion and daily ring. Six sensory and comfort prompts each offer three self-reported choices and a collectible sticker. A completed challenge shows the chosen answer and a short Momo line; the sticker book supports revisiting, replaying, and clearing with a cancel step. There are no calorie, weight, food quantity, deadline, streak, or randomized reward conditions.

The account-scoped collection is local to this browser, explicitly described in the panel. It is not cloud-synced or included in journal backups. Storage failures retain the current page's collection and display an honest warning. Other tabs update the collection without interrupting a challenge. Account deletion includes collection cleanup. No API, AI provider, nutrition domain, or journal data format changed.

Hidden or muted Momo removes his drawing and commentary while leaving the user's collection accessible. Tracking pause, guest mode, and archived journal days omit the panel. OS reduced motion, the profile's motion setting, and calm Momo mode disable the new animation. Otherwise the sticker stamp lasts 500ms and the Momo cheer 600ms; neither loops or moves a control.

## Implementation

- `src/lib/momoAdventures.ts`: reviewed catalog, validation, account-scoped storage, merging, cleanup.
- `src/components/MomoAdventures.tsx`: optional disclosure, challenge flow, album, replay and reset, focus handoff, preference-aware reactions.
- `src/styles/screens/little-adventures.css`: mobile-first token-based styles, stationary 44px controls, short decorative motion.
- `HomePage.tsx`: companion integration. `SettingsPage.tsx`: account-deletion cleanup.

## Verification

- Final full unit suite: 1,071 checks passed across 127 files.
- Focused collection, Today, and design-system checks initially passed 27 cases; five more persistence regressions were subsequently added and pass in the final suite.
- Lint: no errors; 13 existing warnings outside the new feature.
- Local build: passed.
- Final browser matrix: 30 passed across desktop, iPhone 13 and Pixel 7 Chromium emulation. The saved run status reports success with no failed cases.
- After the final storage fix: all nine affected browser cases passed across the three layouts (six collect/replay/reset/cross-tab cases, then three storage-recovery cases).
- Pinned Linux visual comparison: 22 passed without snapshot updates on the final check. Sixteen reviewed baselines changed: ten Today sizes/themes, two desktop log-sheet backgrounds, and four Momo cameos affected by the companion panel's added height. Six log-sheet baselines stayed identical.

The first browser run had 21 passing checks and three failures in the new test's assumption that journal data still lived in ordinary local storage. The app migrates it to durable storage. The assertion now checks that the visible meal journal remains unchanged; the collection itself is checked at its own storage key.

Final review found a stale-tab edge case that could restore cleared stickers. Readable persisted state is now authoritative; only explicitly unsaved picks are carried forward. Five helper regressions cover clearing, blocked writes, read failures, and recovery. The expanded storage-recovery browser assertion initially searched only visible status nodes after the notice had correctly become empty and hidden. Including the hidden node fixed the assertion; all three recovery cases then passed.

Run the feature matrix with:

```powershell
npx playwright test --config docs/ui-enhancements/little-adventures/verification/config.ts --workers 2 --output .cache/little-adventures-final-results
```

The isolated preview uses port 5194. It does not use the user's 5173/4173 previews. Evidence includes 390px and 1440px before/after in both themes, 320px layout captures, and iPhone 13 / Pixel 7 Chromium emulation. Screenshots use fictional fixture data. The gallery displays screen captures. Canonical baselines were separately compared, reviewed, selectively updated, and rechecked using the installed `mcr.microsoft.com/playwright:v1.61.1-noble` runtime. The complete unrelated browser suite was not rerun.

Physical iOS Safari behavior and device haptics remain checks for a real phone. Nothing has been pushed or deployed.
