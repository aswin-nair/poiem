# Poiem Web — Design System

Design reference for the Poiem web app (`web/app`).

**Poster outside, kitchen inside.** The public welcome page, onboarding and sign-in keep the loud poster voice: acid yellow, condensed type, stickers. The daily app is a friendly kitchen: a warm paper ground and ink lines, one bright acid card for the number that matters, soft colours that tell meals and foods apart, and Momo saying hello. Someone logging their fourth meal of the day needs the number first. Joy comes from colour, illustration and small motion, never from slogans or stickers.

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
| `legacy` | The older sheets under `src/styles/` that still style something (base, toggles, swipe rows, the splash, mascot motion…) | Pruned to rules that can still match; deleted sheet by sheet |
| `system` | [`styles/system/tokens.css`](src/styles/system/tokens.css), [`styles/system/components.css`](src/styles/system/components.css) | Tokens, shared component styles, `k-*` primitives |
| `screens` | [`kitchen.css`](src/styles/screens/kitchen.css), [`flows.css`](src/styles/screens/flows.css), [`insights.css`](src/styles/screens/insights.css), [`you.css`](src/styles/screens/you.css), [`admin.css`](src/styles/screens/admin.css), [`first-run.css`](src/styles/screens/first-run.css), [`pages.css`](src/styles/screens/pages.css), [`account.css`](src/styles/screens/account.css) | Layout for every screen of the app: Today and the log sheet; the log flows and Saved; Insights; You; admin; the first run; Coach, Support and About; sign-in and the password screens |
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
| `--k-butter` / `--k-peach` / `--k-pink` / `--k-sky` / `--k-mint` | `#FFE58A` / `#FFD2B8` / `#F7C6D9` / `#BFE6FF` / `#C4EED8` | darker tints (`#4A4122`…) | Meal icons (breakfast, lunch, snack, dinner, other) and food tiles by kind of food |
| `--k-on-tone` | `#20221D` | `#F8F1E4` | Icons on those tints |
| `--k-sky-strong` | `#4FB0E8` | `#6CC3F2` | Fat meter and water glasses |
| `--k-momo` | `#EFB6CC` | `#EFB6CC` | Momo's card |
| `--k-action-deep` | `#F0663A` | — | Stripes in the calorie meter |

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
| `BottomNav` | Card-coloured bar with a 2px line; active tab is solid ink. The + is a 58px persimmon sticker rising out of the bar: it squashes when pressed, pops a small acid burst, and turns into an acid × while the log sheet is open |
| `SwipeRow` | Ink Edit action, danger-ink Delete action |
| `PortionSheet`, `DatePickerModal` | Square cards on the scrim, display-type titles, acid default choice |
| `LogCelebration` | The full-screen "Logged." moment on the ground colour, awards on acid; a new wardrobe piece arrives worn, named on acid |

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

## Momo

Momo is a plump cream dumpling with a twisted top knot: cute outside, a dry little tally clerk inside ([`packages/product/src/mascotLines.ts`](../../packages/product/src/mascotLines.ts) keeps the voice). He is "he" everywhere.

- **One drawing.** [`packages/product/src/momoArt.ts`](../../packages/product/src/momoArt.ts) holds him as plain shape data. [`components/Momo.tsx`](src/components/Momo.tsx) renders it on the web, `mobile/src/components/momo/MomoArtwork.tsx` renders it with `react-native-svg`, and `scripts/build-momo-asset.mjs` exports `public/brand/momo.svg`. Change him there, never in a copy.
- **Look.** Flat fills with a 2.5px ink line and one flat shade, big low eyes and pink cheeks. His colours are his own and do not change in dark mode.
- **Steam is his mood.** One line above his head: a curl when calm, a heart when pleased, a question hook while thinking, a pop when startled, a sparkle for a wink, Z's when sleepy. Moods come only from interaction, never from food, bodies or numbers.
- **Animation.** Arms, pupils, face, body and shadow keep their `momo-*` class names, so every pose in `mascot/behaviors.ts` still animates. Inline paint on each shape beats the older stylesheet rules.

### Wardrobe

[`packages/product/src/wardrobe.ts`](../../packages/product/src/wardrobe.ts) defines 19 pieces in five slots (head, face, neck, body, hand). Momo wears one piece per slot, saved as `gamification.outfit` and shown everywhere he appears.

| Rule | Detail |
|------|--------|
| **Logged days, not streaks** | Most pieces unlock at 3–120 total logged days, so a break never locks one |
| **Firsts** | First photo log, kitchen note, full water day, day with breakfast, lunch and dinner, saved meal |
| **Nothing sold, nothing taken back** | `ownedCosmeticIds` keeps every piece revealed or worn. The old single `equippedCosmeticId` seeds `outfit` once |
| **First piece** | The Blossom clip (`FIRST_PIECE`) is everyone's from the start. The first meal hands it over on any path (typed, photographed or described): Today puts it on Momo unless he already wears a hat, and the "First meal in." moment labels it "Momo’s first piece" |
| **Try-on reveal** | A log that finds a newly unlocked piece gets the "Logged." moment with Momo wearing it, then the piece is claimed so it shows once |
| **Dressing room** | [`components/MomoWardrobe.tsx`](src/components/MomoWardrobe.tsx) under You → Momo's wardrobe: preview, slot chips, every piece with its unlock rule, Surprise me, Take it all off |

---

## Screens on the system

### Today (`/`)

[`pages/HomePage.tsx`](src/pages/HomePage.tsx). Everything needed for the day is on the first screen, top to bottom:

1. **Date bar.** Weekday and date eyebrow, the day as a display title ("Today", "Yesterday"), and a calendar button. Below it, a seven-day week strip with an acid dot on logged days. It has no arrows; the calendar reaches other weeks.
2. **Momo says hello.** A pink Momo card with a greeting by first name and time of day, and one warm line that fits the day ([`lib/todayGreeting.ts`](src/lib/todayGreeting.ts)). It never grades the numbers. A tap gets a playful line and a bop. "Roast me" appears only after consent.
3. **Budget.** The one bright acid card: kcal left (or "kcal over the guide") counts up, a striped persimmon meter fills, and "eaten / guide" sits underneath in mono.
4. **Macros.** Three small cards, each in its own colour: protein persimmon, carbs acid, fat sky blue.
5. **Meals.** Grouped as Breakfast, Lunch, Dinner, Snack (plus Other when used), each with a coloured icon and its kcal. Rows show a food tile tinted by kind of food, the name, time and P · C · F, and swipe to edit or delete. A meal you just logged flashes acid. Each group ends with an "Add breakfast" row that opens the log sheet for that meal.
6. **Water and notes.** Eight little glasses that fill, a stepper, and "Add a kitchen note".

Today shows no poster masthead, stickers, streak chip or level chip. Streak, level, XP and freezes live in the **Journey** card on Insights. Tracking pause replaces the numbers with a notice. Guests see a claim-your-progress card and no log shortcuts.

### Log sheet (`/log`)

[`pages/LogSheet.tsx`](src/pages/LogSheet.tsx). The + button and the "Add …" rows open the sheet **over the current page**. The URL is still `/log`: the router renders the page underneath from `location.state.background`, and the sheet on top. Opening `/log` directly shows the sheet over Today. Opening and closing keep the page's scroll position; closing returns focus to the control that opened it.

In order:

0. **Header.** The sheet springs up and its parts rise in turn. Momo hops in with his question steam beside "Log a meal" and a kind prompt for the meal ("What’s on the lunch plate?").
1. **"Logging to" chip** in the meal's colour, beside its icon. It defaults from the time of day, or uses the meal an "Add …" row asked for.
2. **Search** across recent and saved meals. A bare number becomes "Quick add N kcal".
3. **Recent / Favourites.** One tap logs again; "Portion" (or press-and-hold) picks ½–2×.
4. **More ways to log:** Photo, Describe, Manual and Saved as tinted tiles with a one-line hint. Each carries the chosen meal.

The sheet never focuses the search field on open, so the phone keyboard stays down.

### Insights (`/progress`)

[`pages/ProgressPage.tsx`](src/pages/ProgressPage.tsx), styled in [`styles/screens/insights.css`](src/styles/screens/insights.css). Your routine over time, never a report card:

1. **Header.** "The bigger picture" eyebrow, a display title, a proud pink Momo, and an acid stamp: "Your routine. Not a report card."
2. **Journey.** Day streak, total XP and freezes on peach, butter and sky tiles, the level name, and an acid meter to the next level.
3. **Milestones.** A dashed path of five stops (first log, 3, 7, 14 and 30 days) that turn acid when reached. Breaks never reset them.
4. **Consistency.** Days logged this month in display type, an acid heat grid with its legend, and a butter note comparing breakfasts with your own best week.
5. **Weight and calories.** Week or Month as ink-when-chosen chips. Stat tiles (the latest weight on sky), a persimmon line and bar chart with an ink dashed goal line, and the weight history behind a row that opens in place. "+ Log weight" opens a sheet shaped like the log sheet.
6. **Most logged, ticket archive, achievements.** Foods with tinted tiles and a count (the top count on acid), recent logged days as coloured ticket stubs, and unlocked badges on butter with the next one dashed.

### You (`/settings`)

[`pages/SettingsPage.tsx`](src/pages/SettingsPage.tsx), styled in [`styles/screens/you.css`](src/styles/screens/you.css):

1. **Header.** "Your space" eyebrow, a display title, your name, an acid stamp, a pink Momo card and a mint status chip.
2. **Finder.** A bordered search field. Results turn acid under the pointer or keyboard focus.
3. **Appearance.** A butter card with Light, Dark and System as square tiles; the chosen one is solid ink. It saves instantly.
4. **Section rail.** Sticky at the top: section links as chips, with the current one in solid ink, and the save bar. A persimmon diamond shows while changes are unsaved.
5. **Sections.** Each title is a tilted tag in its own tint: Profile peach, Preferences sky, Momo pink, AI mint, Account butter, Data peach. Daily goals put calories on acid and give protein, carbs and fat Today's colour caps. Rows, square fields and edge-to-edge row buttons sit in bordered cards. Delete actions use danger ink.
6. **Disclosures.** AI setup and Momo's wardrobe open with an acid + that turns into ×, like the log button.

### Log flows (`/log/text`, `/log/photo`, `/log/manual`, `/review`, `/edit/:id`)

[`components/LogFlowUI.tsx`](src/components/LogFlowUI.tsx) and [`components/MealEntryFields.tsx`](src/components/MealEntryFields.tsx), styled in [`styles/screens/flows.css`](src/styles/screens/flows.css). Logging speaks the same language as Today:

1. **Header.** Step chips ("1 Add meal", "2 Review & log") with the current step on acid, a display title, and a small pink Momo leaning in. Hide Momo removes him.
2. **Describe.** One bordered card holds the words. Example chips come in butter, mint, sky and pink; a tap fills the field.
3. **Photo.** A dashed drop zone that turns butter on hover, Camera and Gallery buttons, and the privacy note in plain text.
4. **Thinking.** While AI reads the meal, an acid card shows Momo bopping and a Cancel button, which takes focus.
5. **Review and Edit.** The food name sits beside a tile tinted by kind of food, and its glyph follows the name as you type. Calories are the acid row; protein, carbs and fat have the same colour caps as Today's macros. Meal choices carry their meal colour, and the chosen one turns solid ink. The total is an acid card with the Log button, sticky beside the editor from 1000px.
6. **Manual.** The same header, macro colour caps and an acid "Ready to log" total.

"AI estimates can be off" sits on butter. Errors use danger ink on soft danger.

### Saved (`/discover`, `/log/saved`)

[`pages/SavedMealsPage.tsx`](src/pages/SavedMealsPage.tsx). A "Your usuals" eyebrow and display title, search, meal filters as ink-when-chosen chips, then **Your saved meals** as square cards and **Recents** as rows in one card. Each meal has a tinted food tile, kcal in display type, a macro bar in Today's macro colours, a portion stepper and a persimmon Log button.

### First run (`/onboarding`)

[`components/OnboardingWelcome.tsx`](src/components/OnboardingWelcome.tsx), [`pages/OnboardingPage.tsx`](src/pages/OnboardingPage.tsx) and [`components/OnboardingCompanion.tsx`](src/components/OnboardingCompanion.tsx), styled in [`styles/screens/first-run.css`](src/styles/screens/first-run.css). The first run introduces Momo and ends with his first piece:

1. **Intro.** Three slides, each a tinted tablecloth card with Momo, a speech bubble and an acid stamp: **Meet Momo** (butter), **Read the steam** (sky) and **His first piece** (pink, Momo already trying on the Blossom clip). The second line of each title is the acid moment. On the steam slide, Cosy, Happy, Curious and Sleepy chips change his steam live, and the copy says his mood never comes from what you eat. Get started stays above the fold from 320px.
2. **Setup.** A step row with the chapter as a tinted chip, and an acid progress bar. Momo's card sits above the step on a phone and in a sticky column with the three chapters from 960px; his steam follows the answers. Each step is one bordered card: a tinted tag, a display title, square fields, and choices as square cards that turn acid when chosen.
3. **Targets.** "Your daily recipe" puts calories on an acid tile and gives protein, carbs and fat Today's colour caps.
4. **First meal.** Photo, Describe and Manual as tinted method tiles; Photo and Describe hand over to the AI flows. On the typed form, calories are the acid field, macros wear their colour caps, meal types carry their meal colour, and the total is an acid card. Whichever way it arrives, the first meal puts the Blossom clip on Momo and the "First meal in." moment shows "Momo’s first piece".
5. **Age notice.** A plain card with Change date of birth and Back to welcome.

### Coach (`/coach`)

[`pages/CoachPage.tsx`](src/pages/CoachPage.tsx), styled in [`styles/screens/pages.css`](src/styles/screens/pages.css). A pink Momo card and an "AI Coach" display title. With no messages, an "Ask me anything" card offers three tinted starters and says where the chat is stored. Coach's replies are square cards beside a small pink Momo; your messages sit on the right in butter. Each message has a 44px Delete. A safety reply adds a mint "Talk to someone" list of support links. The message field and a persimmon Send button sit in a bar above the tab bar.

### Support and About (`/support`, `/about`)

Also in `pages.css`, sharing one frame: a back link, an eyebrow, a display title and square cards. **Support** stays quiet on purpose: no Momo, no jokes, and the phone numbers are its only emphatic element, as full-width bordered buttons. "In immediate danger" sits on soft danger. **About** carries the joy instead: an acid brand card and Momo in his pink card.

### Account screens (`/login`, `/forgot-password`, `/reset-password`)

[`pages/LoginPage.tsx`](src/pages/LoginPage.tsx) and [`components/FoodClubScene.tsx`](src/components/FoodClubScene.tsx), styled in [`styles/screens/account.css`](src/styles/screens/account.css). The acid poster keeps the brand voice: EAT. (solid), LOG. (outlined), LIVE. (on persimmon), Momo reacting to the form (sleepy while you type a password), his line, and an example meal. On a phone the poster is compact and the Create account button docks at the bottom until the keyboard opens. From 900px the poster and the form sit side by side. The forgot and reset password screens and the session check are one plain card.

### Starting up

The brand splash plays once per browser session. Reloads, deep links and later sign-ins open the page as soon as the data is ready; the splash only fades in if loading takes a noticeable moment. The first run, the account screens and Coach load on demand, so the four tabs and the log flows are all the first visit downloads.

### Still on legacy

The marketing welcome page (`/welcome`) keeps its own poster sheets. A few shared pieces are still styled by pruned legacy sheets (toggle base, swipe rows, the splash, the walking Momo), until phase 4 moves them into the system and removes the `legacy` layer.

---

## Behaviour that is part of the design

| Rule | Where |
|------|-------|
| **Celebrate rarely.** The full-screen "Logged." moment is for the day's first meal, streak milestones, and a log that brings Momo a new wardrobe piece. Every other log confirms with a toast, "Logged {meal}", with Undo | [`lib/logFeedback.ts`](src/lib/logFeedback.ts) |
| **Default meal by time.** Before 11:00 breakfast, before 15:00 lunch, 15:00–17:00 snack, before 21:00 dinner, then snack | `packages/domain/src/meals.ts`, fixture `packages/domain/fixtures/meals.v1.json` |
| **Manual entry starts blank.** Drafts are restored; recent meals are never pre-filled | [`pages/ManualEntryPage.tsx`](src/pages/ManualEntryPage.tsx) |
| **Over is information.** Past a goal the meter turns persimmon and the copy says "over the guide"; nothing turns red | `Meter`, Today budget |
| **One "Log a meal" control.** On Today, exactly one control has that accessible name: the + button | Today, e2e `home.spec.ts` |
| **Momo stays off the numbers.** Today's week strip and content, and the Insights, You, Coach, Support and About columns, are marked `data-mascot-avoid`; Support, Coach and the account screens hide the walking Momo entirely. When the app column has no clear spot and the screen leaves room (about 752px and wider), the walking Momo waits in a side lane beside the column. On a phone he stays off Today, and the one-line note speaks for him | `pages/HomePage.tsx`, `mascot/controller.ts` |

---

## Accessibility

- **Touch targets:** at least 44×44px for every control, guarded by `e2e/tap-targets.spec.ts`. That covers week days at 360px, steppers, "Portion" and toast actions.
- **Focus:** a 3px `--k-focus` outline with offset on every interactive primitive. It is acid in dark so it stays visible.
- **Dialogs:** `Sheet`, `PortionSheet` and `DatePickerModal` use `useDialogFocus`. Focus moves in, Tab is trapped, and Escape closes only the topmost dialog.
- **Navigation:** on a page change the new page's `h1` takes focus, waiting briefly for a screen that loads on demand. It shows no focus ring, because a heading is not a control. Opening or closing the log sheet does not move focus.
- **Structure:** meal groups are labelled regions, meters are named progress bars with a value text, and the + button has `aria-haspopup="dialog"`.
- **Motion:** sheets fade and rise in 160–220ms; `a11y.css` removes all animation under `prefers-reduced-motion: reduce`.

---

## Screenshot matrix

Every change to a system screen is checked at **360, 390, 768 and 1440px**, in **light and dark**:

| Surface | Path | Ready when |
|---------|------|-----------|
| Today | `/` | Calories meter visible |
| Log sheet | `/log` | "Log a meal" dialog visible |
| Describe | `/log/text` | "Your meal, your words" field visible |
| Manual | `/log/manual` | "Food name" field visible |
| Saved | `/discover` | "Saved" heading visible |
| Insights | `/progress` | Journey region visible |
| You | `/settings` | "You" heading visible |

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
| 2 | Log flows (Describe, Photo, Manual, Review, Edit) and Saved on the system; `meal-flow.css` deleted | Done |
| 3 | Insights and You on the system; charts drawn with system tokens | Done |
| 4 | Every app screen on the system (first run, Coach, Support, About, account screens); legacy sheets pruned to rules that can still match (458 → 188 KB, three sheets deleted); then move the last shared pieces and remove the `legacy` layer | In progress |

When a legacy stylesheet has no class names left in `src/`, delete it and its import in the same change. To prune, remove only rules whose selectors name classes that no source file contains, and prove it with a computed-style comparison of every screen before and after.
