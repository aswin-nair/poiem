# Poiem visual reset — phase 2 review pack

Phase 1 approved Today and the shared foundations. Phase 2 puts the rest of the app on the same shell and takes the raised chrome off it. The ink-and-acid identity is unchanged: the same palette, the same condensed titles, the same one bright moment per screen.

## What landed

- **One shell.** Insights, Saved, You, Coach, Support and About render inside `AppShell` instead of each building its own `div.app-shell` with its own `BottomNav`. Column width, page padding and navigation are now decided in one file. `AppShell` marks itself `has-nav` when it is given navigation, so a shell without one centres on 52rem rather than claiming the full workspace.
- **A desktop composition.** From 1120px the shell is three columns: the 220px nav rail, the workspace up to 1200px, and an empty 112px lane. The bottom nav becomes a plain sticky rail in the first column — no bar, no border, each icon beside its label, and the + still in its place in the middle of the list. The empty third column is Momo's: without it he has nowhere to stand beside a full-width page, so he hides instead of waiting.
- **Flatter chrome.** Hard offset shadows across `src/styles` fall from **90 to 46**, and `2px solid var(--k-line)` borders from **161 to 71**, mostly replaced by `1px solid var(--k-hair-strong)`. `PressableButton` and `.k-card` lose their shadow, `.k-card` takes `--k-pad-panel`, and `.k-section-head` titles become 18px sentence-case body type instead of condensed caps. Press still nudges the face 2px; there is simply no shadow left to drop.
- **Quieter headers.** The Insights stamp ("YOUR ROUTINE. NOT A REPORT CARD."), the You stamp ("MADE A LITTLE MORE YOU.") and the mascot marks in the Insights, You and log-flow headers are gone. Momo keeps the places where he is doing something: greeting on Today, leading Coach and About, and bopping while the AI reads a meal.
- **No resting tilt.** Resting rotations fall from **67 to 43**. What is left is interaction (disclosure and history chevrons), 45-degree shape construction (the unsaved-changes diamond), keyframes, or the poster surfaces this reset has not reached — welcome, the account screens and the first run.
- **Something to do with the width.** A wide shell is only an improvement if each screen uses it. Insights pairs its cards into two columns from 768px; Saved puts the saved and recent collections side by side and lays the filters out as an even grid (three across, six from 768px); You and the prose screens cap their measure at 880px, because settings rows and paragraphs get harder to read as they get wider, not easier.
- **Saved structure.** The saved and recent collections became labelled regions instead of anonymous `div`s, so they can be reached directly.

## Contact sheet

Open [`contact-sheet.html`](phase-2/contact-sheet.html), or rebuild it with `npm run visual:sheet -- 2`.

Both sides come from `e2e/visual-matrix.spec.ts` run inside `mcr.microsoft.com/playwright:v1.61.1-noble`, from the same signed-up account and the same onboarding meal. Before is `origin/main` at `c14309f5` (phase 1 merged); after is this branch. Seven surfaces at 390 and 1440, light and dark.

Two differences in those images are not design changes. The matrix does not freeze the clock the way the visual project does, so the log sheet defaults to whichever meal the container's UTC hour suggests — the before pair reads "Lunch", the after pair "Snack" — and Momo's steam is whatever mood he happened to be in. Everything else on a pair is the change under review.

| Surface | What to look at |
|---------|-----------------|
| Today | Unchanged on a phone. At 1440 the nav is a rail and Momo has a lane |
| Log sheet | Hairlines instead of 2px boxes, the method tiles flat with upright icons, and quick-add as a solid acid square |
| Describe / Manual | A header without Momo, flat cards, and the acid total still the one bright card |
| Saved | Filter chips and cards keep their geometry, lose their shadow and tilt |
| Insights | Header without the stamp or the pink Momo; charts unchanged |
| You | Header without the stamp or the mascot mark; section titles in sentence-case body type instead of tinted tilted tags; fields beside their labels |

## One thing to decide

Flattening You's daily-goal cards removed their macro colour caps — the `inset 0 6px 0 var(--tone)` that gave protein, carbs and fat the same colours they wear on Today. Calories are still on acid; the other three are now plain sunken tiles. Today, the log flows and the first run all still cap their macro fields, so You is the one screen that drops the motif.

That leaves the six `--tone` declarations on You's sections and goal cards set but never read. Either the caps come back and the tokens do their job again, or the motif goes everywhere and those lines get deleted. Worth an explicit answer rather than a silent divergence; nothing else in this pack depends on it.

## What did not change

- **Today's phone pixels.** The committed baselines for `today-320`, `today-390` and `today-768` are byte-identical; only `today-1440` moved, because of the rail. `/dev/components` moved with the flattening.
- **Copy, data and behaviour.** No route, store, API or domain change. Nothing about what is logged or how it is stored.
- **Legacy selectors.** Nothing was pruned or deleted. The `legacy` layer is exactly as it was.

## Test results

- `npm test`: **79 files, 652 tests passed**.
- `npm run lint`: existing warnings only, no new ones.
- `npm run build:local`: clean.
- `npx playwright test --project=chromium` inside `mcr.microsoft.com/playwright:v1.61.1-noble`, one worker like CI: **107 passed** in 17.5 minutes. Also green on the host and in the `production` project.
- `npm run visual` inside the container: **17 passed**. Ten baselines were updated by hand — the two `today-1440` images and the eight reference images — never automatically.

### One failure worth naming

`swipe-row.spec.ts` failed on CI while passing on Windows. The single meal row sat at the very bottom of a 420×900 viewport with the tab bar over its lower half, and `scrollIntoViewIfNeeded` treats a partly covered row as already in view, so the page never scrolled and the drag landed on the bar. Reproduced in the container, fixed by centring the row and asserting that it clears the bar. The product was never wrong here; the test's scroll was.

## Deferred to phases 3–5

- Legacy selector removal per screen, and the `legacy` layer itself (phase 3).
- The design-rule contract still only covers `fonts.css`, `foundations.css` and `today.css`, so nothing stops these sheets drifting back. Two things have to happen together: add them to `MIGRATED`, and teach the type check to read rem, which it currently skips. `today.css` sets no type in rem at all; the sheets this phase reworked still hold literal rem sizes such as `1.875rem` and `clamp(3.5rem, 16vw, 4.5rem)` — 8 in `insights.css`, 5 in `you.css`, 12 in `flows.css`, 4 in `pages.css`, 2 in `kitchen.css` and 44 in `admin.css` (phase 3).
- The log flows and the first run still hand-roll `div.app-shell` (phase 3).
- Pixel baselines still cover only Today and `/dev/components`; the screens in this pack are captured for review, not enforced (phase 5).
- Momo still roams inside a 480px band centred in the viewport (`APP_STAGE_MAX_WIDTH` in `mascot/controller.ts`). At 1440 that band lies entirely inside the column he is told to avoid, so he rests in his new lane and never walks. The same 480px assumption is the `--k-shell` leftover phase 1 deferred (phase 4).
- Motion polish and staging sign-off (phase 5).
