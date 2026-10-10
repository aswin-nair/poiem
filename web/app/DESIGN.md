# Poiem Web — Design System

Design reference for the Poiem web app (`web/app`).

**A playful Neo Brutalist kitchen.** Warm paper, punchy yellow, pink, sky and mint panels, strong ink outlines, condensed headings and hard offset shadows give the daily app the same energy as its welcome poster. Colour distinguishes meals and macros; selected controls and primary actions have clear weight. Reading rows and form fields stay simple. Momo brings small, funny interruptions alongside the useful daily routine.

The October 2026 visual direction explicitly replaces the earlier flat-surface restriction. Controls and reading text remain upright and readable on desktop and phone.

This file describes the **Poiem system**: the tokens, components and screen rules the app is being rebuilt on. Screens that have not moved yet still run on the older stylesheets, which are contained in a lower cascade layer (see [Architecture](#architecture)).

## Expo

The Expo `mobile/` app stays a private alpha. It does **not** extract shared tokens from this vocabulary until a later converge-or-retire decision. Web ships the system first; carrying two design systems at once is the expensive option, so Expo waits. Shared *behaviour* (meal slots, streaks, notifications) already lives in `packages/domain` with JSON fixtures that both apps test against.

## Screen edges

The web viewport uses `viewport-fit=cover` and keeps pinch zoom enabled. `--k-safe-top/right/bottom/left` resolve the browser's safe-area insets; `--safe-bottom` aliases the bottom token for existing components. Each viewport edge has one owner in [`safe-area.css`](src/styles/screens/safe-area.css): the page shell protects normal content, while fixed navigation, toasts and action docks protect their own content. Phone sheets put the bottom inset inside the panel; centered dialogs put all four insets on the backdrop. Sticky headers add the top inset to their existing offset.

Momo scenes and speech use the same resolved tokens and visual-viewport bounds. They stay hidden when no safe space remains. Synthetic layout checks exercise these owners; physical Safari/Chrome checks still establish actual cutout, browser-chrome and keyboard behavior.

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
| `system` | [`fonts.css`](src/styles/system/fonts.css), [`tokens.css`](src/styles/system/tokens.css), [`components.css`](src/styles/system/components.css), [`foundations.css`](src/styles/system/foundations.css), [`momo.css`](src/styles/system/momo.css) | Self-hosted faces, tokens, shared component styles, and the phase-1 primitives |
| `screens` | [`kitchen.css`](src/styles/screens/kitchen.css), [`today.css`](src/styles/screens/today.css), [`flows.css`](src/styles/screens/flows.css), [`insights.css`](src/styles/screens/insights.css), [`you.css`](src/styles/screens/you.css), [`admin.css`](src/styles/screens/admin.css), [`first-run.css`](src/styles/screens/first-run.css), [`pages.css`](src/styles/screens/pages.css), [`account.css`](src/styles/screens/account.css) | Layout for every screen of the app: the log sheet; Today; the log flows and Saved; Insights; You; admin; the first run; Coach, Support and About; sign-in and the password screens |
| *(unlayered)* | [`styles/a11y.css`](src/styles/a11y.css) | Accessibility overrides (reduced motion, forced colours). Loaded last and allowed `!important` |

A later layer always beats an earlier one, whatever the selector specificity. The system can therefore restyle a legacy class such as `.pressable-face` or `.toast` with a plain class selector, and an old `#poster-ui` ID chain in `legacy` cannot override it.

### Rules

- **No ID selectors and no `!important`** in `system` or `screens`. The only exception is `a11y.css`.
- **Every colour, font, size and z-index comes from a `--k-*` token.** A literal hex value in a component is a bug.
- **New screens use `k-*` primitives.** Don't add rules to legacy sheets. When a screen moves to the system, delete the legacy rules it no longer uses.
- **Colourful fills always take dark ink.** Acid and persimmon backgrounds use `--k-on-acid` / `--k-on-action` in both themes.
- **No resting rotation** on text, controls, cards or navigation. Mascot artwork and 45/90-degree shape construction are allow-listed.
- **Curated hard shadows.** Overlays, navigation, heroes and Momo art keep offset blocks. Primary actions, selected controls, poster headings and the named feature panels may also use the shared hard-shadow tokens. Reading rows, charts and form fields stay flat; new shadow-bearing selectors must join the explicit design guard list.
- These rules are enforced by [`src/lib/designSystem.test.ts`](src/lib/designSystem.test.ts): cascade order, no IDs or `!important`, approved type and spacing steps, three surface variants, upright controls and an explicit shadow allow-list. Sizes are read in both px and rem.

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
| `--k-acid` | `#E9FF54` | `#E9FF54` | Hero, progress, quick add and selected controls |
| `--k-action` | `#FF784E` | `#FF996F` | The primary action: the + button, primary buttons |
| `--k-over-fill` | `#FF8055` | `#FF996F` | Meter fill past a goal. Over is information, never red |
| `--k-danger-ink` / `--k-danger-soft` | `#A8283A` / `#FFE4E9` | `#FFA5B0` / `#3E2930` | Delete only |
| `--k-focus` | `#20221D` | `#E9FF54` | 3px focus outlines |
| `--k-scrim` | ink at 48% | black at 62% | Sheet and dialog backdrops |
| `--k-butter` / `--k-peach` / `--k-pink` / `--k-sky` / `--k-mint` | `#FFE58A` / `#FFD2B8` / `#F7C6D9` / `#BFE6FF` / `#C4EED8` | darker tints (`#4A4122`…) | Meal icons (breakfast, lunch, snack, dinner, other) and food tiles by kind of food |
| `--k-on-tone` | `#20221D` | `#F8F1E4` | Icons on those tints |
| `--k-sky-strong` | `#4FB0E8` | `#6CC3F2` | Fat meter and water glasses |
| `--k-momo` | `#EFB6CC` | `#EFB6CC` | Momo's card |
| `--k-action-deep` | `#F0663A` | — | Stripes in the calorie meter |
| `--k-sticker-butter` / `--k-sticker-peach` / `--k-sticker-pink` / `--k-sticker-sky` / `--k-sticker-mint` | `#FFD45C` / `#FFB08A` / `#FFA9CE` / `#9CD9FF` / `#8AE7BC` | Same bright palette | Poster headers, macro tiles, meal headings and Momo cameos |
| `--k-sticker-ink` / `--k-sticker-muted` | `#20221D` / `#4A574D` | Same dark ink | Readable text and ring arcs on bright panels |

Muted text on the ground is about 6.9:1 in light and 9.8:1 in dark. Ink on persimmon is about 6.5:1.

### Type

| Token | Family | Use |
|-------|--------|-----|
| `--k-font-display` | Barlow Condensed 900, uppercase | Day title, the big kcal number, section and meal headings |
| `--k-font-body` | Plus Jakarta Sans | Everything people read and tap |
| `--k-font-mono` | IBM Plex Mono | Eyebrows, units, kcal values, dates in the week strip |

The text scale is `--k-text-xs` .75rem, `--k-text-sm` .875rem, `--k-text-md` 1rem and `--k-text-lg` 1.125rem. Unmigrated screens still set display sizes with `clamp()`. Migrated screens use the fixed contract steps below. Digits that line up use the `tabular` class.

Barlow Condensed, Plus Jakarta Sans and IBM Plex Mono are self-hosted as `woff2` under [`public/fonts/`](public/fonts/) via [`fonts.css`](src/styles/system/fonts.css) (`font-display: block`). The app does not load Google Fonts.

### Contract tokens (additive)

New names, landed beside the existing `--k-space-1…8` and `--k-text-*` values so unmigrated screens do not move. Value-named `--k-space-4` already means 16px, so the new ramp is role-named.

| Token | Value | Use |
|-------|-------|-----|
| `--k-space-xs` … `--k-space-4xl` | 4, 8, 12, 16, 24, 32, 48, 64px | Migrated spacing |
| `--k-pad-panel` | 16px below 768px, 24px above | Page and panel padding |
| `--k-type-meta` / `--k-type-label` / `--k-type-body` / `--k-type-lead` | 12 / 14 / 16 / 18px | Reading and chrome |
| `--k-type-section` | 18px, body face, sentence case | Section titles |
| `--k-type-panel` / `--k-type-figure` | 28px, condensed display face | Sheet and modal headings; a tile's own number |
| `--k-type-title` / `--k-type-metric` | 40 / 64px, condensed display face | Page titles and the calorie number |
| `--k-role-surface` / `--k-role-surface-raised` | ground / card | Surfaces in both themes |
| `--k-role-text` / `--k-role-text-muted` | ink / muted | Copy |
| `--k-role-border` / `--k-role-border-subtle` | line / hair | Rules |
| `--k-role-accent` / `--k-role-accent-ink` | acid / on-acid | The one bright moment |
| `--k-role-focus` | `--k-focus` | Focus rings |
| `--k-workspace` / `--k-nav-side` / `--k-mascot-rail` | 1200px / 220px / 112px | Desktop shell: content column, side nav, and the lane Momo waits in |

Surfaces are exactly three classes: `.k-surface`, `.k-surface.is-outlined`, `.k-surface.is-hero`. At most one hero per route.

### Space, shape, motion, layout

| Token | Value |
|-------|-------|
| `--k-space-1 … 8` | 4, 8, 12, 16, 20, 24, 32, 40px |
| `--k-radius-tile` | 8px (food tiles; almost everything else is square) |
| `--k-radius-sheet` | 18px (top corners of the phone sheet only) |
| `--k-shadow-sm` / `--k-shadow` / `--k-shadow-bold` | 3px / 4px / 6px hard offset in `--k-shadow-color` |
| `--k-border-bold` | 3px structural line on heroes and primary actions |
| `--k-press` / `--k-ease` | 90ms press, `cubic-bezier(.2, .8, .2, 1)` |
| `--k-shell` / `--k-gutter` | 480px column, 20px side padding (unmigrated screens) |
| `--k-tabbar-h` | 88px bottom clearance for the tab bar |
| `--k-z-nav` / `--k-z-toast` / `--k-z-sheet` | 100 / 800 / 900. Toasts sit above the tab bar but under sheets and dialogs, so an Undo never covers an open sheet |

---

## Components

### Shared components restyled by the system

These React components render the same markup as before. `components.css` gives them the system look everywhere, including screens that haven't moved yet.

| Component | Look |
|-----------|------|
| `PressableButton` | Square face and 2px line; primary has a 3px ink outline, persimmon fill and hard shadow. Press nudges the face 2px and removes the shadow. Focus ring on the face |
| `Toggle` / `RadioDot` | Square 52×30 switch; on is an ink track with an acid knob (reversed in dark) |
| `Toast` | Ink chip with ground text, 44px Undo and dismiss targets, stacked above the tab bar |
| `BottomNav` | Outlined paper bar with a hard shadow; active tab is butter yellow with dark ink. The + rises out of the bar in persimmon and turns acid while logging is open. From 1120px it becomes a sticky side rail, with a shadow on the selected destination |
| `SwipeRow` | Ink Edit action, danger-ink Delete action |
| `PortionSheet`, `DatePickerModal` | Square cards on the scrim, display-type titles, acid default choice |
| `LogMoment` | A small non-modal card for a special log (the first meal, a new wardrobe piece, a logged-day milestone, the Day ring closing): flat and outlined, fixed above the tab bar out of the page flow, Undo and Dismiss for ten seconds. It never takes focus and is announced once. A new piece arrives worn on its small Momo. Every other log gets the toast. The pure planner `lib/logFeedbackPlan.ts` decides the moment and `lib/logPresentation.ts` what it says |

### Primitives (`k-*`)

| Class / component | Use |
|-------------------|-----|
| `.k-screen` | Screen shell: ground, ink, body font |
| `.k-eyebrow` | Mono uppercase label above a heading or number |
| `.k-card` | Hairline card for grouped content (notices, Journey), padded with `--k-pad-panel` |
| `.k-section-head` | Sentence-case section heading in 18px body type, plus a mono summary, ruled underneath with a hairline |
| `Meter` / `.k-meter` | [`components/Meter.tsx`](src/components/Meter.tsx): a named `progressbar`. `tone="acid"` for the calorie budget, ink for macros; `over` switches to `--k-over-fill` |
| `.k-button` (`.is-primary`) | 48px bordered button |
| `.k-icon-button` | 44px square icon button; always has an `aria-label` |
| `.k-text-button` | Underlined 44px text action for secondary choices |
| `.k-chip` | 44px choice chip; `aria-pressed="true"` turns solid ink |
| `.k-food-tile` | 36px rounded tile holding a `FoodIcon` |
| `Sheet` | [`components/Sheet.tsx`](src/components/Sheet.tsx): modal dialog with focus trap and Escape. A bottom sheet on phones, centred and square from 720px |

### Shared primitives (`components/system/`)

Phase 1 rebuilds migrated screens on these. `PressableButton`, `Sheet` and `NutritionFields` stay as they are.

| Component | Use |
|-----------|-----|
| `AppShell` | Single column and bottom nav below 768px; wider content to 1119px. From 1120px it is three columns: the nav rail, a workspace up to 1200px, and an empty lane for Momo. A shell with no nav (the first run, the account screens) centres on 52rem instead |
| `PageHeader` | Eyebrow, title, optional subtitle and action. Replaces the seven bespoke header clusters |
| `Section` | Sentence-case section title, optional meta, one hairline divider |
| `Surface` | The three surface variants |
| `FormField` / `FieldGrid` | Label, hint or error, 1–3 columns from 768px |
| `FilterGroup` | Ink-when-chosen filters with a stable selected geometry |
| `MealRow` | Food tile, name, meta, kcal |
| `EmptyState` | Plate drawing and a short line |

The living catalogue is `/dev/components` ([`ComponentSheetPage.tsx`](src/pages/ComponentSheetPage.tsx)), captured in the visual project.

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

The four tabs, Coach, Support, About and the component reference render inside `AppShell`, so the column width, the page padding and the navigation are decided in one place. The log flows and the first run still build their own `div.app-shell`; they move in a later phase.

### Today (`/`)

[`pages/HomePage.tsx`](src/pages/HomePage.tsx), styled in [`styles/screens/today.css`](src/styles/screens/today.css). The day follows this order on a phone; desktop keeps the summary and Water beside Meals:

1. **Date bar.** Weekday and date eyebrow, the day as a display title ("Today", "Yesterday"), and a calendar button. Below it, a seven-day week strip with an acid dot on logged days. It has no arrows; the calendar reaches other weeks.
2. **Momo says hello.** A pink Momo card with a greeting by first name and time of day, and one warm line that fits the day ([`lib/todayGreeting.ts`](src/lib/todayGreeting.ts)). It never grades the numbers. A tap gets a playful line and a bop. "Roast me" appears only after consent.
3. **Budget.** The one bright acid card: kcal left (or "kcal over the guide") counts up, a striped persimmon meter fills, and "eaten / guide" sits underneath in mono.
4. **Macros.** Three small cards, each in its own colour: protein persimmon, carbs acid, fat sky blue.
5. **Meals.** Grouped as Breakfast, Lunch, Dinner, Snack (plus Other when used), each with a coloured icon and its kcal. Rows show a food tile tinted by kind of food, the name, time and P · C · F, and swipe to edit or delete. A meal you just logged flashes acid. Each group ends with an "Add breakfast" row that opens the log sheet for that meal.
6. **Water and notes.** A glass-count stepper and "Add a kitchen note", after Meals on phone. The decorative glasses appear on wider screens.

Today shows no poster masthead, stickers, streak chip or level chip. The ongoing streak, level, XP and freezes dashboard lives in the **Journey** card on Insights. A transient log confirmation may acknowledge its actual XP and level once. Tracking pause replaces the numbers with a notice. Guests see a claim-your-progress card and no log shortcuts.

### Motion and feedback

`logReceipt.ts` associates an accepted save with award keys; `logFeedbackPlan.ts` coalesces first meal, piece, milestone, ring, first daily and ordinary feedback, in that order. `logPresentation.ts` chooses one card or toast. `LogMoment.tsx` is a flat non-modal aside with immediate Undo/Dismiss and one polite atomic announcement. It does not take focus or move existing content; measured bottom clearance stays until Today unmounts so dismissal at the scroll end does not jump. Short-screen overflow keeps the card operable.

`DayRing.tsx` sits below Momo and above the sole calorie hero. Its static arcs describe chosen logging steps; nutrition targets do not affect completion. Completed steps open in a native Details disclosure. `progressNote.ts` names one next existing cumulative step and explains its logged-day threshold. Phone greeting artwork and type are compact. Paused tracking hides both. Reduced motion settles the same facts immediately.

Daily flat controls use one 2 px translation on `--k-press` (FAB 3 px), with no hover scale or stacked transform. Selections emit one `select` cue only when changed; saving has one outcome cue. Meters translate a full-width fill, preserving stripe period. Route arrival is at most 12 px/240 ms; the sheet opens immediately, with no child delays, at most 28 px travel and a 120 ms fade on quick reopening. Coach follows its own send and downward follow scroll; reading history suspends follow. This is fixed Standard behavior; whole-app intensity and new return hooks remain paused.

### Log sheet (`/log`)

[`pages/LogSheet.tsx`](src/pages/LogSheet.tsx). The + button and the "Add …" rows open the sheet **over the current page**. The URL is still `/log`: the router renders the page underneath from `location.state.background`, and the sheet on top. Opening `/log` directly shows the sheet over Today. Opening and closing keep the page's scroll position; closing returns focus to the control that opened it.

In order:

0. **Header.** The sheet appears immediately, without delayed children. Momo sits beside "Log a meal" and a kind prompt for the meal ("What’s on the lunch plate?").
1. **"Logging to" chip** in the meal's colour, beside its icon. It defaults from the time of day, or uses the meal an "Add …" row asked for.
2. **Search** across recent and saved meals. A bare number becomes "Quick add N kcal".
3. **Recent / Saved.** Explicit Log and Portion controls use the same row component as Saved. A normal Portion tap reveals quarter steps; the optional hold or context menu opens preset portions. Every row defines 1× as the saved or previous meal, including known grams, and shows its destination. Displayed and stored nutrition use the same precision.
4. **More ways to log:** Photo, Describe, Manual and Saved as tinted tiles with a one-line hint. Each carries the chosen meal.

The sheet never focuses the search field on open, so the phone keyboard stays down.

### Insights (`/progress`)

[`pages/ProgressPage.tsx`](src/pages/ProgressPage.tsx), styled in [`styles/screens/insights.css`](src/styles/screens/insights.css). Your routine over time, never a report card:

1. **Header.** A sky poster panel with "The bigger picture", condensed display title, intent line and a small checker graphic. Journey and Consistency have hard shadows; reading charts remain flat.
2. **Journey.** Day streak, total XP and freezes on peach, butter and sky tiles, the level name, and an acid meter to the next level.
3. **Milestones.** A dashed path of five stops (first log, 3, 7, 14 and 30 days) that turn acid when reached. Breaks never reset them.
4. **Consistency.** Days logged this month in display type, an acid heat grid with its legend, and a butter note comparing breakfasts with your own best week.
5. **Weight and calories.** Week or Month as ink-when-chosen chips. Zero or one weigh-in gets a compact observation and an explanation; change, average and the trend chart appear after two observations. Unset weight goals do not become empty tiles. Weight history opens in place; "+ Log weight" opens a sheet shaped like the log sheet.
6. **Most logged, ticket archive, achievements.** Foods with tinted tiles and a count (the top count on acid), recent logged days as flat coloured ticket links opening that local calendar day in Today, and unlocked badges on butter with the next one dashed. Journey explains XP and freezes in a disclosure.

From 768px these cards pair into two columns, so a wide screen reads as a dashboard instead of one tall strip.

### You (`/settings`)

[`pages/SettingsPage.tsx`](src/pages/SettingsPage.tsx), styled in [`styles/screens/you.css`](src/styles/screens/you.css):

1. **Header.** A pink poster panel with "Your space", display title, name and a checker graphic. An acid status stamp reads "Your routine · your pace", or the pause notice.
2. **Finder.** A bordered search field. Results turn acid under the pointer or keyboard focus.
3. **Appearance.** A bright butter card with Light, Dark and System as square tiles; the chosen one is acid with a compact shadow. It saves instantly.
4. **Category and Save.** Sticky at the top: a labelled native Category picker on phone, full section links from 768px, and a Save button only for pending profile or AI form edits. Everyday preferences apply immediately, with status based on applied values. Changing a preference preserves unrelated form drafts.
5. **Sections.** Condensed uppercase titles sit on outlined coloured tabs above a help line. Smaller labels stay mono uppercase. Daily goals are acid, peach and sky blocks with dark ink. Rows and square fields use stronger borders; delete actions use danger ink.
6. **Disclosures.** API authentication, Momo live AI and Momo's wardrobe open with an acid + that turns into ×, like the log button.

The column is capped at 880px from 768px, because settings are read as rows and a 1200px row is hard to follow. Each row with a field puts the control beside its label, stacking again below 360px.

AI setup starts with Poiem AI and its allowance. The server credential has no field or value in the product. “Use my own API” reveals a full endpoint URL, model and API format: OpenAI-compatible Chat Completions, Gemini generateContent or Anthropic Messages. Endpoint and model fields use the full width on phone. Authentication defaults with the format; its disclosure also allows a named key header or explicit no-auth service. The personal key is masked, remains local and is reused after sync or import only for its bound connection. Setup validates before Save, and invalid connections offer a route back to AI setup from logging or Coach. Custom services must allow browser requests; hosted connections use HTTPS. Photo logging needs a model with image support.

### Log flows (`/log/text`, `/log/photo`, `/log/manual`, `/review`, `/edit/:id`)

[`components/LogFlowUI.tsx`](src/components/LogFlowUI.tsx) and [`components/MealEntryFields.tsx`](src/components/MealEntryFields.tsx), styled in [`styles/screens/flows.css`](src/styles/screens/flows.css). Logging speaks the same language as Today:

1. **Header.** An outlined sky poster with numbered step stickers ("1 Add meal", "2 Review & log"), the current step on acid and a condensed title. Momo appears while the AI reads the meal; Hide Momo removes him there.
2. **Describe.** One bordered card holds the words. Example chips come in butter, mint, sky and pink; a tap fills the field.
3. **Photo.** A mint dashed drop zone with a raised acid camera sticker, Camera and Gallery buttons, and a Photo privacy disclosure.
4. **Thinking.** While AI reads the meal, an acid card shows Momo bopping and a Cancel button, which takes focus.
5. **Review and Edit.** The food name sits beside a tile tinted by kind of food, and its glyph follows the name as you type. Calories are the acid row; protein, carbs and fat have the same colour caps as Today's macros. Meal choices carry their meal colour, and the chosen one turns solid ink. The total is an acid card with the Log button, sticky beside the editor from 1000px.
6. **Manual.** The same header, macro colour caps and an acid "Ready to log" total.

"AI estimates can be off" sits on butter. Errors use danger ink on soft danger.

The chosen meal slot survives every logging method, Review, Back, reload after an explicit selection, and manual fallback. Describe and Photo show the destination even while AI is unavailable. Restored drafts offer Continue and Start fresh. Draft writes wait for hydration, preserve edits made before leaving, and cannot revive a draft cleared by another form or account action. Validation marks and focuses the specific field; optional Manual macros may stay blank.

### Saved (`/discover`, `/log/saved`)

[`pages/SavedMealsPage.tsx`](src/pages/SavedMealsPage.tsx). A "Your usuals" eyebrow and display title, a Logging to picker, search, meal filters as ink-when-chosen chips in an even grid (three across, six from 768px), then **Your saved meals** and **Recents** using shared repeat-meal rows. Both are labelled regions, and from 768px they sit side by side. A row has a tinted food tile, kcal, macro colours, an explicit Log button, Portion controls and Save. The destination comes from the logging flow or current time, and can be changed independently of the original meal's slot.

### First run (`/onboarding`)

[`components/OnboardingWelcome.tsx`](src/components/OnboardingWelcome.tsx), [`pages/OnboardingPage.tsx`](src/pages/OnboardingPage.tsx) and [`components/OnboardingCompanion.tsx`](src/components/OnboardingCompanion.tsx), styled in [`styles/screens/first-run.css`](src/styles/screens/first-run.css). The first run introduces Momo and ends with his first piece:

1. **Intro.** Three slides, each a tinted tablecloth card with Momo, a speech bubble and an acid stamp: **Meet Momo** (butter), **Read the steam** (sky) and **His first piece** (pink, Momo already trying on the Blossom clip). The second line of each title is the acid moment. On the steam slide, Cosy, Happy, Curious and Sleepy chips change his steam live, and the copy says his mood never comes from what you eat. Get started stays above the fold from 320px.
2. **Setup.** A step row with the chapter as a tinted chip, and an acid progress bar. Momo's card sits above the step on a phone and in a sticky column with the three chapters from 960px; his steam follows the answers. Each step is one bordered card: a tinted tag, a display title, square fields, and choices as square cards that turn acid when chosen.
3. **Targets.** "Your daily recipe" puts calories on an acid tile and gives protein, carbs and fat Today's colour caps.
4. **First meal.** Photo, Describe and Manual as tinted method tiles; Photo and Describe hand over to the AI flows. On the typed form, calories are the acid field, macros wear their colour caps, meal types carry their meal colour, and the total is an acid card. Whichever way it arrives, the first meal puts the Blossom clip on Momo and the "First meal in." moment shows "Momo’s first piece".
5. **Age notice.** A plain card with Change date of birth and Back to welcome.

### Coach (`/coach`)

[`pages/CoachPage.tsx`](src/pages/CoachPage.tsx), styled in [`styles/screens/pages.css`](src/styles/screens/pages.css). Momo sits beside the "AI Coach" display title. With no messages, an "Ask me anything" card offers three starters and an inline message field. Once the conversation starts, the field and persimmon Send button stick to the bottom of the column. Coach's replies are square cards beside a small pink Momo; your messages sit on the right in butter. Each message has a 44px Delete. A safety reply adds a mint "Talk to someone" list of support links. Coach, Support and About cap their reading measure at 880px inside the workspace, so prose never stretches the full width.

Failed or cancelled responses show their reason and a Retry button beside the original user message. Retry sends that prompt with its original preceding context, excluding messages since deleted, without adding another user message. Cancel response stops the request and keeps the user's message available to retry. Deleting the message whose response is pending aborts that request; Clear asks for confirmation, aborts any pending response and removes the conversation and recovery notices. Late responses from discarded requests cannot reappear.

A native "Provider & privacy" disclosure names the selected personal service or Poiem AI. It explains that chat is stored with Poiem data, sending a message shares limited recent log context with the provider, and that provider controls its own retention. Availability notices offer the relevant setup, sign-in or retry action.

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

### Momo's screen play

An authenticated visitor occasionally sees a freestanding Momo with a separate comic speech bubble. He waves, borrows an approved interface word, dances with it, or plays with water drops. The real heading gets one small wiggle and keeps its text and accessible name. The 42 local lines include screen comments and action reactions; private text and nutrition values never become joke material. No provider request, sound, haptic or focus grab is involved. Lines are drawn without replacement during the browser session. The scene module loads after eight seconds of eligibility, during the initial waiting period, so it is outside Today's first download.

- **Lively:** first visit after 18–35 seconds, then 75–150 seconds between visits; up to four per session.
- **Calm:** first visit after 45–90 seconds, then 180–300 seconds between visits; up to two per session and a static entrance.
- **Reduced motion:** the same text with static art and entrance. Show Momo off, Mute Momo and paused tracking disable cameos.
- **Clear workflows:** no cameos in logging, settings, Coach, Support, account, onboarding or admin screens. Typing, keyboards, dialogs, log receipts, Undo toasts and existing Momo speech defer them. A newly opened form or dialog dismisses an active cameo.
- **Placement:** the comic bubble, art and controls use available space near a visible heading or Water label. Interactive targets, calorie and macro readouts, Journey values and the bottom navigation keep their space. A compact scene keeps Momo visible on desktop, in landscape or when portrait space is crowded. Scrolling repositions the scene or ends it if there is no clear spot. Only a successful measured placement consumes a session visit.
- **Dismissal:** the named Close icon ends the scene immediately; Mute Momo saves the existing mute preference. The nine-second timeout pauses while hovered or keyboard-focused. Dismissal preserves focus and keeps measured scroll clearance until the route changes.

Implementation: [`MomoInterlude.tsx`](src/components/MomoInterlude.tsx), [`momoInterludes.ts`](src/lib/momoInterludes.ts) and [`momo-interlude.css`](src/styles/screens/momo-interlude.css).

### Action feedback

Every enabled button, link and selection has a small local reaction through [`ActionPlay.tsx`](src/components/ActionPlay.tsx). Inner icons hop, button faces squash and release, choices snap, and save and water actions use stars or drops. Navigation animates the arriving active icon. The action handler runs immediately; decoration does not move hit areas or focus targets.

Successful save changes pop the star, wardrobe changes give Momo a short happy hop, switches rebound after their state changes, and a newly filled decorative water glass hops once. Existing sound and haptic preferences remain in charge of those channels. Calm and OS/profile reduced motion suppress spatial feedback. Effects are finite, coalesced on rapid taps and cleaned up on navigation, preference changes, hidden tabs and unmount.

| Rule | Where |
|------|-------|
| **Celebrate rarely.** The full-screen "Logged." moment is for the day's first meal, streak milestones, and a log that brings Momo a new wardrobe piece. Every other log confirms with a toast, "Logged {meal}", with Undo | [`lib/logFeedback.ts`](src/lib/logFeedback.ts) |
| **Default meal by time.** Before 11:00 breakfast, before 15:00 lunch, 15:00–17:00 snack, before 21:00 dinner, then snack | `packages/domain/src/meals.ts`, fixture `packages/domain/fixtures/meals.v1.json` |
| **Manual entry starts blank.** Drafts are restored; recent meals are never pre-filled | [`pages/ManualEntryPage.tsx`](src/pages/ManualEntryPage.tsx) |
| **Over is information.** Past a goal the meter turns persimmon and the copy says "over the guide"; nothing turns red | `Meter`, Today budget |
| **One "Log a meal" control.** On Today, exactly one control has that accessible name: the + button | Today, e2e `home.spec.ts` |
| **Momo stays off the numbers.** Today's week strip and content, and the Insights, You, Coach, Support and About columns, are marked `data-mascot-avoid`; Support, Coach, Saved (`/discover`), Insights (`/progress`) and the account screens hide the walking Momo entirely. When the app column has no clear spot and the screen leaves room (about 752px and wider), the walking Momo waits in a side lane beside the column. On a phone he stays off Today, and the one-line note speaks for him | `pages/HomePage.tsx`, `mascot/MascotOverlay.tsx` |

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

Sixty-two pixel baselines plus one layout check, generated inside `mcr.microsoft.com/playwright:v1.61.1-noble` so local updates and CI share one font set. **Today** and **/dev/components** are locked at **320, 390, 768 and 1440px**. Log sheet adds **320px**; Today and log sheet add **844×390 landscape**. Describe, Photo, Manual, Saved, Insights, You and Coach are locked at **390 and 1440px**. The total includes four Momo cameo screenshots and four Review correction screenshots at 390 and 1440px in both themes. The phone cameo fixture uses an incomplete detailed ring with genuine quiet reading space; a separate interaction check preserves dense-screen deferral.

The current core meal build brings Today totals and Log forward, places methods above compact recents, and adds independent estimate resets plus a phone confirmation strip. See [the comparison gallery](docs/ui-enhancements/core-meal/gallery.html) and [implementation evidence](docs/ui-enhancements/core-meal/README.md) for scope, measured layout/build cost and remaining device checks.

Comparison is an absolute budget of **200 differing pixels per image**, not a ratio. A ratio scales with the page, so a tall screen collects thousands of free pixels and a real change slips through — which is how restoring You's macro caps once passed at ratio 0.01 against a 0.012 limit. Measured in the container, an unchanged screen differs by zero pixels, so the budget is slack for stray antialiasing rather than a tolerance for design drift.

```bash
npm run visual
npm run visual:update
npm run visual:sheet
```

Images live in [`e2e/visual/__screenshots__/`](e2e/visual/__screenshots__). Updating a baseline is an explicit `visual:update` commit, never automatic. A surface joins the list once its screen has been reworked, so the baseline records a decision rather than freezing a mess. The older matrix below still records the unmigrated screens to `test-results/`. `visual:sheet` takes a phase number and pairs that phase's before images with its after images: `npm run visual:sheet -- 2`.

Every change to a system screen is also checked at **360, 390, 768 and 1440px**, in **light and dark**:

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

Images land in `test-results/visual-matrix-*/` as `{surface}-{width}-{theme}.png`. Look at them before merging. A review pack captures the same run twice — once on the previous `main`, once on the branch — and keeps the 390 and 1440 pairs under `review/phase-N/`.

---

## Migration plan

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | One system: tokens, component styles, cascade layers, this document, screenshot matrix | Done |
| 1 | Daily loop: Today, log sheet, toast + Undo, rare celebrations, blank manual entry, snack default | Done |
| 2 | Log flows (Describe, Photo, Manual, Review, Edit) and Saved on the system; `meal-flow.css` deleted | Done |
| 3 | Insights and You on the system; charts drawn with system tokens | Done |
| 4 | Every app screen on the system (first run, Coach, Support, About, account screens); legacy sheets pruned to rules that can still match (458 → 176 KB, thirteen sheets deleted); then move the last shared pieces and remove the `legacy` layer | In progress |

The **visual reset** extends that work rather than replacing it. Baseline counts live in [`DESIGN-BASELINE.md`](DESIGN-BASELINE.md).

| Reset | Scope | Status |
|-------|-------|--------|
| 1 | Additive contract tokens, self-hosted fonts, visual seed, shared primitives, rebuilt Today, component reference, committed screenshots | Done, reviewed in [`review/phase-1.md`](review/phase-1.md) |
| 2 | Every remaining screen on `AppShell`; the raised chrome flattened across the log sheet, the five logging forms, Saved, Insights, You, Coach, Support, About and admin; header stamps and mascot marks removed; a desktop nav rail with a lane for Momo | Done, reviewed in [`review/phase-2.md`](review/phase-2.md) |
| 3 | The type contract closed: one new step at 28px, all 37 off-step sizes moved onto tokens, `TYPE_DEBT` gone and the six flattened sheets promoted to `MIGRATED`. Then the legacy pass: 36 dead class names, 51 rules, four sheets and their imports gone, with no pixel moved | Done |
| 3b | Override hunt: six more legacy sheets gone — their class names still render, but a higher layer already restyles every property they set. 44 baselines unmoved | This change |
| 4 | The remaining desktop compositions, per task | Next |
| 5 | Motion polish, baselines for whatever phases 3 and 4 rework, staging sign-off | Next |

When a legacy stylesheet has no class names left in `src/`, delete it and its import in the same change. When its class names still render but every property they set is restated in `system` or `screens`, delete the sheet the same way — the higher layer already wins. To prune, remove only rules whose selectors name classes that no source file contains. Welcome poster sheets stay: they are imported from JavaScript, not from `index.css`.

The pass is two scripts. `node scripts/dead-classes.mjs` rewrites [`.dead-classes.json`](.dead-classes.json) by reading every class a sheet styles and keeping the ones no source file mentions; a class counts as live if its name appears as a whole token anywhere in the source, and the fragment before a `${` marks a whole family live, so `` `tone-${kind}` `` protects every `tone-*`. Then `node .prune-css.mjs` reports what would go and `--apply` writes it. Where a class sits in a selector decides what its death means: a plain class is required, so the rule goes; inside `:is()` or `:where()` it is one alternative, so only that alternative goes and the rule survives for the rest; inside `:not()` a class that never renders always matches, so it can never remove anything. The proof is the 44 pixel baselines — inert CSS moves no pixels — plus the e2e suite for the screens they do not cover. A pixel-inert sheet is only a candidate: the baselines hide Momo, disable animation and skip welcome, onboarding and sign-in, so a sheet that only styles those will look empty for the wrong reason.
