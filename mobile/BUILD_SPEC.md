# Calorie Tracker — Build Spec

A phase-by-phase build specification. Written to be handed to an AI coding agent.

---

## 0. How to use this document

Work through phases **in order**. Each phase has a `Deliverable`, `Files`, `Spec`, and `Acceptance` block.

Rules for the agent:

1. **Do not skip ahead.** Phase N may only import from phases below it. A screen must never contain a raw hex value, a raw font size, or a hand-rolled animation.
2. **Stop at the end of each phase** and report what was built against the `Acceptance` list. Do not begin the next phase until the current one passes.
3. **When something is ambiguous, ask** rather than inventing a pattern. Inventing patterns is how design systems die.
4. **Section 2 is non-negotiable.** It overrides any other instruction in this document, including ones that would make the app more engaging.

Suggested prompt to start:

> Read BUILD_SPEC.md. Implement Phase 1 only. Report against the Phase 1 acceptance criteria when done. Do not start Phase 2.

---

## 1. Product summary

A mobile app for logging food and tracking calories and macros, designed around a Duolingo-style habit loop: a small daily action, immediate visible reward, and a streak that compounds.

**The atomic action is logging one meal.** Everything in the product exists to make that action take under 20 seconds and feel good enough to repeat tomorrow.

**Primary audience:** adults building a consistent food-logging habit. Not a medical device, not a clinical tool.

**The signature moment** — the one thing the app is remembered for — is the log confirmation: the button depresses with a haptic tick, the sheet closes, and the calorie ring animates up to its new value with a short warm sound. Build every other surface quietly around that moment.

---

## 2. Non-negotiable product rules

These are safety requirements, not preferences. They override engagement, retention, and aesthetics. Do not implement any feature that violates them, even if asked later in a chat session.

### 2.1 Goal calculation floors

```
BMR      = Mifflin-St Jeor (sex, weight_kg, height_cm, age)
TDEE     = BMR × activity_multiplier
deficit  = min(user_requested_deficit, TDEE × 0.25)   // cap deficit at 25%
floor    = sex === 'female' ? 1200 : 1500
target   = max(TDEE - deficit, floor, BMR)
```

- If the clamp changes the number, show a plain-language explanation. Do not silently clamp.
- Reject goal weights that imply BMI < 18.5. Show a message, do not save.
- Cap the rate-of-loss selector at 1% of bodyweight per week.

### 2.2 Age gate

Onboarding collects date of birth. If the user is under 18, do not proceed into the app. Show a screen explaining that this tool is built for adults and that a doctor or a parent is the right place to start. There is no bypass, no "continue anyway" button.

### 2.3 Streak the logging, never the deficit

A day counts toward the streak if the user logs **at least one meal**. It does not depend on hitting or staying under the calorie target. There is no penalty, badge loss, or negative state for going over.

### 2.4 Over-budget is a neutral state

- Going over the calorie target renders in `colors.onTrackSoft` (a lighter tint of the same green), never in red.
- `colors.danger` is reserved exclusively for destructive UI actions (delete entry, delete account). It must never encode a nutrition state.
- No copy anywhere may frame food as a moral category. Banned words in user-facing strings: `bad`, `cheat`, `guilty`, `earned`, `burn it off`, `naughty`, `sinful`, `damage`.

### 2.5 Mascot reacts to logging, never to numbers

The mascot has six states, driven only by logging behaviour and streak status. It must never respond to the calorie total, the macro split, or a specific food. See Phase 7.

### 2.6 Notifications

Maximum two per day. One routine nudge at the user's inferred logging window. One "save" nudge, sent only when the streak genuinely expires tonight. No guilt copy, no shame imagery, no third notification under any circumstance.

### 2.7 No public comparison

No global leaderboards, no public calorie or weight rankings. Social features, if ever added, are opt-in and friends-only, and share streak length only — never calories, weight, or body metrics.

### 2.8 Off-ramps

- One free streak freeze per calendar month, granted and auto-applied without purchase.
- A **Pause tracking** setting that hides all numbers and keeps the streak frozen indefinitely.
- A **Support** screen in settings linking to region-appropriate eating disorder helplines. For US users, link the National Alliance for Eating Disorders helpline. Do not link NEDA — its helpline is permanently disconnected.

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo (latest SDK), React Native, TypeScript in `strict` mode |
| Routing | `expo-router` (file-based) |
| Animation | `react-native-reanimated` v3 |
| Vector | `react-native-svg` |
| State | `zustand` |
| Persistence | `expo-sqlite` + `drizzle-orm` (local-first, no backend for MVP) |
| Dates | `date-fns` + `date-fns-tz` |
| Haptics | `expo-haptics` |
| Audio | `expo-audio` |
| Notifications | `expo-notifications` |
| Fonts | `@expo-google-fonts/fredoka`, `@expo-google-fonts/nunito-sans` |

Local-first is deliberate: the MVP has no server. Streak and points are **derived** from the entries table by pure functions, never stored as mutable counters. When a backend is added later, the same pure functions run server-side unchanged.

---

## 4. Repo structure

```
app/
  _layout.tsx
  (onboarding)/
    index.tsx            welcome
    profile.tsx          dob, sex, height, weight
    activity.tsx         activity level
    goal.tsx             lose / maintain / gain + rate
    review.tsx           computed targets, clamp explanation
  (tabs)/
    _layout.tsx
    index.tsx            Home
    history.tsx          History
    profile.tsx          Profile & settings
  log/
    index.tsx            Search / quick add  (modal)
    portion.tsx          Portion + confirm   (modal)
  entry/[id].tsx         Edit or delete an entry
  settings/
    support.tsx
    pause.tsx

src/
  theme/
    tokens.ts            Phase 1 — single source of truth
    ThemeProvider.tsx
    useTheme.ts
  components/
    primitives/          Phase 2
    domain/              Phase 3
  db/
    schema.ts            Phase 4
    client.ts
    queries/
  logic/
    nutrition.ts         BMR, TDEE, targets, clamps
    streak.ts            pure streak derivation
    points.ts
    quests.ts
  feel/
    haptics.ts           Phase 7
    sound.ts
    motion.ts
  analytics/
    events.ts            Phase 9

assets/
  fonts/
  sounds/
  mascot/
```

---

## 5. Phase 1 — Design tokens

**Deliverable:** a theme layer that every later phase consumes. No UI.

**Files:** `src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`

### Spec

Tokens are named by **role, not by colour**. `colors.onTrack`, never `colors.green`. A future rebrand should touch one file.

```ts
// src/theme/tokens.ts

export const palette = {
  light: {
    // Nutrition semantics — one job each, never reused
    onTrack:     '#16C47F',  // primary CTA, ring fill, success
    onTrackDeep: '#0E9A5F',  // the 4px button shadow face
    onTrackSoft: '#7FE0B5',  // over-budget overflow arc — NOT a warning
    streak:      '#FF6B35',  // flame, streak card only
    protein:     '#4A9DFF',
    carbs:       '#FFB020',
    fat:         '#C77DFF',
    xp:          '#4A9DFF',  // aliases protein deliberately; XP is informational

    // Destructive only. Never a nutrition state. See §2.4
    danger:      '#FF5A5A',
    dangerDeep:  '#D63E3E',

    // Surfaces
    background:  '#F7F8FA',
    surface:     '#FFFFFF',
    track:       '#F0F1F5',  // empty progress track
    border:      '#E6E8EE',

    // Text
    textPrimary:   '#26262B',
    textSecondary: '#5F5F68',
    textMuted:     '#8A8A94',
    textOnFill:    '#FFFFFF',

    // Tinted card backgrounds
    tintStreak:  '#FFF4EE',
    tintOnTrack: '#E9FAF3',
  },
  dark: {
    onTrack:     '#1FD98C',
    onTrackDeep: '#12A86B',
    onTrackSoft: '#4FA982',
    streak:      '#FF7F4F',
    protein:     '#6BAFFF',
    carbs:       '#FFC24D',
    fat:         '#D49BFF',
    xp:          '#6BAFFF',
    danger:      '#FF7070',
    dangerDeep:  '#C93B3B',
    background:  '#121316',
    surface:     '#1C1E22',
    track:       '#2A2D33',
    border:      '#2F323A',
    textPrimary:   '#F2F3F5',
    textSecondary: '#B0B3BB',
    textMuted:     '#7E828C',
    textOnFill:    '#FFFFFF',
    tintStreak:  '#3A211605',
    tintOnTrack: '#12251D',
  },
} as const;

export const type = {
  display: 'Fredoka_600SemiBold',   // numbers, headlines
  title:   'Fredoka_500Medium',
  body:    'NunitoSans_400Regular',
  bodyBold:'NunitoSans_600SemiBold',
  size: {
    hero: 44, display: 32, title: 20, subtitle: 17,
    body: 15, label: 13, caption: 11,
  },
} as const;

export const space  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const motion = {
  press: 100,       // button depress
  fill: 600,        // ring and macro bar fills
  sheet: 260,       // bottom sheet
  celebrate: 900,   // confetti, badge pop
} as const;
```

**Nothing pointy.** `radius.sm` is the minimum on any surface. Square corners are off-brand.

### Acceptance

- [ ] `useTheme()` returns the correct palette for the active colour scheme.
- [ ] Both fonts load via `expo-font` before the splash screen hides.
- [ ] `grep -rE "#[0-9A-Fa-f]{6}" src app --include=*.tsx` returns zero results outside `tokens.ts`.
- [ ] No numeric `fontSize` or `borderRadius` literal exists outside `tokens.ts`.

---

## 6. Phase 2 — Primitives

**Deliverable:** four unstyled-by-caller building blocks. Still no product screens.

**Files:** `src/components/primitives/{PressableButton,Card,ProgressBar,Sheet,Text}.tsx`

### 6.1 PressableButton — the signature component

This is the most important component in the app. Get it right before anything else.

The effect: the button looks physically raised, and depresses when pressed. React Native does not animate `borderBottomWidth` smoothly, so **do not** implement it as a border.

Implement it as two stacked views:

```
┌─────────────────────────┐  ← face  (colors.onTrack),     translateY: -4
│      Log a meal         │
└─────────────────────────┘
└─────────────────────────┘  ← shadow (colors.onTrackDeep), static, 4px taller
```

- Container is `position: relative`, height = faceHeight + 4.
- Shadow view fills the container.
- Face view is absolutely positioned, animated with a Reanimated shared value on `translateY`.
- `onPressIn`: `translateY → 0` over `motion.press` ms, and fire `Haptics.impactAsync(Light)`.
- `onPressOut`: spring back to `-4` (damping 15, stiffness 400).

Props: `variant: 'primary' | 'secondary' | 'destructive'`, `label`, `onPress`, `disabled`, `loading`, `fullWidth`.

Rules:
- `radius.lg`, `type.bodyBold`, letter-spacing 0.4, sentence case, verb first.
- **At most one `primary` button visible per screen.** If a screen needs two, one of them is `secondary`.
- `destructive` uses `danger` / `dangerDeep` and is only ever used for delete actions.
- Avoid the `disabled` state. Keep the button enabled and show an inline reason on press instead — a greyed button with no explanation is a dead end.

### 6.2 Card

`surface` background, `radius.md`, padding `space.lg`, hairline `border`. No drop shadows anywhere in this app — elevation is communicated by the raised-button treatment only, and mixing the two reads as noise.

Variant `tint: 'streak' | 'onTrack' | null` swaps the background for the matching tint token.

### 6.3 ProgressBar

Props: `value`, `max`, `color`, `height = 10`, `overflowColor?`.

- Track is `colors.track`, `radius.pill`.
- Fill animates with `withTiming(motion.fill)` **from its previous value**, not from zero on every render. A bar that restarts from empty on each mount is the single most common bug here.
- When `value > max` and `overflowColor` is set, render a second segment in that colour rather than clamping. Never clamp silently.

### 6.4 Sheet

Bottom sheet wrapper over `@gorhom/bottom-sheet` or a Reanimated implementation. `radius.xl` top corners, `motion.sheet` duration, backdrop at 40% opacity, swipe-to-dismiss enabled.

### 6.5 Text

Thin wrapper enforcing the type scale. Props: `variant: 'hero' | 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption'`, `color: keyof palette`. No `style` prop for font properties.

### Acceptance

- [ ] A scratch screen renders every primitive and every variant.
- [ ] The button press is visually and haptically convincing on a physical device. Test on hardware — the simulator does not fire haptics.
- [ ] `ProgressBar` animates from 40% to 70% smoothly when its prop changes, without flashing through zero.
- [ ] `ProgressBar` at `value=120, max=100` renders a visible overflow segment.
- [ ] No screen file contains a raw `<View>` with inline layout styling that duplicates a primitive.

---

## 7. Phase 3 — Domain components

**Deliverable:** the product-specific visual vocabulary. Presentational only — props in, no data fetching.

**Files:** `src/components/domain/{CalorieRing,MacroBar,MacroGroup,StreakBadge,QuestCard,MealRow,Mascot}.tsx`

### 7.1 CalorieRing

The hero element on Home. `react-native-svg` `Circle` with an animated `strokeDashoffset`.

```
Props: { consumed: number; target: number; size?: number }

radius        = (size / 2) - strokeWidth / 2
circumference = 2 * Math.PI * radius
progress      = consumed / target
strokeWidth   = size * 0.1        // 14 at size 140
```

- Rotate `-90deg` about the centre so the arc starts at 12 o'clock.
- Cap is `round`.
- Animate `strokeDashoffset` with `withTiming(motion.fill)` from the previous value. Use `useAnimatedProps`, not state.
- Centre label: remaining calories in `type.display`, with `kcal left` beneath in `type.label` / `textMuted`.
- **Over target:** draw a second arc on top in `onTrackSoft` representing the overflow, and switch the centre label to `{n} kcal over` in `textSecondary`. Same calm tone, no colour change to warning, no icon.

### 7.2 MacroBar / MacroGroup

`MacroBar` is a labelled `ProgressBar`: name on the left, `{current} / {target}g` on the right in `bodyBold`, bar beneath. `MacroGroup` stacks protein, carbs, fat with `space.md` between. Colours come strictly from `colors.protein | carbs | fat`.

### 7.3 StreakBadge

Flame glyph plus count. Two states:

- `idle` — slow scale pulse, 1.0 → 1.05 over 2s, infinite.
- `atRisk` — faster, wider pulse. **Only** when the user has not logged today and it is past 18:00 local. Never at any other time.

Wrap both animations in a reduced-motion check and disable them when the OS setting is on.

### 7.4 QuestCard

Tinted card with an icon, quest title, inline `ProgressBar`, and `n/m` counter. On completion, pop the card (scale 1.0 → 1.06 → 1.0 over `motion.celebrate`) and fire confetti once.

### 7.5 MealRow

Food name, portion, calories, macro dots. Swipe left reveals edit and delete. Delete requires a confirm.

### 7.6 Mascot

A single component taking `state: 'idle' | 'happy' | 'celebrating' | 'sleepy' | 'proud' | 'neutral'`.

State mapping — driven **only** by logging behaviour, per §2.5:

| State | Trigger |
|---|---|
| `idle` | Default on Home |
| `happy` | A meal was just logged |
| `celebrating` | A quest completed or streak milestone reached |
| `sleepy` | App opened, nothing logged yet today |
| `proud` | Streak milestone screens (7, 30, 100 days) |
| `neutral` | Everything else, including any day the user went over target |

There is no sad, disappointed, or crying state. Do not add one.

Shape language: build the mascot from rounded rectangles, circles, and rounded triangles only. Every shape has rounded edges. Vary the size rhythm between shapes rather than repeating one size — that variation is what stops flat vector art from looking generic.

### Acceptance

- [ ] A component gallery screen renders every domain component across every state.
- [ ] `CalorieRing` at `consumed=2400, target=2100` shows a calm overflow arc and a neutral "300 kcal over" label — no red, no warning icon.
- [ ] `StreakBadge` in `atRisk` only animates when both conditions are true.
- [ ] All animations halt when OS reduced-motion is enabled.
- [ ] No domain component imports from `src/db` or `src/logic`.

---

## 8. Phase 4 — Data layer

**Deliverable:** schema, migrations, queries, and the pure logic functions. No UI.

**Files:** `src/db/schema.ts`, `src/db/client.ts`, `src/db/queries/*`, `src/logic/*`

### 8.1 Schema

```ts
profile          // single row
  id, name, date_of_birth, sex, height_cm, weight_kg,
  activity_level, goal, weekly_rate_pct, timezone,
  daily_kcal_target, protein_g_target, carbs_g_target, fat_g_target,
  sound_enabled, haptics_enabled, tracking_paused, created_at

foods
  id, name, brand, serving_label, serving_grams,
  kcal, protein_g, carbs_g, fat_g,
  source ('custom' | 'builtin'), is_favorite, last_used_at

meal_entries
  id, food_id (nullable), custom_name, servings,
  kcal, protein_g, carbs_g, fat_g,
  meal_slot ('breakfast' | 'lunch' | 'dinner' | 'snack'),
  logged_at_utc,        // ISO string
  local_date            // 'YYYY-MM-DD', computed at write time in profile.timezone

points_ledger
  id, delta, reason, local_date, created_at        // append-only, never UPDATE

streak_freezes
  id, granted_local_date, consumed_local_date      // null until used

quests
  id, local_date, type, target, progress, completed_at
```

Index `meal_entries.local_date` and `meal_entries.logged_at_utc`.

`local_date` is stored, not computed at read time. This is what makes the streak survive travel across timezones.

### 8.2 Streak derivation — `src/logic/streak.ts`

Derived, never stored as a mutable counter. A counter drifts; a derivation is always correct.

```ts
export function deriveStreak(
  loggedDates: string[],      // distinct local_date, DESC
  freezeDates: string[],      // consumed_local_date
  todayLocal: string,
): { count: number; loggedToday: boolean; atRisk: boolean } {
  // Walk backwards from today.
  // A day continues the streak if it is in loggedDates OR in freezeDates.
  // If today is missing but yesterday is present, the streak is intact
  //   and still extendable — do not zero it until the day actually ends.
  // atRisk = !loggedToday && localHour >= 18
}
```

Write unit tests first, covering: no entries, single day, gap of one day with an available freeze, gap of one day without, a timezone shift forward and backward across midnight, and DST boundaries.

### 8.3 Nutrition — `src/logic/nutrition.ts`

Implement §2.1 exactly. The function returns both the target and a `clamped` reason string when any floor was applied, so the UI can explain it. Do not return a bare number.

### 8.4 Points — `src/logic/points.ts`

| Reason | Points |
|---|---|
| `meal_logged` | 10 |
| `first_log_of_day` | 15 |
| `protein_target_hit` | 20 |
| `quest_completed` | 25 |
| `streak_milestone` | 50 |

Nothing awards points for eating less, hitting a deficit, or ending the day under target. Per §2.3.

### Acceptance

- [ ] Migrations run on a fresh install and on upgrade.
- [ ] `deriveStreak` passes all listed test cases, including DST.
- [ ] `computeTargets` refuses a sub-floor target and returns a usable explanation string.
- [ ] `computeTargets` rejects a goal weight implying BMI < 18.5.
- [ ] Writing an entry stores `local_date` derived from `profile.timezone`, not device locale.

---

## 9. Phase 5 — Screens

**Build the log flow first.** Not Home. The log flow is the atomic action; if it is slow, nothing else matters.

### 9.1 Log flow — `app/log/index.tsx` + `app/log/portion.tsx`

Opens as a modal sheet from the Home FAB. Two steps, no more.

**Step 1 — pick.** Search field is autofocused on mount. Above the results, a horizontal row of **recents and favourites** — this is what makes repeat logging fast, since most people eat the same twenty things. Empty search shows recents, never a blank screen.

**Step 2 — portion.** Serving stepper, meal slot selector (pre-selected by time of day: before 11:00 breakfast, before 15:00 lunch, before 17:00 snack, before 21:00 dinner, else snack), live calorie and macro preview that updates as the stepper moves. One primary button: `Log it`.

On confirm: write the entry, award points, dismiss both modals, and return to Home with the ring animating up. See Phase 7 for the full choreography.

**Hard performance target: under 20 seconds from tapping the FAB to being back on Home, for a food already in recents.** Time this on a real device. If it is over, cut steps before building anything else.

Also provide `Quick add` — a raw calorie number with no food attached. Some days people will not log properly, and a quick add that keeps the streak alive is better than a skipped day.

### 9.2 Home — `app/(tabs)/index.tsx`

Vertical order, top to bottom:

1. Header row — `StreakBadge`, points total, level pill.
2. `CalorieRing`, with `{consumed} of {target} today` beneath in `textMuted`.
3. `MacroGroup`.
4. Today's `QuestCard`, if one is active.
5. Today's entries as `MealRow`s, grouped by meal slot. Empty state is an invitation, not an apology: a heading naming the space and one primary action.
6. Floating `Log a meal` button, pinned bottom, `variant="primary"`.

When `profile.tracking_paused` is true, replace the ring and macros with a calm card explaining that tracking is paused, and keep only the streak and the log button.

### 9.3 History — `app/(tabs)/history.tsx`

Month calendar with a dot on each logged day. Tapping a day shows that day's entries. Show **logging consistency** as the headline metric — days logged this month — not average calories or weight trend. What gets shown is what gets optimised, and consistency is the behaviour worth optimising.

### 9.4 Profile & settings — `app/(tabs)/profile.tsx`

Stats (streak, total logs, level), then settings: goals, units, sound, haptics, notifications, **Pause tracking**, **Support**, export data, delete account.

`Pause tracking` and `Support` are ordinary visible rows, not buried. Per §2.8.

### 9.5 Onboarding — `app/(onboarding)/*`

One question per screen, progress bar at top.

`profile.tsx` collects date of birth first. **Run the age gate immediately** on that value, before collecting anything else — do not gather height and weight from a minor and then refuse. Per §2.2.

`review.tsx` shows the computed target. If `computeTargets` returned a `clamped` reason, display it as a plain-language card above the number.

### Acceptance

- [ ] Logging a recent food takes under 20 seconds on a physical device, measured with a stopwatch.
- [ ] Search input is focused on mount with no extra tap.
- [ ] Entering a DOB under 18 blocks progression with no bypass path.
- [ ] Clamped targets show an explanation.
- [ ] Every screen composes only primitives and domain components.
- [ ] Pause mode hides all numbers and preserves the streak.

---

## 10. Phase 6 — Gamification engine

**Files:** `src/logic/quests.ts`, `src/logic/freezes.ts`, plus zustand stores

### 10.1 Quests

Generate one quest per day at first app open, seeded by `local_date` so it is stable across relaunches.

Allowed quest types:

| Type | Example |
|---|---|
| `log_n_meals` | Log 3 meals today |
| `hit_protein` | Hit your protein target |
| `log_before` | Log breakfast before 10am |
| `log_streak` | Log something 3 days running |

Every quest is about **logging behaviour**. Do not generate quests about eating less, staying under target, or avoiding a food group. Per §2.3.

### 10.2 Streak freezes

- Grant one freeze on the first app open of each calendar month.
- Auto-apply on a missed day if one is available. Do not ask, do not sell.
- Notify gently the next morning: `Your freeze covered yesterday. Streak safe at 23.`

This exists as a pressure valve. Losing a long streak is the most common reason people abandon a habit app permanently, and a free monthly freeze costs nothing and prevents most of that churn.

### 10.3 Levels

`level = floor(sqrt(totalPoints / 100)) + 1`. Cosmetic only — levels never gate features.

### Acceptance

- [ ] Quest is stable across app relaunches on the same day.
- [ ] No generated quest references restriction, deficit, or avoiding food.
- [ ] A simulated missed day with a freeze available preserves the streak silently.
- [ ] Points ledger is append-only — verify no `UPDATE` statements exist against it.

---

## 11. Phase 7 — The feel layer

This is the phase that separates the app from a differently-coloured spreadsheet. Do not cut it under schedule pressure.

**Files:** `src/feel/{haptics,sound,motion}.ts`

### 11.1 The log confirmation choreography

Sequenced, not simultaneous. This is the signature moment from §1:

```
t=0ms     Button depresses, Haptics.impactAsync(Light)
t=0ms     Write entry to SQLite
t=120ms   Sheet dismisses (motion.sheet)
t=260ms   Ring begins animating to its new value (motion.fill)
t=260ms   Confirmation sound plays — short, warm, ~200ms
t=300ms   Mascot switches to 'happy' for 2s, then back to 'idle'
t=860ms   If this completed a quest: card pops, confetti fires once
```

### 11.2 Sound

Three cues only: log confirm, quest complete, streak milestone. Warm and short. Respect the device silent switch and `profile.sound_enabled`. Default sound **on**, haptics **on** — but both toggleable in one tap from settings.

### 11.3 Motion inventory

| Element | Motion |
|---|---|
| Button | Depress on press, spring on release |
| Ring | Animate up from previous value |
| Macro bars | Stagger 60ms apart on screen focus |
| Streak flame | Slow idle pulse; faster only when at risk |
| Quest completion | Scale pop + one confetti burst |
| Screen transitions | Native stack defaults — do not customise |

Every animation checks `AccessibilityInfo.isReduceMotionEnabled()` and degrades to an instant state change.

### Acceptance

- [ ] Log a meal on a physical device. The full choreography fires in order.
- [ ] With reduced motion on, values jump instantly and nothing is broken.
- [ ] Silent switch suppresses sound.
- [ ] Nothing animates more than once per interaction — no permanently looping decoration except the streak flame.

---

## 12. Phase 8 — Notifications

**Files:** `src/notifications/*`

Two scheduled notifications, hard-capped. Per §2.6.

**Routine nudge.** Compute the user's median first-log time over the last 14 days. Schedule 30 minutes after it. If there are fewer than 5 days of data, default to 19:00. Skip entirely if the user has already logged today.

**Save nudge.** Fires only if all are true: streak > 0, nothing logged today, local time is 20:30, no freeze available. One per day maximum.

Copy rules — the tone is a friendly nudge from something that likes you, not a guilt trip:

```
GOOD  "Two minutes to keep your 14-day streak going."
GOOD  "Your streak's still alive — log anything to keep it."
GOOD  "Freeze used. Streak safe at 23."

BAD   "You've broken your promise to yourself."
BAD   "Duo is disappointed in you."          // no guilt, no sad mascot
BAD   "You're 400 calories over today."      // never mention the number
```

Notifications never reference calories, weight, or how much someone ate.

### Acceptance

- [ ] Never more than two notifications in 24 hours, verified by log.
- [ ] Routine nudge is suppressed once the user has logged.
- [ ] No notification string contains a calorie number or a banned word from §2.4.

---

## 13. Phase 9 — Instrumentation

**Files:** `src/analytics/events.ts`

Fire: `meal_logged` (with `slot`, `source: recent | search | quick_add`, `seconds_to_log`), `streak_extended`, `streak_broken`, `freeze_applied`, `quest_completed`, `goal_adjusted`, `goal_clamped`, `notification_opened`, `tracking_paused`.

Watch three numbers only: **day-1, day-7, and day-30 return rate.** Everything else is vanity.

Change one mechanic at a time. Duolingo's design works because it is relentlessly A/B tested, not because anyone designed it correctly the first time — assume your first guess at every threshold is wrong.

`seconds_to_log` is the leading indicator. If it climbs, retention follows it down about two weeks later.

---

## 14. Definition of done

- [ ] Zero hex values, font sizes, or radii outside `tokens.ts`
- [ ] Every screen composes only primitives and domain components
- [ ] Logging a recent food takes under 20 seconds on hardware
- [ ] Streak logic passes DST and timezone-shift tests
- [ ] Age gate has no bypass
- [ ] Goal calculator clamps and explains
- [ ] Grep the full string catalogue for §2.4 banned words — zero results
- [ ] `colors.danger` appears only on delete actions
- [ ] Mascot has no sad state
- [ ] Reduced motion respected everywhere
- [ ] Pause tracking and Support are reachable in two taps from Home
- [ ] Maximum two notifications per day, enforced in code not by convention

---

## Appendix A — Copy rules

Words are design material. Apply the same discipline as spacing.

- **Sentence case everywhere.** Buttons, headings, labels. "Log a meal", not "Log A Meal".
- **Verb first on every action.** "Log a meal", "Add food", "Save changes". Never "Submit", "OK", or "Continue" where a real verb exists.
- **An action keeps its name through the whole flow.** The button that says `Log it` produces a toast that says `Logged`.
- **Empty states are invitations.** A heading naming the space, one line of context, one action. Never "No data yet".
- **Errors say what happened and what to do.** One sentence, no apology, no "Error:" prefix. "That serving size looks off. Enter a number between 0 and 20."
- **No exclamation marks** on system copy. Reserve them for genuine celebration — streak milestones only.
- **Never moralise food.** See the banned-word list in §2.4. Nutrition copy is descriptive, never evaluative: "38g protein", not "great protein choice".

---

## Appendix B — What to build later

Deliberately out of scope for v1. Do not let these creep in:

- Barcode scanning and photo recognition — high effort, and a fast recents list solves 80% of the same problem
- Backend sync and accounts — local-first ships faster; the pure logic functions port unchanged when you add a server
- Friends and social — only after the single-player loop retains
- Weight logging and trend charts — adds a second number to feel bad about; add it only once the logging habit is proven
- Premium tier — decide what free looks like before deciding what paid is
