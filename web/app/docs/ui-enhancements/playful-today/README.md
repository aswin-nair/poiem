# More ways to play on Today

Completed 14 October 2026, following the request to make Poiem more fun and interactive.

## Experience

**Play with Momo** is a collapsed invitation beneath the greeting. Opening it reveals a little theatre with High-five, Make a face and Tiny dance. Each action cycles through three authored jokes and expressions. The performance ends within 900ms; the controls stay in place. Closing playtime returns focus to the invitation and resets the introductory line. Reload, close, unmount and hiding the tab cancel performances.

The playroom follows the existing mascot visibility gates and appears on the signed-in current day. Calm mode and OS/profile reduced motion keep the artwork static. A quiet action cannot begin animating if motion is enabled before its timer expires. Sounds and haptics use the existing preference-aware feedback system.

**Pick for me** in Little adventures offers uncollected challenges before repeats. **Pick another** rotates through the remaining options and focuses the new heading. A complete book allows replay. Suggestions never award a sticker or save a choice; answering remains a separate action.

**Tappable stickers** give pinned favorites a 500ms wiggle and one of three comments for that sticker. The sticker button retains keyboard focus while only its decorative child restarts. Hidden or muted Momo uses neutral comments. Reactions leave the saved collection and journal untouched.

## Implementation

- `MomoPlayroom.tsx`, `momoPlay.ts` and `momo-playroom.css`: local play state, authored lines, finite art-only motion, disclosure and timer cleanup.
- `TodayMomo.tsx` / `HomePage.tsx`: integration with current-day, account and mascot preferences.
- `adventureSuggestions.ts` / `MomoAdventures.tsx`: suggestions and sticker reactions without persistence changes.
- `little-adventures.css`: explicit sticker button geometry and prevention of inherited icon animation.
- The design-system guard includes the new stylesheet and sticker art shadow.

No AI requests or new dependencies are needed for these interactions. The collection's browser-local storage format remains compatible.

## Verification

- Full unit suite: **1,101 passed across 129 files**.
- Interaction scenarios: **all 39 passed across their latest runs** on desktop, iPhone 13 and Pixel 7 Chromium emulation. The full initial 36-case matrix passed; three keyboard-sticker scenarios were then added and passed, and the final layout captures/clearance checks passed on all three layouts.
- Existing adventure and shelf regression matrix: **66 passed**.
- Final Linux visual comparison: **22 passed without snapshot updates**, after reviewing and updating the 16 intentional changes.
- Local build passed, including TypeScript compilation.
- Lint: no errors; 13 existing warnings outside this feature.

Testing found a legacy hover animation on the sticker's SVG icon that bypassed calm/profile still mode. The sticker and playroom now suppress inherited icon animations and own their decorative motion. Tests also distinguish artwork motion from button hover fades, and compare action positions relative to the room so browser scrolling is not mistaken for moving controls.

The Linux visual review found 16 intentional changes: ten Today sizes/themes, two desktop log-sheet backgrounds and four cameo compositions. Their diff images were inspected before selectively updating them. The new closed play invitation adds 56px to the companion column. Phone log-sheet comparisons stayed unchanged. The final comparison passed all 22 cases without snapshot updates, using one worker after the other suites completed.

Before/after Today captures cover 390 and 1440px in both themes. Component captures cover 320px, desktop, iPhone and Pixel layouts. Component close-ups hide fixed navigation during capture; close-control clearance is verified separately. Screenshots use fictional fixture data. Open [the gallery](gallery.html) to review them.

Several browser checks timed out when independent suites ran concurrently and exhausted local resources. The remaining checks were rerun in sequence. The complete unrelated browser suite was not rerun. Physical iOS Safari behavior and actual device haptics remain checks for a real phone. Nothing was pushed or deployed.

## Run the interactions

From `web/app`:

```powershell
npx playwright test --config docs/ui-enhancements/playful-today/verification/config.ts --workers=2 --output=.cache/playful-today-results
```

The isolated local preview uses port 5194. The existing adventure and shelf configurations also use that port. Run those suites sequentially when local resources are constrained. Their capture tests regenerate documentation images; retain older galleries' historical screenshots when checking later changes.
