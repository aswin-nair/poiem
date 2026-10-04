# Fud AI — context for AI coding agents

Handoff document. Read this before touching the repo.

---

## 1. The single most important fact: there are two apps

This repo contains **two separate applications** that both track food. Confusing
them is the most expensive mistake available here.

| | `web/app/` | `mobile/` |
|---|---|---|
| **Status** | **The live product.** Deployed to Vercel. | Second app, newer, not shipped. |
| Stack | Vite + React 19 + react-router-dom | Expo SDK 57 + React Native + expo-router |
| Language | TypeScript (strict) | TypeScript (strict) |
| Storage | Per-user IndexedDB snapshot/outbox, with versioned Neon in cloud mode | `expo-sqlite` + drizzle-orm |
| State | React Context (`store/AppContext.tsx`) | zustand stores |
| Styling | One large `src/index.css` + CSS custom properties | `src/theme/tokens.ts` |
| Look | **Coral / cream, warm, editorial** | Green / white |
| Dev server | `npm run dev --prefix web/app` → :5173 (or :5174) | `npm run web --prefix mobile` |

**Default assumption: work means `web/app/`** unless the request is explicitly
about React Native, Expo, SQLite or drizzle.

There is a `BUILD_SPEC.md`-style specification that circulates with this project.
It is written in Expo/React Native terms (design tokens in `tokens.ts`, expo-router
file routing, Reanimated). **Its §2 product rules apply to both apps. Its
Phase 1–4 implementation details describe the `mobile/` app only.** Applying its
literal file layout to `web/app` is wrong; applying its *rules and product
behaviour* to `web/app` is right.

---

## 2. What the product is

A food/calorie logging app built around a Duolingo-style habit loop: one small
daily action, immediate visible reward, a streak that compounds.

**The atomic action is logging one meal.** Everything exists to make that take
under 20 seconds and feel worth repeating tomorrow. Audience is adults building a
logging habit. It is **not** a medical device.

---

## 3. Non-negotiable product rules

These are **safety requirements, not preferences**. They override engagement,
retention and aesthetics. Do not implement anything that violates them, and do
not remove the code that enforces them.

### 3.1 Goal calculation floors
```
BMR     = Mifflin-St Jeor (Katch-McArdle when body fat % is known)
TDEE    = BMR × activity_multiplier
deficit = min(requested, TDEE × 0.25)          // cap deficit at 25%
floor   = sex === 'female' ? 1200 : 1500
target  = max(TDEE - deficit, floor, BMR)
```
- Rate of loss capped at **1% of bodyweight per week**.
- Goal weights implying **BMI < 18.5 are refused**, not clamped.
- **Never clamp silently** — always show a plain-language explanation.
- Implemented in `web/app/src/lib/profile.ts` → `computeTargets()`, which returns
  `{ calories, clamped, reasons }`. It is the *only* path to a calorie target and
  a hand-entered `customCalories` passes through the same floors.

### 3.2 Age gate
Onboarding collects date of birth **first** and runs the gate immediately, before
collecting height/weight. Under 18 → hard block, no bypass, no "continue anyway".
`web/app/src/pages/OnboardingPage.tsx` (`blocked` state).

### 3.3 Streak the logging, never the deficit
A day counts if the user logged **at least one meal**. It never depends on hitting
or staying under a calorie target. There is no penalty or negative state for going
over.

### 3.4 Over-budget is a neutral state
- Going over renders in a **lighter tint of the same colour** (`--on-track-soft`),
  never red, never a warning icon.
- `--danger` / `--danger-deep` are reserved **exclusively** for destructive UI
  (delete entry, delete account). They must never encode a nutrition state.
- **Banned words in all user-facing strings:** `bad`, `cheat`, `guilty`, `earned`,
  `burn it off`, `naughty`, `sinful`, `damage`.

### 3.5 Mascot reacts to logging, never to numbers
Six states: `idle | happy | celebrating | sleepy | proud | neutral`. Driven only
by logging behaviour and streak status — **never** by the calorie total, the macro
split, or a specific food. Going over target renders `neutral`, like any ordinary
day. **There is no sad, disappointed or crying state. Do not add one.**

### 3.6 Notifications
Maximum **two per day**, enforced in code (`lib/notifications.ts`, `MAX_PER_DAY`);
two is a ceiling, not a target. There is **one** neutral routine nudge, at the
inferred logging time, and nothing else. No streak, freeze or target input decides
whether it fires; only "nothing logged today", the person's usual first-log hour,
and the cap do. There is no "save" nudge and no freeze notice: a used freeze is
shown in the app, never pushed. No guilt copy. Notifications never mention
calories, weight, or how much someone ate, and loss or pressure language is
banned. The shared copy checker (`bannedNotificationCopy` in `@fud-ai/domain`)
rejects `streak`, `lose`/`lost`/`losing`, `alive`, `freeze`/`frozen`,
`miss`/`missed`/`missing`, `last chance`, `running out`, `expire`/`expires`/`expired`,
`hurry` and `don't break`, besides the calorie, weight and guilt words. The shipped
body is "Your journal is here whenever you’re ready."

### 3.7 No public comparison
No leaderboards, no leagues, no public rankings of calories or weight. If social
is ever added it is opt-in, friends-only, and shares streak length only.

### 3.8 Off-ramps
- One free streak freeze per calendar month, auto-applied, never sold.
- **Pause tracking** — hides calorie, macro, and weight numbers, and holds the
  streak indefinitely.
- **Support** screen with eating-disorder helplines, reachable in two taps from
  Home (Settings → Support). US entry is the **National Alliance for Eating
  Disorders**. **Do not link NEDA** — its helpline is permanently disconnected.

---

## 4. `web/app` architecture

### Routes (`src/App.tsx`)
```
/login  /onboarding
/  (Home)  /progress  /coach  /journey  /settings  /about  /support
/log  /log/text  /log/photo  /log/saved  /log/manual  /discover
/review  /edit/:id
```
Unauthenticated → `/login`. Authenticated but not onboarded → forced to
`/onboarding`.

### Data model (`src/types.ts`)
`AppState` = `{ onboarded, profile, foodEntries, weightEntries, exerciseEntries,
favoriteMeals, chatMessages, aiSettings, gamification }`.

- `FoodEntry` — `{ id, name, calories, protein, carbs, fat, timestamp, emoji,
  source, mealType, servingSizeGrams?, ingredients? }`
- `FoodSource` — `'textInput' | 'manual' | 'snapFood' | 'quickAdd' | 'recent'`
- `GamificationState` — `{ xp, level, streakFreezes, freezeUsedDates,
  freezeEarnedMonth, pauseStartedDate, pauseProtectedDates, xpEvents,
  awardedKeys, pendingLevelUp, seenBadgeIds, quest? }`. `xpEvents` is a capped
  display feed; `awardedKeys` is the untruncated XP idempotency ledger.

### Persistence
There are two explicit modes:

- Both modes use a schema-versioned, per-user IndexedDB record
  (`lib/durableState.ts`) as the browser authority. Existing
  `fud-ai-web-state-<userId>` localStorage snapshots migrate only after a
  successful durable commit; unavailable IndexedDB falls back visibly to a
  secret-free localStorage record. Invalid records are quarantined, never
  hydrated as empty state.
- Cloud mode uses the authenticated `/api/state` endpoint and a versioned Neon
  JSON snapshot. The shared runtime contract (`web/shared/appStateContract.ts`)
  validates upload and download boundaries. Its ordered outbox persists stable
  mutation UUIDs and retry metadata across relaunch; optimistic versions reject
  stale writers, then require an exported-copy server/device choice instead of
  silently overwriting either side.

Export/import to JSON is supported. The private BYOK credential is deliberately
outside `AppState`, so it is never included in an export or cloud snapshot.

### State
Single `AppContext` (`store/AppContext.tsx`) exposing `addEntry`, `updateEntry`,
`deleteEntry`, `toggleFavorite`, `logSavedMeal`, `addWeightEntry`, `addExercise`,
`replaceState`, `clearAllData`, `ackLevelUp`, plus `pendingAnalysis` used to hand
AI results between the log pages. `AuthContext` handles sign-in.

**`addEntry` runs the whole gamification advance** (`lib/gamification.ts` →
`advanceAfterLog`): XP awards, streak, quest sync, freeze application, level-up.
Do not award XP by hand elsewhere.

### Key modules
| File | Responsibility |
|---|---|
| `lib/profile.ts` | BMR/TDEE, **`computeTargets()` with all §3.1 floors**, macro goals |
| `lib/journey.ts` | `getStreakWithFreezes`, `getMonthConsistency`, badges, freezes |
| `lib/streak.ts` | Base streak walk |
| `lib/xp.ts` | Level thresholds, `levelFromXp`, XP award computation |
| `lib/quests.ts` | Daily quest generation, seeded by date so it is stable |
| `lib/gamification.ts` | `advanceAfterLog`, `openSession` |
| `lib/notifications.ts` | Two-per-day cap, copy, `routineHour` |
| `lib/analytics.ts` | Typed events → local ring buffer in `localStorage` |
| `lib/meals.ts` | Recents, favourites, `quickAddEntry`, `defaultMealType` |
| `lib/durableState.ts` | Validated IndexedDB snapshot, ordered cloud outbox, retry leases, explicit conflict rebase |
| `lib/feel.ts` | Synthesised sounds + haptics, honours profile toggles |
| `lib/tokens.ts` | JS-side motion durations, ring geometry |
| `lib/dates.ts` | **`localDayKey()` — local calendar date, never UTC** |
| `lib/storage.ts` | Local migration, strict validation, quarantine, device-only BYOK storage |
| `lib/apiClient.ts` | Bounded, session-bound, versioned cloud state transport |
| `web/shared/appStateContract.ts` | Runtime allowlist, field/bounds/age validation, cloud-secret policy |
| `web/api/state.ts` | Authenticated state API with optimistic concurrency |

### Auth
Local email/password (`lib/localAuth.ts`, stored in browser) **plus** Google
OAuth (`@react-oauth/google`). Cloud mode exchanges the identity for a signed API
session; state requests are pinned to the token captured for that provider
session so a second-tab account change cannot redirect an old user's snapshot.
Expired or invalid sessions return to sign-in. Normal sign-out attempts server
revocation before expiry; Settings also exposes logout-all and transactional
typed-confirmation account deletion. In dev, Google sign-in can report
unregistered-origin errors until that origin is configured.

### AI features (BYOK)
Photo and text meal logging call an LLM using the **user's own API key**
(OpenRouter or Gemini). The key is stored in a separate, device-local browser
record, never in `AppState`; the cloud/API contract rejects a non-empty key even
if a client attempts to upload one. `lib/aiClient.ts`, `lib/foodAI.ts`,
`lib/coachAI.ts`. No key ships with the app.

---

## 5. Design system

**The palette is coral/cream and must not be changed.** All tokens live at the
top of `src/index.css` under `:root`.

```css
--paper: #F6F1EA;  --paper-card: #FFFFFF;  --paper-deep: #EFE6D8;
--ink: #1A1A1A;    --ink-soft: #7A7266;    --ink-mute: #A69C8C;
--coral: #FF7A50;  --coral-deep: #E8623A;  --coral-soft: rgba(255,122,80,0.12);
--serif: 'Fraunces';  --sans: 'Plus Jakarta Sans';
```

Role-named tokens layered on top (added later, introduce no new hue):
`--on-track`, `--on-track-deep`, `--on-track-soft`, `--protein/--carbs/--fat`,
`--danger`/`--danger-deep`, `--space-*`, `--radius-*`, `--text-*`, `--motion-*`,
`--press-depth`.

**Use the role tokens for new work.** Colours are named by role, not by hue, so a
rebrand touches one block.

### Signature components
- **`PressableButton`** — the raised button. Two stacked layers (static shadow +
  face that translates 4px down on press). *Not* an animated border, which would
  reflow. Haptic fires on press, not release. At most one `primary` per screen;
  `destructive` only for delete.
- **`CalorieRing`** — SVG, rotated −90° to start at 12 o'clock, round cap,
  CSS transition on `stroke-dashoffset` so it animates from its current value
  rather than restarting from empty. Over target draws a second arc in
  `--on-track-soft` with a factual label.
- **`Mascot`** — SVG, six states, rounded shapes only. See §3.5.
- **`LogCelebration`** — full-screen post-log moment, itemises real XP awards.
- **`MascotSay`** — speech bubble, lines keyed to mascot state.

### Copy rules
Sentence case. Verb first ("Log a meal", not "Submit"). An action keeps its name
through the flow. Empty states are invitations, not apologies. Errors say what
happened and what to do, with no "Error:" prefix. **No exclamation marks** except
genuine milestones. Never moralise food — descriptive, never evaluative.

---

## 6. Testing and verification

```bash
npm test                  # web app + API contract + mobile unit suites
npm run build             # web TypeScript + production bundle
npm run lint              # web oxlint
npm run typecheck:api     # server/API TypeScript
npm run typecheck:mobile  # mobile TypeScript
npm run test:e2e          # Playwright browser flows
```

At the 2026-08-20 foundation checkpoint this is 114 web unit tests, 3 API
boundary tests, and 135 mobile unit tests. Treat counts as a snapshot, not a
target; the commands above are authoritative.

- **Unit tests are scoped to `src/**/*.test.ts`** via `vitest.config.ts`, so they
  do not collide with the Playwright specs in `e2e/`.
- **`TZ` is pinned to `America/New_York`** in `vitest.config.ts`. The streak tests
  cover both DST transitions and the local-vs-UTC day boundary; in UTC they would
  pass vacuously. There is a guard test that fails if the zone stops observing DST.
- `e2e/_*.mjs` are **ad-hoc verification scripts and are gitignored.** The
  convention is to write a throwaway `_probe-*.mjs` that drives the real app via
  Playwright, prints assertions, and screenshots. Use it — visual claims about
  this app should be verified, not assumed.
- **CI runs unit, API-boundary, type, build, and Playwright checks.** Keep package
  installation at both `web/` and `web/app/`: the API and client intentionally
  own different dependency boundaries.

---

## 7. Traps

1. **Two apps.** See §1. Check which one the request is about.
2. **`localDayKey()` is local, not UTC.** Never use `toISOString().slice(0,10)`
   for a calendar day — a 23:30 log in New York is the next day in UTC and the
   streak breaks.
3. **Never award XP outside `addEntry`.** It runs the full advance.
4. **`location.key` effects on Home.** The post-log effect calls
   `navigate('.', { state: null })` to clear router state, which changes
   `location.key` — its own dependency. A `setTimeout` started in that effect is
   killed by its own cleanup before it fires. Reset timers must be keyed to the
   state value itself. This bug has already been fixed twice; do not reintroduce it.
5. **Screenshots in `web/app/*.png`** (`p5-` … `p10-`) are verification artifacts,
   deliberately untracked. Do not commit them.
6. **Google OAuth 403 / GSI origin errors in dev are pre-existing** and unrelated
   to whatever you just changed.
7. **Do not change the palette.** See §5.

---

## 8. Current state

Implemented in `web/app`: onboarding with age gate, clamped goal calculation with
explanations, Home (streak badge, XP bar, mascot + speech bubble, calorie ring,
macros, quest, meals by slot, pinned raised log button), search-first log flow
with recents/favourites and quick add, AI photo/text logging, manual entry, saved
meals, Progress led by logging consistency, journey/badges, coach chat, settings
with pause tracking, support screen, export/import, strict local-state quarantine,
and authenticated versioned cloud snapshots. Pause hides numeric nutrition and
weight surfaces, suppresses engagement nudges, and bridges rather than increments
the streak.

Release gates still open:
- Apply `web/db/schema.sql` in every deployed Neon environment and audit dormant
  rows for historical BYOK values. If any are found, treat it as a credential
  incident and make an explicit rotation/notification decision.
- Cloud edits now use a durable, per-account IndexedDB snapshot and ordered
  outbox with stable mutation UUIDs, session/version metadata, reconnect retry,
  and explicit exported-copy conflict resolution. It is still whole-snapshot
  synchronization rather than entity-level reconciliation, so do not market it
  as automatic cross-device merging.
- Run the ten-log, under-20-second protocol plus haptic/accessibility checks on
  representative physical devices.
- Require a clean Playwright run in hosted CI; some managed Windows sandboxes
  cannot launch Chromium and therefore cannot supply local browser evidence.
- Complete production-like auth expiry/revocation, export/delete/restore,
  observability, rate-limit, security, accessibility, and app-store rehearsals.
- The `mobile/` app remains unshipped.
