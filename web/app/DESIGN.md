# Poiem Web — Design System

Design reference for the Poiem web app (`web/app`).

**Poster outside, kitchen inside.** The public welcome page, onboarding and sign-in keep the loud poster voice: acid yellow, condensed type, stickers. The daily app is a quiet kitchen. It uses a warm paper ground, ink lines, one acid accent for progress and one persimmon colour for the main action. Someone logging their fourth meal of the day needs the number, not a show.

This file describes the **Poiem system**: the tokens, components and screen rules the app is being rebuilt on. Screens that have not moved yet still run on the older stylesheets, which are contained in a lower cascade layer (see [Architecture](#architecture)).

## Expo

The Expo `mobile/` app stays a private alpha. It does **not** extract shared tokens from this vocabulary until a later converge-or-retire decision. Web ships the system first; carrying two design systems at once is the expensive option, so Expo waits. Shared *behaviour* (meal slots, streaks, notifications) already lives in `packages/domain` with JSON fixtures that both apps test against.

---

## Architecture

### Cascade layers

[`src/index.css`](src/index.css) opens with one statement:

```css
@layer legacy, system, screens;
```

| Layer | Files | Role |
|-------|-------|------|
| `legacy` | Every older sheet under `src/styles/` (base, clay, poster system, page sheets…) | Kept working while screens move; deleted sheet by sheet |
| `system` | [`styles/system/tokens.css`](src/styles/system/tokens.css), [`styles/system/components.css`](src/styles/system/components.css) | Tokens, shared component styles, `k-*` primitives |
| `screens` | [`styles/screens/kitchen.css`](src/styles/screens/kitchen.css) | Layout for rebuilt screens: Today, the log sheet, the Journey card |
| *(unlayered)* | [`styles/a11y.css`](src/styles/a11y.css) | Accessibility overrides (reduced motion, forced colours). Loaded last and allowed `!important` |

A later layer always beats an earlier one, whatever the selector specificity. The system can therefore restyle a legacy class such as `.pressable-face` or `.toast` with a plain class selector, and an old `#poster-ui` ID chain in `legacy` cannot override it.

### Rules

- **No ID selectors and no `!important`** in `system` or `screens`. The only exception is `a11y.css`.
- **Every colour, font, size and z-index comes from a `--k-*` token.** A literal hex value in a component is a bug.
- **New screens use `k-*` primitives.** Don't add rules to legacy sheets. When a screen moves to the system, delete the legacy rules it no longer uses.
- **Colourful fills always take dark ink.** Acid and persimmon backgrounds use `--k-on-acid` / `--k-on-action` in both themes.
- These rules are enforced by [`src/lib/designSystem.test.ts`](src/lib/designSystem.test.ts), which checks the layer order, legacy containment, no IDs and no `!important`.

---

## Tokens

All tokens live in [`tokens.css`](src/styles/system/tokens.css). The light palette sits on `:root`; the dark palette redefines the same names under `:root[data-theme="dark"]`, which the app's theme setting stamps.

### Colour

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--k-ground` | `#FFF8EB` | `#191B1A` | Page background |
| `--k-card` | `#FFFDF7` | `#242723` | Cards, sheets, inputs, tab bar |
| `--k-sunken` | `#F3EBDB` | `#1E201E` | Food tiles, disabled fills |
| `--k-ink` | `#20221D` | `#F8F1E4` | Text, selected states, meter fill |
| `--k-muted` | `#5A564C` | `#C9C2B4` | Secondary text, labels |
| `--k-line` | `#20221D` | `#A5A795` | 2px structural borders |
| `--k-hair` / `--k-hair-strong` | ink at 14% / 34% | paper at 12% / 30% | Row dividers, meter tracks, dashed add rows |
| `--k-acid` | `#E7F258` | `#E7F258` | Progress (calorie meter), quick add, default portion |
| `--k-action` | `#FF8055` | `#FF996F` | The primary action: the + button, primary buttons |
| `--k-over-fill` | `#FF8055` | `#FF996F` | Meter fill past a goal. Over is information, never red |
| `--k-danger-ink` / `--k-danger-soft` | `#A8283A` / `#FFE4E9` | `#FFA5B0` / `#3E2930` | Delete only |
| `--k-focus` | `#20221D` | `#E7F258` | 3px focus outlines |
| `--k-scrim` | ink at 48% | black at 62% | Sheet and dialog backdrops |

Muted text on the ground is about 6.9:1 in light and 9.8:1 in dark. Ink on persimmon is about 6.5:1.

### Type

| Token | Family | Use |
|-------|--------|-----|
| `--k-font-display` | Barlow Condensed 900, uppercase | Day title, the big kcal number, section and meal headings |
| `--k-font-body` | Plus Jakarta Sans | Everything people read and tap |
| `--k-font-mono` | IBM Plex Mono | Eyebrows, units, kcal values, dates in the week strip |

The text scale is `--k-text-xs` .75rem, `--k-text-sm` .875rem, `--k-text-md` 1rem and `--k-text-lg` 1.125rem. Display sizes are set per screen with `clamp()`. Digits that line up use the `tabular` class.

### Space, shape, motion, layout

| Token | Value |
|-------|-------|
| `--k-space-1 … 8` | 4, 8, 12, 16, 20, 24, 32, 40px |
| `--k-radius-tile` | 8px (food tiles; almost everything else is square) |
| `--k-radius-sheet` | 18px (top corners of the phone sheet only) |
| `--k-shadow-sm` / `--k-shadow` | 3px / 4px hard offset in `--k-shadow-color` |
| `--k-press` / `--k-ease` | 90ms press, `cubic-bezier(.2, .8, .2, 1)` |
| `--k-shell` / `--k-gutter` | 480px column, 20px side padding |
| `--k-tabbar-h` | 88px bottom clearance for the tab bar |
| `--k-z-nav` / `--k-z-toast` / `--k-z-sheet` | 100 / 800 / 900. Toasts sit above the tab bar but under sheets and dialogs, so an Undo never covers an open sheet |

---

## Components

### Shared components restyled by the system

These React components render the same markup as before. `components.css` gives them the system look everywhere, including screens that haven't moved yet.

| Component | Look |
|-----------|------|
| `PressableButton` | Square face, 2px line, 3px hard shadow; primary is persimmon. Press moves the face 2px and drops the shadow. Focus ring on the face |
| `Toggle` / `RadioDot` | Square 52×30 switch; on is an ink track with an acid knob (reversed in dark) |
| `Toast` | Ink chip with ground text, 44px Undo and dismiss targets, stacked above the tab bar |
| `BottomNav` | Card-coloured bar with a 2px line; active tab is solid ink; + is a 50px persimmon square |
| `SwipeRow` | Ink Edit action, danger-ink Delete action |
| `PortionSheet`, `DatePickerModal` | Square cards on the scrim, display-type titles, acid default choice |
| `LogCelebration` | The full-screen "Logged." moment on the ground colour, awards on acid |

### Primitives (`k-*`)

| Class / component | Use |
|-------------------|-----|
| `.k-screen` | Screen shell: ground, ink, body font |
| `.k-eyebrow` | Mono uppercase label above a heading or number |
| `.k-card` | Bordered card for grouped content (notices, Journey) |
| `.k-section-head` | Display heading plus a mono summary, ruled underneath |
| `Meter` / `.k-meter` | [`components/Meter.tsx`](src/components/Meter.tsx): a named `progressbar`. `tone="acid"` for the calorie budget, ink for macros; `over` switches to `--k-over-fill` |
| `.k-button` (`.is-primary`) | 48px bordered button |
| `.k-icon-button` | 44px square icon button; always has an `aria-label` |
| `.k-text-button` | Underlined 44px text action for secondary choices |
| `.k-chip` | 44px choice chip; `aria-pressed="true"` turns solid ink |
| `.k-food-tile` | 36px rounded tile holding a `FoodIcon` |
| `Sheet` | [`components/Sheet.tsx`](src/components/Sheet.tsx): modal dialog with focus trap and Escape. A bottom sheet on phones, centred and square from 720px |

`FoodIcon` picks a Lucide glyph from the meal's emoji, then from its name ([`lib/foodGlyph.ts`](src/lib/foodGlyph.ts): "Chicken rice bowl" → drumstick, "Oat milk latte" → coffee), falling back to utensils. Stored meal data is never changed.

---

## Screens on the system

### Today (`/`)

[`pages/HomePage.tsx`](src/pages/HomePage.tsx). Everything needed for the day is on the first screen, top to bottom:

1. **Date bar.** Weekday and date eyebrow, the day as a display title ("Today", "Yesterday"), and a calendar button. Below it, a seven-day week strip with a dot on logged days. It has no arrows; the calendar reaches other weeks.
2. **Budget.** The one big number: kcal left (or "kcal over the guide"), an acid meter, and "eaten / guide" in mono.
3. **Macros.** Protein, carbs and fat in one ruled row, each with current / goal grams and a thin meter.
4. **Meals.** Grouped as Breakfast, Lunch, Dinner, Snack (plus Other when used). Each group shows its kcal. Rows show the food icon, name, time and P · C · F, and swipe to edit or delete. Each group ends with a dashed "Add breakfast" row that opens the log sheet for that meal.
5. **Momo.** One line from the mascot, with "Roast me" only after consent.
6. **Water and notes.** A small stepper (0–8 glasses) and "Add a kitchen note".

Today shows no poster masthead, stickers, streak chip or level chip. Streak, level, XP and freezes live in the **Journey** card on Insights. Tracking pause replaces the numbers with a notice. Guests see a claim-your-progress card and no log shortcuts.

### Log sheet (`/log`)

[`pages/LogSheet.tsx`](src/pages/LogSheet.tsx). The + button and the "Add …" rows open the sheet **over the current page**. The URL is still `/log`: the router renders the page underneath from `location.state.background`, and the sheet on top. Opening `/log` directly shows the sheet over Today. Opening and closing keep the page's scroll position; closing returns focus to the control that opened it.

In order:

1. **"Logging to" chip** with the meal. It defaults from the time of day, or uses the meal an "Add …" row asked for.
2. **Search** across recent and saved meals. A bare number becomes "Quick add N kcal".
3. **Recent / Favourites.** One tap logs again; "Portion" (or press-and-hold) picks ½–2×.
4. **Other ways to log:** Photo, Describe, Manual, Saved. Each carries the chosen meal.

The sheet never focuses the search field on open, so the phone keyboard stays down.

### Insights — Journey card

[`pages/ProgressPage.tsx`](src/pages/ProgressPage.tsx) opens with a `.k-card` "Journey": day streak, total XP, freezes, the level name, and a meter to the next level. The rest of Insights is still on legacy styles.

### Still on legacy

Describe / Photo / Manual / Review / Edit flows, Saved, the rest of Insights, You, Coach, Support, About, and the poster surfaces (welcome, onboarding, sign-in). The daily screens have already lost their poster strips and art; the poster system stays only where the brand voice belongs.

---

## Behaviour that is part of the design

| Rule | Where |
|------|-------|
| **Celebrate rarely.** The full-screen "Logged." moment is for the day's first meal and streak milestones. Every other log confirms with a toast, "Logged {meal}", with Undo | [`lib/logFeedback.ts`](src/lib/logFeedback.ts) |
| **Default meal by time.** Before 11:00 breakfast, before 15:00 lunch, 15:00–17:00 snack, before 21:00 dinner, then snack | `packages/domain/src/meals.ts`, fixture `packages/domain/fixtures/meals.v1.json` |
| **Manual entry starts blank.** Drafts are restored; recent meals are never pre-filled | [`pages/ManualEntryPage.tsx`](src/pages/ManualEntryPage.tsx) |
| **Over is information.** Past a goal the meter turns persimmon and the copy says "over the guide"; nothing turns red | `Meter`, Today budget |
| **One "Log a meal" control.** On Today, exactly one control has that accessible name: the + button | Today, e2e `home.spec.ts` |
| **Momo stays off the numbers.** Today's week strip and content are marked `data-mascot-avoid`. When the app column has no clear spot and the screen leaves room (about 752px and wider), the walking Momo waits in a side lane beside the column. On a phone he stays off Today, and the one-line note speaks for him | `pages/HomePage.tsx`, `mascot/controller.ts` |

---

## Accessibility

- **Touch targets:** at least 44×44px for every control, guarded by `e2e/tap-targets.spec.ts`. That covers week days at 360px, steppers, "Portion" and toast actions.
- **Focus:** a 3px `--k-focus` outline with offset on every interactive primitive. It is acid in dark so it stays visible.
- **Dialogs:** `Sheet`, `PortionSheet` and `DatePickerModal` use `useDialogFocus`. Focus moves in, Tab is trapped, and Escape closes only the topmost dialog.
- **Navigation:** on a page change the new page's `h1` takes focus. Opening or closing the log sheet does not.
- **Structure:** meal groups are labelled regions, meters are named progress bars with a value text, and the + button has `aria-haspopup="dialog"`.
- **Motion:** sheets fade and rise in 160–220ms; `a11y.css` removes all animation under `prefers-reduced-motion: reduce`.

---

## Screenshot matrix

Every change to a system screen is checked at **360, 390, 768 and 1440px**, in **light and dark**:

| Surface | Path | Ready when |
|---------|------|-----------|
| Today | `/` | Calories meter visible |
| Log sheet | `/log` | "Log a meal" dialog visible |
| Insights | `/progress` | Journey region visible |

Run the matrix with Playwright. It creates a throwaway local account, captures each surface full-page, and fails on sideways scrolling or runtime errors:

```bash
npx playwright test e2e/visual-matrix.spec.ts --project=chromium
```

Images land in `test-results/visual-matrix-*/` as `{surface}-{width}-{theme}.png`. Look at them before merging.

---

## Migration plan

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | One system: tokens, component styles, cascade layers, this document, screenshot matrix | Done |
| 1 | Daily loop: Today, log sheet, toast + Undo, rare celebrations, blank manual entry, snack default | Done |
| 2 | Log flows (Describe, Photo, Manual, Review, Edit) on `k-*` primitives; delete their legacy rules | Next |
| 3 | Saved, Insights, You | |
| 4 | Poster surfaces reviewed against the system tokens; remove unused legacy sheets and the `legacy` layer | |

When a legacy stylesheet has no class names left in `src/`, delete it and its import in the same change.
