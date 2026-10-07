# Track 0: Safety and Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four correctness and safety problems that must ship before any motion work: Momo reacting to nutrition outcomes, saved sound and haptic preferences being applied too late, loss-framed reminders, and a pronoun slip.

**Architecture:** No new features and no motion. Momo's greeting stops taking a nutrition input. The saved sound and haptics preferences are applied at the product provider boundary, and the feel layer stays silent until it has been told what they are. The shared notification policy drops its streak-save and freeze-safe kinds (the policy lives in `@fud-ai/domain`, so web, mobile and the shared fixture change together), and reminder copy becomes neutral.

**Tech Stack:** React 19, Vite, vitest, Playwright, the shared `@fud-ai/domain` package, the Expo `mobile/` adapter (plain TypeScript only).

**Spec:** the approved Track 0 decisions for `docs/MOTION_AND_RETURN_STRATEGY.md` (the Phase A strategy lives in the founder's main checkout and is not copied here). Decision 1 (Track 0), reproduced:
- a) Momo becomes nutrition-blind: remove the `over` input from `todayGreeting`; add a regression that changes calories, macros and targets with interaction context held fixed and gets the same Momo response.
- b) Hydrate sound and haptic preferences at the product/provider boundary before any route can emit a cue; handle account switches and direct-route visits; test direct visits with persisted Off settings.
- c) Retire the loss-framed reminders: remove the streak-save and freeze-safe kinds and their eligibility, replace the routine copy with neutral wording, and make copy tests reject loss framing, not only nutrition language. No new settings UI.
- d) Fix "she" for Momo in `SettingsPage` to Momo's canonical "he".

## Global Constraints

- Track 0 is a separate small PR from `origin/main`. No motion work, no new settings UI, no new visuals. The only user-visible changes are: Momo's response on a day over target, the notification wording and kinds, and the "he" pronoun.
- Do not change the streak, freeze, XP or wardrobe mechanics themselves. Only the notification policy stops reading streak and freeze state.
- `packages/domain` stays pure: no React, DOM, Expo, storage, network, clock or random APIs.
- The two-notifications-a-day cap stays as a ceiling (`MAX_NOTIFICATIONS_PER_DAY = 2`).
- Reminder copy must carry no digits, no exclamation marks, no loss framing (streak, lose/lost, alive, freeze, missed, last chance, running out, expires, hurry), no nutrition words and no moral food language.
- Do not touch the iOS, Android or upstream-app notification code. The mobile change is limited to the plain-TypeScript adapter and its tests (`mobile/src/notifications/schedule.ts` and its tests); do not touch Expo APIs.
- Do not push, open a PR or touch GitHub. Commit locally on branch `poiem-motion-safety` (already created from `origin/main`). Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Tests that already pin behaviour and must stay green (updating them is part of the tasks below): `web/app/src/lib/todayGreeting.test.ts`, `web/app/src/lib/notifications.test.ts`, `web/app/src/lib/notificationsFixture.test.ts`, `web/app/src/lib/feel.test.ts`, `web/app/src/lib/designSystem.test.ts`, `web/test/api/shared-policy-fixtures.test.ts`, `mobile/src/logic/notificationsFixture.test.ts`, `mobile/src/notifications/schedule.test.ts`, the root `copy-policy` test, and the e2e specs `home.spec.ts`, `onboarding.spec.ts`, `navigation.spec.ts`.
- TypeScript flags in `web/app/tsconfig.app.json`: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`. Style: single quotes, no semicolons (mobile files follow their own existing style).
- Commands run from `web/app` unless stated. Ports 5173 and 4173 may be occupied by other sessions: check before any Playwright run and never kill a process you did not start.

## Review Focus

1. A day over target, any macros and any target: Momo's dialogue, expression and pose are identical to a day under target with the same interaction context. This includes every other Momo input, not only `todayGreeting` (Task 1 audits `mascotVoice`, the controller and `TodayMomo`).
2. A direct visit to a route (not Today) with Sound and Haptics persisted Off: no vibration call and no audio at any point, including mount-time cues and the first press. The same route with both On does produce cues, so the spy cannot pass vacuously (Task 2).
3. Account switch and sign-out: the next account's preferences apply (the provider remounts per account) with no window where the previous account's setting leaks (Task 2).
4. A stored notification log from before this change containing the legacy kinds `save` or `freeze`: reading it must not crash, and evaluation must still respect the two-per-day cap (Task 3).
5. Mobile parity: `plannedNotifications` returns only the routine kind and the shared fixture characterises the same cases on web, mobile and the API test (Task 3).

---

### Task 1: Momo becomes nutrition-blind (and the pronoun fix)

**Files:**
- Modify: `web/app/src/lib/todayGreeting.ts`, `web/app/src/pages/HomePage.tsx`, `web/app/src/pages/SettingsPage.tsx`
- Test: `web/app/src/lib/todayGreeting.test.ts`

**Interfaces:**
- Produces: `todayGreeting(input: { hour: number; name?: string; mealsToday: number; isToday: boolean }): TodayGreeting`. The `over` field is gone from the type. `MOMO_POKES` is unchanged.

- [ ] **Step 1: Write the failing tests** in `todayGreeting.test.ts` (replace the existing "Big food day" assertion; keep the other tests):
```ts
const NUTRITION_WORDS = /(big food day|fresh plate|over|under|deficit|calorie|kcal|budget|goal|target|macro|protein)/i

it('gives the same response whatever the day's numbers were', () => {
  const ctx = { hour: 20, name: 'Sam', mealsToday: 4, isToday: true }
  const plain = todayGreeting(ctx)
  // A caller that still passes the retired field must not change Momo.
  expect(todayGreeting({ ...ctx, over: true } as typeof ctx)).toEqual(plain)
  expect(todayGreeting({ ...ctx, over: false } as typeof ctx)).toEqual(plain)
})

it('never says anything about the numbers, in any state', () => {
  for (const hour of [3, 8, 14, 19, 23]) {
    for (const mealsToday of [0, 1, 4, 9]) {
      for (const isToday of [true, false]) {
        const { line } = todayGreeting({ hour, mealsToday, isToday })
        expect(line).not.toMatch(NUTRITION_WORDS)
      }
    }
  }
  for (const poke of MOMO_POKES) expect(poke.line).not.toMatch(NUTRITION_WORDS)
})
```
- [ ] **Step 2: Run** `npx vitest run src/lib/todayGreeting.test.ts` — Expected: FAIL (the `over` branch still exists).
- [ ] **Step 3: Implement.** Remove `over` from `GreetingInput` and delete the `if (over) ...` branch in `todayGreeting.ts`; remove `over: budget.over > 0` from the call in `HomePage.tsx` (keep `budget.over` where it feeds the factual meters). Change the string at `SettingsPage.tsx` ~line 657 from `'She writes fresh reactions in the background.'` to `'He writes fresh reactions in the background.'` and fix any test or snapshot that pins it.
- [ ] **Step 4: Audit every other Momo input.** `grep` for nutrition-derived inputs (`over`, `calorie`, `kcal`, `budget`, `goal`, `remaining`, `macro`, `target`) in `web/app/src/mascot/`, `web/app/src/components/TodayMomo.tsx`, `web/app/src/lib/mascotAI.ts`, `web/app/src/lib/mascotRoasts.ts`, `packages/product/src/mascotVoice.ts`, `packages/product/src/mascotLines.ts`. Remove any nutrition-derived input that selects Momo's dialogue, expression or pose; the factual UI (meters, ring, totals) is not Momo and stays. If the audit finds one, add a regression test for it in the same style as Step 1; if it finds none, say so in the report with the grep output.
- [ ] **Step 5: Run** `npx vitest run` and `npx tsc -b` and `npm run lint` — Expected: PASS, clean.
- [ ] **Step 6: Commit** `fix(momo): make Momo's response independent of the day's nutrition`.

---

### Task 2: Apply saved sound and haptic preferences before any cue

**Files:**
- Modify: `web/app/src/lib/feel.ts`, `web/app/src/store/AppContext.tsx`, `web/app/src/pages/HomePage.tsx`
- Test: `web/app/src/lib/feel.test.ts`, `web/app/e2e/feel-preferences.spec.ts`

**Interfaces:**
- Produces (feel.ts): the module is silent until `setFeelEnabled` has been called at least once (both channels no-op while unconfigured). `export function feelPreferencesFromProfile(profile: { soundEnabled?: boolean; hapticsEnabled?: boolean }): { sound: boolean; haptics: boolean }` returns `soundEnabled !== false` and `hapticsEnabled !== false`.
- Consumes: `AppProvider` in `AppContext.tsx` (it already holds `state.profile` and remounts per account via `key={user.sub}`; guests get `AppProvider guest`).

- [ ] **Step 1: Write the failing tests.**
  `feel.test.ts` (use the file's existing module-reset pattern): (a) with no `setFeelEnabled` call, `haptic('light')` calls no `navigator.vibrate` and a sound cue creates no `AudioContext`; (b) after `setFeelEnabled({ sound: true, haptics: true })` both work; (c) `feelPreferencesFromProfile({})` is `{ sound: true, haptics: true }`, `({ soundEnabled: false })` is `{ sound: false, haptics: true }`, `({ hapticsEnabled: false })` is `{ sound: true, haptics: false }`.
  `e2e/feel-preferences.spec.ts`: seed the persisted profile (read `e2e/seed.ts` and `e2e/helpers.ts` for how state is seeded) and install spies with `page.addInitScript`: count `navigator.vibrate` calls and `AudioContext` constructions plus `createOscillator` calls. Tests, exact names: `direct visit with sound and haptics off stays silent` (seed both Off, open `/log/manual` directly, press buttons that emit cues, assert zero vibrate calls and zero audio activity) and `direct visit with both on is audible` (seed both On, same route and presses, assert at least one vibrate call or oscillator, so the spy cannot pass vacuously). Pick presses that really call `feel`/`haptic` (grep for `feel(` in the Manual flow and shared buttons).
- [ ] **Step 2: Run** `npx vitest run src/lib/feel.test.ts` and `npx playwright test --project=chromium e2e/feel-preferences.spec.ts` — Expected: FAIL (the feel layer defaults on; only `HomePage` applies the setting).
- [ ] **Step 3: Implement.** In `feel.ts` add a `configured` flag set by `setFeelEnabled`, make `haptic()` and the sound entry point return early while `!configured`, and add `feelPreferencesFromProfile`. In `AppProvider` apply the preferences with a `useLayoutEffect` keyed on `state.profile.soundEnabled` and `state.profile.hapticsEnabled` (layout effects run before any child passive-effect cue, which is why an ordinary `useEffect` in the provider is not enough). Remove the `setFeelEnabled` effect from `HomePage.tsx` (and its now-unused import).
- [ ] **Step 4: Check which surfaces lose cues.** Any surface rendered outside `AppProvider` (the welcome page, error screens) is now silent. `grep` for `feel(`, `haptic(`, `tapLight` and `useFeel` under `web/app/src/pages/welcome`, `WelcomePage.tsx` and `src/components` used by public screens; list every hit in the report. Silent-by-default there is the intended safe behaviour; do not add a provider to those surfaces.
- [ ] **Step 5: Run** the two test commands from Step 2 — Expected: PASS. Then `npx vitest run`, `npx tsc -b`, `npm run lint`, and `npx playwright test --project=chromium e2e/home.spec.ts e2e/navigation.spec.ts e2e/onboarding.spec.ts` — Expected: PASS.
- [ ] **Step 6: Commit** `fix(feel): apply saved sound and haptic preferences before any cue can fire`.

---

### Task 3: Retire the loss-framed reminders

**Files:**
- Modify: `packages/domain/src/notifications.ts`, `packages/domain/README.md`, `web/app/src/lib/notifications.ts`, `web/app/src/pages/HomePage.tsx`, `mobile/src/notifications/schedule.ts`, `web/test/api/shared-policy-fixtures.test.ts`, `web/app/src/lib/notificationsFixture.test.ts`, `mobile/src/logic/notificationsFixture.test.ts`, `web/app/src/lib/notifications.test.ts`, `mobile/src/notifications/schedule.test.ts`
- Create: `packages/domain/fixtures/notifications.v2.json`
- Delete: `packages/domain/fixtures/notifications.v1.json` (after updating every reference; `grep -rn "notifications.v1"` across the repo, including docs and `docs/release/evidence.json`, and update or justify each hit)

**Interfaces:**
- Produces (domain): `NOTIFICATION_KINDS = ['routine'] as const`; `NotificationKind = 'routine'`; `NotificationEligibilityInput = { loggedToday: boolean; firstLogHours: readonly number[]; localHour: number; trackingPaused?: boolean; sentKinds: readonly NotificationKind[] }` (the `streak`, `freezeAvailable` and `freezeJustApplied` inputs are removed); `eligibleNotificationKinds(input): NotificationKind[]` returns `['routine']` only when not paused, not logged today, `localHour >= routineHour(firstLogHours)` and the cap allows it, else `[]`; `bannedNotificationCopy(text: string): boolean` additionally rejects loss and pressure language; `MAX_NOTIFICATIONS_PER_DAY`, `canSendNotification`, `routineHour` unchanged.
- Produces (web adapter): `evaluateNotifications(input: { loggedToday: boolean; firstLogHours: number[]; localHour: number; trackingPaused?: boolean }): Promise<void>`; the only copy is the constant body `Your journal is here whenever you’re ready.`; `notificationsSentToday`, `clearNotificationHistory`, `requestNotifyPermission`, `routineHour`, `bannedNotificationCopy` keep their signatures.
- Produces (mobile): `plannedNotifications(state, now?)` calls the new eligibility input (no streak, no freezes) and drops the now-unused `loggingStreak` import if nothing else in the file uses it.
- Fixture: `notifications.v2.json` with `schemaVersion: 2`; the three consuming tests assert `schemaVersion` 2 and read the v2 file.

- [ ] **Step 1: Write the failing tests.**
  `notifications.test.ts` (web): remove the three save/freeze tests and the streak copy samples; the new cases: `sends the routine nudge once, never more` (evening, nothing logged: exactly one delivery, calling again sends nothing), `sends nothing while paused`, `sends nothing once logged today`, `a stored log with legacy kinds does not crash and still respects the cap` (write `fud-notify-log` for today with `kinds: ['save', 'freeze']` through the localStorage stub, then evaluate: no throw, and `sent.length` is 0 because the two legacy entries already fill the cap), and a copy block: the only sent body equals `Your journal is here whenever you’re ready.`, contains no digits and no `!`, `bannedNotificationCopy` is false for it, and `bannedNotificationCopy` is TRUE for each of: `'Two minutes to keep your 12-day streak going.'`, `"Your streak's still alive — log anything to keep it."`, `'Freeze used. Streak safe at 23.'`, `'Last chance to log today'`, `"Don't lose your progress"`, `'You missed yesterday'`, `'Hurry, time is running out'`, plus the existing calorie/weight/disappointed/broken-promise cases. `bannedNotificationCopy('Your journal is here whenever you’re ready.')` stays false.
  Fixture `notifications.v2.json` cases (inputs without the removed fields), with these ids and expected kinds: `paused` (`trackingPaused: true`, hour 20) -> `[]`; `logged-today` -> `[]`; `routine-evening` (hour 20, no history) -> `['routine']`; `before-routine-hour` (hour 10, no history so the default 19) -> `[]`; `personal-hour` (`firstLogHours: [8, 8, 9, 9, 9, 10, 10]`, hour 10) -> `['routine']`; `already-sent` (`sentKinds: ['routine']`) -> `[]`.
  The mobile `schedule.test.ts` keeps its two tests and adds: `plans only the routine nudge in the evening` (fresh state, 20:30, nothing logged -> `['routine']`) and `plans nothing once a meal is logged today`.
- [ ] **Step 2: Run** `npx vitest run src/lib/notifications.test.ts src/lib/notificationsFixture.test.ts`, `npm --prefix ../.. run test:api -- shared-policy-fixtures` (adjust to however the root script forwards arguments; it is `npm --prefix web run test:api`), and the mobile tests. For mobile, run `npm ci --prefix mobile` once if `mobile/node_modules` is missing, then `npm --prefix mobile test`. Expected: FAIL before the implementation.
- [ ] **Step 3: Implement the domain change** exactly as specified in Interfaces. The loss-language rule extends the existing regex with: `streak`, `lose`, `lost`, `losing`, `alive`, `freeze`, `frozen`, `miss`, `missed`, `missing`, `last chance`, `running out`, `expire`, `expires`, `expired`, `hurry`, `don't break`, as whole words or phrases, case-insensitive. Create the v2 fixture and remove v1, then update the three consuming tests and `packages/domain/README.md` (change the notification bullet to say the policy is a two-per-day, logging-only, loss-free routine nudge).
- [ ] **Step 4: Implement the adapters.** Web `notifications.ts`: one constant body, trimmed `evaluateNotifications`, no `streak` parameter or copy function; make `readLog` tolerate legacy kinds (it already returns whatever is stored). `HomePage.tsx`: update the call and the effect dependencies (drop `streak` and `state.gamification.streakFreezes` from them; `streak` may still be used elsewhere on the page). Mobile `schedule.ts`: pass the new input. Then read the Settings reminder copy near `SettingsPage.tsx` lines ~295-297 and ~455-458 (and `SettingsFinder.tsx`): if any label or description mentions streaks or freezes in the context of reminders, reword it neutrally (copy only; no new controls); report what you changed or that nothing needed changing.
- [ ] **Step 5: Run** all the Step 2 commands, then `npx vitest run`, `npx tsc -b`, `npm run lint` from `web/app`, `npm --prefix web run test:api`, `npm --prefix web run typecheck:api`, `npm --prefix mobile run typecheck`, and the root copy policy (`node --test scripts/copy-policy.test.mjs` from the repo root) — Expected: PASS.
- [ ] **Step 6: Commit** `fix(notifications): retire the streak-save and freeze reminders and the loss copy`.

---

## Out of scope for Track 0 (the motion and return slice, paused work and later plans)

The Day ring on Today, the feedback selector, the shared press vocabulary, the progress note, the intensity and reminder controls, the recap, outfit-of-the-day and relog shortcut hooks, the dogfood protocol, and any new persisted field.
