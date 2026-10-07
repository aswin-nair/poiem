# Motion and Return: Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the signed-in daily app feel alive and give people one small, honest reason to come back, in a first vertical slice: exact action receipts, one coalesced non-modal log payoff, the Day ring and one progress note on Today, immediate sheet/FAB response, a coherent press vocabulary, and the evidence to judge it.

**Architecture:** A logging action produces a small receipt (entry id plus how many award keys existed before it). A pure planner turns the receipt and the after-state into one feedback plan (what kind of moment, how long it may move, which single cue, which awards and wardrobe pieces to show, whether the ring just closed). Today renders that plan as a non-modal "moment" card or a toast, replacing the automatic modal chain (celebration dialog, level-up dialog, confetti canvas). The Day ring returns to Today as a flat section carrying one progress note. Press, sheet, route and meter motion move onto the existing tokens and presets, animating only transform and opacity.

**Tech Stack:** React 19, Vite, vitest, Playwright, `motion/react` presets in `src/lib/motionPresets.ts`, the feel layer in `src/lib/feel.ts`, `@fud-ai/product` (`dayRing`, `wardrobe`, `enamelAwards`).

**Spec:** `docs/MOTION_AND_RETURN_STRATEGY.md` (the Phase A strategy, committed in Task 0; read sections 2 to 8). This plan applies the founder's approved revision decisions below, and where the two differ, this plan governs.

## Approved decisions this plan applies

1. Track 0 (safety and correctness) is its own PR and is done on branch `poiem-motion-safety`. This branch is stacked on it.
2. This slice is B1 to B4 plus ONE piece of B6 (the single progress note), at fixed Standard behaviour. PAUSED until the founder has lived with the slice: B5 (milestone and staged wardrobe moments), the rest of B6 (Momo greeting cooldown, return-after-break, same-day reopen, evening "tomorrow" seed), B7 (intensity control and reminder controls), the three return hooks (weekly recap, outfit of the day, "yesterday's plate"), and any remote telemetry.
3. Acceptance is a dogfood protocol, not population retention. No retention claim may be made from this slice.
4. Lively must later be richer than Standard (specified in the strategy revision; the control itself is paused B7).
5. Persistence is specified here and kept minimal (see the table below).
6. Branch `poiem-motion-return`, based on `poiem-motion-safety`; rebase onto `origin/main` once Track 0 merges and re-verify every file anchor.

## Decisions to confirm before execution (the founder reviews these with the plan)

- **D1. Day ring placement.** A flat outlined section ("Your day") directly under Momo's note in Today's summary column, above the calorie hero, carrying the ring, its legend and the one progress note. Not a second hero and not another acid card. Hidden while tracking is paused. This changes Today's resting layout, so the Today visual baselines change (Task 4 and Task 8).
- **D2. Where the "ring closed today" acknowledgement lives.** Device-local (`localStorage` key `poiem-ring-ack-v1`, value a local `YYYY-MM-DD`), cleared with account deletion and data reset like the notification log. The alternative, a synced field on `gamification`, requires changing the strict server contract (`web/shared/appStateContract.ts` rejects unknown gamification fields) and a migration. The cost of device-local: another device may show the ring flourish once more.
- **D3. First-meal rule.** "First ever" means Momo's first piece (`FIRST_PIECE`, `blossom`) has not been owned yet and the entry is the only entry (or the onboarding first-meal journey flag is set). Owning the piece is already a durable, never-taken-back record, so no new field is needed and deleting entries cannot restart the show.
- **D4. Moment card, not a toast, for the special logs.** First meal, a new wardrobe piece, a streak-milestone award and the ring closing show a small non-modal card in Today's summary column (Undo available for the existing ten seconds, pauses on hover and focus, never takes focus). Every other log keeps the toast with Undo. Level-ups become one line in the same card (or a toast when there was no log).
- **D5. Dogfood diagnostics.** The slice records no new data. The protocol uses a participant diary and the existing local analytics buffer (newest 200 events) read by the participant. A bounded local day-summary store is specified in the persistence table as PAUSED.
- **D6. Visual baselines.** Only the Docker `visual` project can refresh baselines (Linux). If Docker is unavailable, Task 8 records the baselines as pending and the founder must refresh them before CI's visual job can pass.

## Persistence (every new stored value, slice or paused)

| Value | Type and default | Where | In the slice? | Notes |
|---|---|---|---|---|
| `poiem-ring-ack-v1` | local day key string, absent by default | `localStorage`, device only | Yes (D2) | No migration. Not exported, not synced, not carried by guest claim. Cleared on account deletion and data reset (same hook point as `clearNotificationHistory`). Add to `docs/data/local-data-inventory.md` and `docs/data/retention-schedule.md`. Tested. |
| Award-key count in the log receipt | integer in router `state` only | navigation state, not stored | Yes | Never persisted. |
| First-meal acknowledgement | none | n/a | No | Reuses ownership of `FIRST_PIECE` (D3). |
| Milestone acknowledgements | none | n/a | Paused (B5) | |
| Visit-day metadata, whole-app intensity, reminder preferences, recap and outfit-of-the-day acknowledgements | various | various | Paused (B6, B7, hooks) | Specified when those items are planned; each will need the contract, migration, backup and retention updates. |
| Local day-summary diagnostics store | bounded array | device only | Paused (D5) | Needs consent UI and retention rules first. |

## Global Constraints

- Celebrate logging, never restriction: no praise, confetti or reward for eating less, a deficit, skipped meals or weight change. Over-target stays a neutral factual state. The ring, the progress note and every feedback line are independent of calories, macros and targets.
- No loss framing, countdowns, missed-day prompts or pressure after a break. Breaks never reset logged-day milestones.
- No random or variable-odds rewards, no new currency, points, leaderboards or badge layers. Every eligible reward is still granted; presentation priority never changes eligibility, amounts, ownership or odds.
- Motion never blocks input or delays saving. One foreground choreography at a time; at most six moving decorative elements; no canvas particles.
- Presentation durations: first log of the day and ring close at most 480 ms; first meal ever and a wardrobe piece at most 720 ms; the second log of a local day at most 240 ms; the third and later at most 120 ms or static. The repeat cap overrides every coincident reward. One cue per accepted action, never one per award.
- Only `transform` and `opacity` animate. Meters stop transitioning `width`. No SVG stroke, path or dash tweening, no animated height, border, blur, shadow or chart path.
- Honour OS `prefers-reduced-motion` (no decorative motion, no count-up, no smooth auto-scroll), the saved Sound and Haptics toggles through the feel layer, Hide and Mute Momo, and the Reduce Momo motion setting. Final text is available immediately and announced once, politely.
- CSS follows `web/app/DESIGN.md` and `src/lib/designSystem.test.ts`: tokens only, nothing raised at rest, no resting rotation, approved type steps and spacing, no ID selectors or `!important` outside `a11y.css`.
- Budgets, against a fresh base build from this branch's first commit (Task 0): added gzip JavaScript at most 10 KiB in total, added gzip CSS at most 2 KiB, at most 5 KiB extra on the initial signed-in route; zero new dependencies, fonts, audio files or remote assets.
- Do not touch the public entry (`src/public`, `public.html`) or the welcome page. Do not add a synced field, change `appStateContract.ts`, or touch Android, iOS or the Expo app.
- Do not push, open a PR or touch GitHub. Commit locally on `poiem-motion-return`. Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Tests that already pin behaviour and must stay green (updating the ones that pin the retired modals is part of Task 3): `designSystem.test.ts`, `todayUi.test.tsx`, `feel.test.ts`, the e2e specs `home`, `onboarding`, `onboarding-ui`, `navigation`, `mascot-motion`, `tap-targets`, `swipe-row`, `ui-consistency`, `feel-preferences`. The `visual` Playwright project is Linux-only (see D6).
- TypeScript flags in `web/app/tsconfig.app.json`: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`. Style: single quotes, no semicolons. Commands run from `web/app` unless stated. Ports 5173 and 4173 may be held by other sessions: check first, never kill a process you did not start, and never run Playwright against a foreign server.

## Review Focus

1. A second or third log of the day that coincides with a new wardrobe piece, a streak milestone or the ring closing: every reward is still granted and listed, motion stays within the repeat cap, and exactly one cue plays. (Tasks 1 and 3)
2. Rapid double activation of Manual Save, a Saved relog or a sheet quick-add creates exactly one entry and one feedback. (Task 2)
3. Undo then re-log, refresh, back and forward, and hydration never replay the first-meal, ring or wardrobe feedback; deleting the only entry does not restart the first-run show. (Tasks 1, 3 and 4)
4. Paused tracking: no ring, no progress note, no moment card, no automatic Momo reaction; a permitted save gets a factual toast and Undo only. (Tasks 3, 4 and 5)
5. Reduced motion, Hide Momo and Mute Momo: no moving decorative elements, settled states, the same feedback text announced once. (Tasks 3, 4, 6 and 7)
6. Over-target and macro-heavy days: the ring, progress note, feedback plan and Momo are identical to an under-target day with the same logging context. (Tasks 1, 4 and 5)

---

### Task 0: Branch, spec and baselines

**Files:**
- Create: `docs/motion/baseline.md`, `web/app/scripts/chunk-sizes.mjs`
- Modify: none (the strategy doc `docs/MOTION_AND_RETURN_STRATEGY.md` is already copied into the worktree; commit it here)

**Interfaces:**
- Produces: `node scripts/chunk-sizes.mjs [distDir]` prints a table of every `dist/assets/*.js` and `*.css` file with raw and gzip bytes, plus totals for JS and CSS and the entry chunk, as JSON when given `--json`. Task 8 re-runs it and compares.

- [ ] **Step 1: Install and check the base.** In `web` run `node scripts/install-with-domain.mjs`. Confirm `npm --prefix web/app test` passes (baseline after Track 0 is 81 files / 666 tests) and note the number.
- [ ] **Step 2: Write `scripts/chunk-sizes.mjs`** (node only, `zlib.gzipSync`, no dependencies). Test it with a tiny vitest that builds a temp dist folder with two fake assets and asserts the totals and gzip sizes are computed.
- [ ] **Step 3: Capture the baseline.** `VITE_GOOGLE_CLIENT_ID= npm run build:cloud` with `VERCEL_GIT_COMMIT_SHA=baseline`, then `node scripts/chunk-sizes.mjs --json`. Record the table, the git commit, the date and the machine in `docs/motion/baseline.md`, along with the budget lines from Global Constraints.
- [ ] **Step 4: Commit** the strategy doc, the script, its test and the baseline note: `docs: motion strategy, size script and the pre-slice baseline`.

---

### Task 1: Log receipts and the feedback planner (pure logic)

**Files:**
- Create: `web/app/src/lib/logReceipt.ts`, `web/app/src/lib/logFeedbackPlan.ts`, `web/app/src/lib/dayRingEntries.ts`
- Modify: `web/app/src/mascot/MascotOverlay.tsx` (use the shared ring-entry mapper instead of its inline mapping)
- Test: `web/app/src/lib/logReceipt.test.ts`, `web/app/src/lib/logFeedbackPlan.test.ts`, `web/app/src/lib/dayRingEntries.test.ts`

**Interfaces:**
- Produces, `logReceipt.ts`:
  `export interface LogReceipt { id: string; calories: number; name: string; awardedFrom: number }`
  `export function makeLogReceipt(entry: { id: string; calories: number; name: string }, awardedKeysBefore: number): LogReceipt`
  `export function awardsSince(receipt: LogReceipt, gamification: Pick<GamificationState, 'awardedKeys' | 'xpEvents'>): XpEvent[]` — the keys appended after `awardedFrom` (`awardedKeys.slice(awardedFrom)`; an `awardedFrom` larger than the array yields none), mapped to the matching `xpEvents` by `key`. No timestamps are used anywhere.
- Produces, `dayRingEntries.ts`: `export function dayRingEntries(entries: readonly FoodEntry[]): DayRingEntry[]` — the mapping `MascotOverlay` already does from `FoodEntry` (meal type, source to `DayRingSource`, `detailAdded`). Extract it unchanged; `MascotOverlay` and the new code both call it.
- Produces, `logFeedbackPlan.ts`:
  `export type FeedbackKind = 'first-meal' | 'wardrobe' | 'milestone' | 'ring' | 'first-of-day' | 'ordinary' | 'quiet'`
  `export type FeedbackTier = 'full' | 'second' | 'repeat'`
  `export interface LogFeedbackPlan { kind: FeedbackKind; tier: FeedbackTier; headline: string; detail?: string; announcement: string; awards: XpEvent[]; pieces: WardrobePiece[]; cue: SoundCue | null; mascotEvent: 'log_success' | 'milestone' | null; maxMotionMs: 0 | 120 | 240 | 480 | 720; ringClosed: boolean; levelUp: number | null }`
  `export function planLogFeedback(input: { receipt: LogReceipt; entries: readonly FoodEntry[]; gamification: GamificationState; newPieces: readonly WardrobePiece[]; firstMealJourney: boolean; paused: boolean; ring: { before: DayRingProgress; after: DayRingProgress }; ringAckedToday: boolean; now: Date }): LogFeedbackPlan`

Rules the planner must implement (these are the spec for the tests):
- Tier is by the number of entries on `now`'s local day, counting the receipt's entry: 1 is `full`, 2 is `second`, 3 or more is `repeat`.
- First-ever: `firstMeal = !gamification.ownedCosmeticIds.includes(FIRST_PIECE) && (firstMealJourney || entries.filter(e => e.id !== receipt.id).length === 0)`.
- Priority: first-meal, then wardrobe (`newPieces.length > 0`), then milestone (an award whose key starts with `streak-`), then ring (`ringClosed`), then first-of-day (tier `full`), then ordinary. All `awards` and `pieces` are always returned regardless of kind.
- `ringClosed` is true only when `ring.before.complete` is false, `ring.after.complete` is true, and `ringAckedToday` is false.
- `maxMotionMs`: tier `repeat` is 120; tier `second` is 240; tier `full` is 720 for first-meal or wardrobe and 480 for every other kind; `quiet` is 0. The repeat and second caps override the kind.
- One cue, by tier first: tier `second` is `'select'` and tier `repeat` is `'tap'`, whatever the kind. At tier `full`: first-meal, wardrobe, ring and first-of-day are `'log-confirm'`; milestone is `'badge'` (it replaces the confirm rather than stacking on it). `quiet` is `'tap'`.
- First-piece handover: when `firstMeal` is true the planner puts `wardrobePiece(FIRST_PIECE)` first in `pieces`, ahead of `newPieces`, so the caller claims `plan.pieces` and nothing else. Kind `wardrobe` is chosen only when `newPieces` (which excludes the handover) is non-empty and the entry is not the first meal.
- `mascotEvent`: `'milestone'` when `pieces.length > 0` or the kind is milestone; `'log_success'` for ring and first-of-day; `null` at tiers `second` and `repeat` and for `quiet`.
- `paused` yields kind `quiet`: headline `Logged.`, no pieces, cue `'tap'`, `mascotEvent` null, `maxMotionMs` 0, `ringClosed` false, awards still returned for the ledger but `levelUp` null.
- `levelUp` is `gamification.pendingLevelUp` when not paused.
- Copy: headline `First meal in.` for first-meal and `Logged.` otherwise; `detail` is `New for Momo: <names>` for wardrobe, the award label for milestone, `Your chosen logging steps are complete.` for ring; `announcement` is one sentence combining `Logged <name>.` with the detail (and `Level N.` when a level-up is included). No numbers about food appear anywhere.

- [ ] **Step 1: Write the failing tests** with these exact names. `logReceipt.test.ts`: `awardsSince returns exactly the keys appended after the receipt`, `awardsSince tolerates an awardedFrom beyond the ledger`, `makeLogReceipt carries the id, name, calories and count`. `dayRingEntries.test.ts`: `maps each food source to its ring source` (table of every `FoodEntry['source']` value the app uses, read from `types.ts`), `carries detailAdded`. `logFeedbackPlan.test.ts` (table-driven, each assertion on the rules above): `first meal ever`, `first meal rule uses ownership of the first piece, not an empty journal` (delete-and-relog does not restart it), `wardrobe outranks milestone and ring`, `milestone outranks ring`, `ring closes only on an incomplete-to-complete transition`, `ring acknowledged today is not replayed`, `second log caps motion at 240 and keeps every reward`, `third log caps motion at 120 even when a piece, a milestone and the ring coincide`, `one cue per action and the milestone cue replaces the confirm`, `the first meal hands over the first piece ahead of any other piece`, `paused is quiet and factual`, `level-up is carried`, `calories and targets do not change the plan` (identical plans for an under-target and an over-target day with the same logging context).
- [ ] **Step 2: Run** `npx vitest run src/lib/logReceipt.test.ts src/lib/logFeedbackPlan.test.ts src/lib/dayRingEntries.test.ts` — Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** the three modules to the signatures and rules above. `MascotOverlay.tsx` switches to `dayRingEntries`; its behaviour must not change (its tests stay green).
- [ ] **Step 4: Run** the new tests, then `npx vitest run`, `npx tsc -b`, `npm run lint` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(feedback): exact log receipts and a pure feedback planner`.

---

### Task 2: Receipts at every producer, activation guards and an immediate sheet

**Files:**
- Create: `web/app/src/lib/onceGuard.ts`
- Modify: `web/app/src/pages/LogSheet.tsx`, `web/app/src/pages/ManualEntryPage.tsx`, `web/app/src/pages/ReviewFoodPage.tsx`, `web/app/src/pages/SavedMealsPage.tsx`, `web/app/src/pages/OnboardingPage.tsx`, `web/app/src/components/BottomNav.tsx`, `web/app/src/styles/screens/kitchen.css`
- Test: `web/app/src/lib/onceGuard.test.ts`, `web/app/e2e/log-activation.spec.ts`

**Interfaces:**
- Consumes: `makeLogReceipt`, `LogReceipt` (Task 1).
- Produces: `export function createOnceGuard(): { run(fn: () => void): boolean; reset(): void }` — `run` calls `fn` and returns true the first time, returns false and does nothing afterwards until `reset()`. The six producers navigate with `state: { justLogged: LogReceipt }` where `awardedFrom` is `state.gamification.awardedKeys.length` read BEFORE `addEntry` (the handler's closure still holds the pre-action state).

- [ ] **Step 1: Write the failing tests.** `onceGuard.test.ts`: `runs the first call and ignores the rest`, `runs again after reset`, `returns whether it ran`. `e2e/log-activation.spec.ts` with these names: `a double click on Manual Save creates one entry` (valid fields, click Save twice quickly, Today shows exactly one new meal and one moment or toast), `a double activation of a Saved relog creates one entry`, `a double tap on a sheet quick-add creates one entry`, `the log sheet opens without waiting on a timer` (use Playwright's clock: `page.clock.install()`, click the FAB, do not advance time, expect the log dialog to be visible and the URL to be `/log`).
- [ ] **Step 2: Run** the unit test and `npx playwright test --project=chromium e2e/log-activation.spec.ts` — Expected: FAIL (modules missing; double activation creates two entries; the FAB waits 120 ms).
- [ ] **Step 3: Implement.** Add the guard to Manual `save`, Saved `logEntry`/`logMeal`, the sheet `commit`/`logAgain` and the Review save (reset it when a failed validation returns before `addEntry`). Make every producer build its navigation state with `makeLogReceipt(...)`. In `BottomNav.openLog` navigate immediately (remove `POP_MS`, the `opening` ref and the timer); the burst still plays on the same frame. In `kitchen.css` remove the per-child `animation-delay` lines on `.k-log-sheet` children so focusable controls are never visually delayed (the rise itself is rebuilt in Task 7).
- [ ] **Step 4: Run** the new tests and the existing `home`, `navigation`, `tap-targets`, `ui-consistency` e2e specs — Expected: PASS.
- [ ] **Step 5: Commit** `feat(log): exact receipts at every producer, activation guards and an immediate sheet`.

---

### Task 3: One coalesced, non-modal log payoff on Today

**Files:**
- Create: `web/app/src/components/LogMoment.tsx`, `web/app/src/lib/ringAck.ts`
- Modify: `web/app/src/pages/HomePage.tsx`, `web/app/src/styles/screens/today.css`, `web/app/src/lib/logFeedback.ts`, `web/app/src/store/AppContext.tsx` (data reset hook), `web/app/src/lib/designSystem.test.ts` (the `celebrate-inner` entry of `FLOATS` if it becomes dead), `web/app/e2e/helpers.ts`, `web/app/e2e/home.spec.ts`, `web/app/e2e/onboarding.spec.ts`, `web/app/e2e/onboarding-ui.spec.ts`, `web/app/src/pages/todayUi.test.tsx`, `docs/data/local-data-inventory.md`, `docs/data/retention-schedule.md`
- Delete: `web/app/src/components/LogCelebration.tsx`, `web/app/src/components/LevelUpOverlay.tsx`, `web/app/src/components/Confetti.tsx`, and the `celebrate-*`, `levelup-*` and confetti rules in `src/styles/components/overlays.css`, `gamification.css`, `enamel.css`, `redesign.css`, `system/components.css` once nothing references them (the dead-class tooling will list them)
- Test: `web/app/src/components/LogMoment.test.tsx`, `web/app/src/lib/ringAck.test.ts`, `web/app/e2e/log-moment.spec.ts`

**Interfaces:**
- Consumes: `planLogFeedback`, `awardsSince`, `LogReceipt`, `dayRingEntries` (Task 1); the guards from Task 2.
- Produces: `ringAck.ts`: `export const RING_ACK_KEY = 'poiem-ring-ack-v1'`; `export function readRingAck(): string | null`; `export function writeRingAck(dayKey: string): void`; `export function clearRingAck(): void` (all tolerate unavailable storage).
- Produces: `export function LogMoment(props: { plan: LogFeedbackPlan; foodName: string; outfit?: MomoOutfit; showMomo: boolean; onUndo?: () => void; onDone: () => void }): ReactElement` — a non-modal `<aside>` (no `role="dialog"`, no focus trap, never takes focus) with the headline, the detail line, the first piece's name when present, a small decorative Momo (`aria-hidden`, only when `showMomo` and the plan allows motion), an Undo button and a Dismiss button; one visually hidden `role="status"` `aria-live="polite"` `aria-atomic="true"` element carrying `plan.announcement` (the card itself is not live, so it is announced once). The card sets the CSS custom property `--k-moment-ms` from `plan.maxMotionMs` and stays up for 10 seconds, paused while hovered or focused, then calls `onDone`.

- [ ] **Step 1: Write the failing tests.** `ringAck.test.ts`: `round-trips a day key`, `tolerates missing storage`, `clear removes it`. `LogMoment.test.tsx` (render to static markup): `is not a dialog and not modal`, `announces once through a polite status element`, `shows the first piece name for a wardrobe plan`, `omits Momo when showMomo is false`, `omits decorative motion for a zero-motion plan`. `e2e/log-moment.spec.ts`: `the first meal shows a moment card, not a dialog, and focus stays where it was`, `Undo on the moment card removes the entry`, `the second and third log of a day show only a toast`, `a paused account gets a toast and nothing else`, `a refresh on Today does not replay the moment`, `deleting the only entry and logging again does not restart the first-meal moment`, `reduced motion shows the same text with no decorative motion`.
- [ ] **Step 2: Run** the three new unit and e2e files — Expected: FAIL.
- [ ] **Step 3: Implement `ringAck.ts` and `LogMoment.tsx`, then rewrite the receipt effect in `HomePage.tsx`.** On navigation with `state.justLogged`: build the plan with `planLogFeedback` (before-ring = the ring of today's entries without the receipt's entry), play `feel(plan.cue)` once, claim any `plan.pieces` exactly as the current effect does (including putting the first piece on Momo for the first meal), write `writeRingAck(todayKey)` when `plan.ringClosed`, call `ackLevelUp` when `plan.levelUp`, `clearFirstMealJourney()`, fire `mascotEvent(plan.mascotEvent)` after 120 ms unless null, and show either `LogMoment` (kinds first-meal, wardrobe, milestone, ring, or a first-of-day at tier full) or the existing toast with Undo (everything else, including `quiet`). Remove the time-proximity `fresh` logic, the 2-second window, `playLogConfirm`, the celebration state, the `LevelUpOverlay`/`LogCelebration` mounts and `shouldCelebrateLog` (delete it and its test from `logFeedback.ts` if nothing else uses it). A `pendingLevelUp` on mount with no receipt shows a single toast `Level N` and acknowledges it. Hook `clearRingAck` into the same places `clearNotificationHistory` is called in `AppContext.tsx`. Delete the three components and their now-dead CSS, update `FLOATS` and any dead-class test, and replace `helpers.ts`'s dismissal of the old dialog (the `Continue` button) and the e2e assertions that expected it with checks for the moment card. Add the `ring-ack` row to both data docs.
- [ ] **Step 4: Style the card** in `today.css` with tokens only: a flat outlined surface (no raised shadow, no tilt), approved type steps, entrance as opacity plus at most 12 px of translate over `--k-moment-ms`, nothing when the duration is 0 or the OS asks for reduced motion.
- [ ] **Step 5: Run** the new tests, `npx vitest run`, `npx tsc -b`, `npm run lint`, and the e2e specs `home`, `onboarding`, `onboarding-ui`, `navigation`, `mascot-motion`, `log-moment`, `log-activation` — Expected: PASS. The size script (Task 0) shows JS shrinking after the deletions.
- [ ] **Step 6: Commit** `feat(today): one coalesced non-modal log payoff, replacing the modal chain`.

---

### Task 4: The Day ring returns to Today

**Files:**
- Modify: `web/app/src/components/DayRing.tsx`, `web/app/src/pages/HomePage.tsx`, `web/app/src/styles/screens/today.css`, `web/app/src/styles/screens/home.css` (delete the dead `.day-ring*` rules)
- Test: `web/app/src/components/DayRing.test.tsx`, `web/app/e2e/day-ring.spec.ts`

**Interfaces:**
- Consumes: `dayRingProgress`, `dayRingEntries`, `readRingAck`/`writeRingAck`, `profile.loggingCommitment`.
- Produces: `DayRing` takes `{ progress: DayRingProgress; justClosed?: boolean; note?: ReactNode }` and renders a flat `<section className="k-ring" aria-labelledby="ring-title">` using only system tokens (`--k-*`); the three arcs are static SVG whose values update immediately (no transition on stroke or dash); `justClosed` adds `is-just-closed` for the 240 ms check acknowledgement (opacity plus scale from .94 to 1, `motionFade` timing) and nothing else; Today drops the flag again after 3 seconds (so a test can observe the class without racing the 240 ms animation); `note` renders under the legend.

- [ ] **Step 1: Write the failing tests.** `DayRing.test.tsx`: `renders one arc per commitment step and marks optional arcs optional`, `shows the check only when complete`, `uses system classes and no legacy day-ring classes`, `adds the closing class only when justClosed`. `e2e/day-ring.spec.ts`: `Today shows the ring under Momo for an active account`, `the ring is hidden while tracking is paused`, `logging the first meal fills the logging arc immediately`, `closing the ring plays the check once per local day` (log, delete, re-log: the closing class appears only the first time), `an over-target day shows the same ring as an under-target day with the same logging`, `the ring has an accessible name that states the chosen steps`.
- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** Rebuild `DayRing.tsx` on system classes (`k-ring`, `k-ring-graphic`, `k-ring-legend`...), delete the legacy `.day-ring*` rules and any now-dead tokens in `home.css`, and render it in `HomePage.tsx` inside `.k-today-summary` directly after `TodayMomo`, above the calorie hero, unless `paused`. Compute the ring from `dayRingEntries(entriesForDay(state.foodEntries, today))`, the day's note count and `profile.loggingCommitment`. A kitchen note that completes the ring (computed in the note click handler with the incremented count) writes the ack and passes `justClosed` once. Add the CSS in `today.css`: the ring graphic about 64 px, arcs as strokes with token colours, the legend in approved type steps, the section flat and outlined, spacing from the contract set.
- [ ] **Step 4: Run** the new tests, `npx vitest run` (the design-system and dead-class tests must pass), `npx tsc -b`, `npm run lint`, and the e2e specs `home`, `day-ring`, `log-moment`, `ui-consistency`, `tap-targets` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(today): bring the Day ring back as a flat section under Momo`.

---

### Task 5: One progress note

**Files:**
- Create: `web/app/src/lib/progressNote.ts`, `web/app/src/lib/habitMilestones.ts`
- Modify: `web/app/src/components/HabitMilestones.tsx` (import the shared thresholds), `web/app/src/pages/HomePage.tsx`
- Test: `web/app/src/lib/progressNote.test.ts`

**Interfaces:**
- Produces, `habitMilestones.ts`: `export const HABIT_MILESTONES = [1, 3, 7, 14, 30] as const` (moved from the component; the component imports it).
- Produces, `progressNote.ts`:
  `export interface ProgressNote { kind: 'outfit' | 'milestone' | 'complete'; text: string }`
  `export function progressNote(input: { loggedDays: number; ownedPieceIds: readonly string[] }): ProgressNote` — considers the next threshold above `loggedDays` among `HABIT_MILESTONES` and the not-yet-owned `WARDROBE` pieces whose rule is `loggedDays`; chooses the smallest target; on a tie the outfit wins; never both. Text: outfit `"<n> logged day(s) · <Piece name> at <target>"`; milestone `"<n> logged day(s) · next milestone <target>"`; complete (nothing above) `"<n> logged days. Look how far you’ve come."`. It never reads calories, macros, targets or streaks, and a break does not change it.

- [ ] **Step 1: Write the failing tests** (`progressNote.test.ts`): `points at the nearest outfit or milestone, never both`, `a tie prefers the named outfit`, `starts from the real count, never from zero when days are logged`, `says a single day in the singular`, `reaches the complete line when everything is passed`, `ignores pieces that are already owned`, `does not depend on food or streaks` (the function signature has no such inputs; assert identical output for the same days and owned pieces).
- [ ] **Step 2: Run** `npx vitest run src/lib/progressNote.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** both modules. In `HomePage.tsx` pass `note={<p className="k-ring-note">{progressNote({ loggedDays: loggedDays.size, ownedPieceIds: state.gamification.ownedCosmeticIds }).text}</p>}` to `DayRing` (so it exists only when the ring does: hidden while paused). The count is the existing distinct-logged-date set; keep its existing deletion semantics.
- [ ] **Step 4: Run** the new test, `npx vitest run`, `npx tsc -b`, `npm run lint`, and the e2e `day-ring` and `home` specs — Expected: PASS.
- [ ] **Step 5: Commit** `feat(today): one progress note toward the next outfit or milestone`.

---

### Task 6: A shared press and feel vocabulary

**Files:**
- Modify: `web/app/src/styles/system/components.css`, and the components that own chips, filters, tabs, wardrobe slots and toggles (find them with `grep -rn "feel(" web/app/src/components web/app/src/pages` and the `k-chip` / `aria-pressed` usages)
- Test: `web/app/src/lib/pressSystem.test.ts`, `web/app/e2e/press-feel.spec.ts`

**Interfaces:**
- Contract (tested): every pressable system control has a flat `:active` state using `translate`/`transform` on `var(--k-press)` timing and no second transform; selection controls (chips, filters, wardrobe slots, toggles) call `feel('select')` once when the selection actually changes and never on repeated selection, focus or typing; row selection uses `feel('tap')`; tabs keep their single `feel('tap')` on press. No control emits a cue on mount or route restoration.

- [ ] **Step 1: Write the failing tests.** `pressSystem.test.ts` (reads `components.css`): `chips, icon buttons, add rows and text buttons have a flat active state on the press timing`, `no control stacks two transforms on press`. `e2e/press-feel.spec.ts` (reuses the spy pattern from `feel-preferences.spec.ts`): `a changed chip selection emits one select cue`, `re-selecting the same chip emits none`, `typing in the search field emits none`, `a wardrobe slot change emits one select cue`, `Off settings keep every one of these silent`.
- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement** the missing `:active` rules and cue pairings, removing any doubled transform (for example on the legacy `PressableButton` where a shadow and a face both move) in the daily flows only. Do not restyle anything at rest.
- [ ] **Step 4: Run** the new tests, `npx vitest run` (design-system included), `npx tsc -b`, `npm run lint`, and the e2e `tap-targets`, `swipe-row`, `feel-preferences`, `press-feel`, `ui-consistency` specs — Expected: PASS.
- [ ] **Step 5: Commit** `feat(feel): one press and selection vocabulary across the daily controls`.

---

### Task 7: Meters, sheet, route arrival and Coach scroll

**Files:**
- Modify: `web/app/src/components/Meter.tsx`, `web/app/src/styles/system/components.css` (meter), `web/app/src/styles/screens/kitchen.css` (sheet), `web/app/src/styles/motion.css` (route arrival), `web/app/src/pages/LogSheet.tsx` (quick repeat), `web/app/src/pages/CoachPage.tsx`
- Test: `web/app/src/components/Meter.test.tsx`, `web/app/src/lib/motionRules.test.ts`, `web/app/e2e/motion-rules.spec.ts`

**Interfaces:**
- Contract: `Meter` renders a full-width fill moved with `transform: translateX(calc((progress - 1) * 100%))` inside an `overflow: hidden` track (not scaled: scaling squashes the Today calorie bar's stripes, translating keeps their period); the CSS transition is on `transform` only (240 ms, `--k-ease`), never on `width`. The log sheet rises at most 28 px with a 240 ms scrim fade and every child appears together (no stagger); a sheet reopened within 60 seconds of the last close uses a 120 ms fade only (module-level timestamp, class `is-quick`). Route arrival is a 240 ms opacity fade with at most 12 px of travel, no rotation, applied to the arriving content including the shared shell's nested main, never to the fixed nav. Coach auto-scroll uses `behavior: 'auto'` under OS reduced motion and `'smooth'` otherwise, and does not scroll when the reader has scrolled up more than 80 px from the bottom.

- [ ] **Step 1: Write the failing tests.** `Meter.test.tsx`: `translates a full-width fill and never sets width or scale`. `motionRules.test.ts` (reads the CSS): `no daily-flow rule transitions or animates width, height, border-width, filter or box-shadow` (scoped to the files this plan touches, with an allow-list for existing exceptions that you must justify in the test), `route arrival has no rotation and at most 12px of travel`, `sheet children have no animation delay`, `sheet travel is at most 28px`. `e2e/motion-rules.spec.ts`: `Today meters reflect the value without animating width` (computed style of the fill has no width transition), `a quickly reopened sheet gets the quick class`, `Coach does not scroll a reader who scrolled up`, `Coach uses instant scrolling under reduced motion`.
- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement** to the contract above. Keep the final settled geometry of every meter identical (the visual baselines for meters must not change except where Today changes in Task 4).
- [ ] **Step 4: Run** the new tests, `npx vitest run`, `npx tsc -b`, `npm run lint`, and the e2e `home`, `navigation`, `tap-targets`, `ui-consistency`, `mascot-motion`, `motion-rules` specs — Expected: PASS.
- [ ] **Step 5: Commit** `feat(motion): transform-only meters, a calmer sheet and route arrival, and a polite Coach scroll`.

---

### Task 8: Evidence, dogfood protocol and the spec of record

**Files:**
- Create: `docs/motion/evidence.md`, `docs/motion/dogfood-protocol.md`, `web/app/scripts/interaction-trace.mjs`
- Modify: `docs/MOTION_AND_RETURN_STRATEGY.md` (add a Revision log and the slice/paused markers), `web/app/DESIGN.md` (a short "Motion and feedback" section naming the feedback planner, the moment card, the ring and the press vocabulary)

**Interfaces:**
- Produces: `node scripts/interaction-trace.mjs` (Playwright, Chromium, throttled CPU 4x) drives ten repetitions each of: sheet open and close, Manual save, Saved relog, the first-meal moment, a second-log toast, and a Coach send; records per-interaction input-to-feedback time and long tasks (>50 ms) using a `PerformanceObserver`, and prints a JSON table. Device, browser version, throttling and commit are written with the results.

- [ ] **Step 1: Re-run the budget.** `VITE_GOOGLE_CLIENT_ID= npm run build:cloud` (`VERCEL_GIT_COMMIT_SHA=after`) then `node scripts/chunk-sizes.mjs --json`; compare with `docs/motion/baseline.md` and record the deltas against each budget line in `docs/motion/evidence.md`. A breach is a finding to fix or justify, never to hide.
- [ ] **Step 2: Capture traces** with `interaction-trace.mjs` on `npm run build:local` plus `npm run preview`. Record input-to-feedback p95 (budget 100 ms), long tasks (budget zero attributable) and the method. Android device traces and screen-reader passes cannot be run here: list them in `docs/motion/evidence.md` as PENDING for the founder, never as passed.
- [ ] **Step 3: Write `docs/motion/dogfood-protocol.md`.** About ten consenting adults: one week on the pre-slice build (the `poiem-motion-safety` build) then two weeks on the slice; a three-question diary (did you want to open it; was anything annoying; any pressure or guilt) and participant-read diagnostics from the existing local analytics buffer; success and stop conditions (any lost or duplicate entry, any guilt or body-judgement copy, a rise in sound, haptic or reminder opt-outs, or any complaint of pressure stops the rollout regardless of return); how results are reported (small-n, directional, never as uplift); and what the telemetry track must specify before any population claim (consent, identity, sink, retention).
- [ ] **Step 4: Update the spec of record.** Add a Revision log to `docs/MOTION_AND_RETURN_STRATEGY.md` listing the seven approved decisions and where each landed, mark every roadmap item as `slice` or `paused`, and add the paused return hooks as short sections (trigger, copy, fallback, repeat version, effort, risk). Add the DESIGN.md section.
- [ ] **Step 5: Refresh the Today baselines (D6).** If Docker is available run `npm run visual:update`, review every changed still (only Today should change), and commit them. If not, say so in `docs/motion/evidence.md` and in the final report: the Linux `visual` job will fail until the founder refreshes them.
- [ ] **Step 6: Run the full gate.** `npm run lint`, `npx vitest run`, `npm run build:cloud` then `npm run build:local` last, `npx playwright test --project=chromium --project=production` (ports free first), `npm --prefix ../.. run test:product`, and from `web`: `npm run test:api`, `npm run typecheck:api`. Expected: all pass except the Linux-only `visual` project.
- [ ] **Step 7: Commit** `docs(motion): evidence, dogfood protocol and the revised strategy`.

---

## Out of scope (paused or other tracks)

B5 milestone and staged wardrobe moments, the rest of B6, B7 intensity and reminder controls, the weekly recap, outfit of the day and "yesterday's plate" hooks, visit-day metadata, a local diagnostics store, remote telemetry, any change to the public welcome page, the Expo app, or Android and iOS, and the remaining loss-framed copy flagged during Track 0 (iOS and Android notification strings, `freezeNotice`, the StreakBadge label, the ProgressPage line).
