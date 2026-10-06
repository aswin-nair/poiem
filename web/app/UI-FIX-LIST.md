# Poiem UI fix list

Reviewed **4 October 2026**, on branch **`poiem-ui-audit`**, against `DESIGN.md`.

## Review checkpoint

**Only the explicitly confirmed Today spacing defect has been fixed.** All remaining items below are proposals for review. No other application source, test configuration, API/data code, Expo code or visual baseline has changed. Nothing has been pushed and no PR has been opened.

Local fix commit: **`895fb7f8` — space Today summary cards below desktop breakpoint**.

- [Before/after comparison: 390px and 1440px, both themes](review/ui-audit-2026-10-04/before-after.html)
- [Measured coverage and Today gaps](review/ui-audit-2026-10-04/audit-summary.json)
- [Interaction, text enlargement and motion measurements](review/ui-audit-2026-10-04/interaction-summary.json)
- Full local captures, measurements and verification logs: `artifacts/ui-audit-2026-10-04/`.

## Coverage and method

The app ran at **http://localhost:5174**, with `visualSeed.ts` providing local signed-in data without a backend. Empty, guest, onboarding drafts, review drafts and a Coach conversation were seeded separately. No real credentials or AI keys were used.

| Viewport | Emulation |
| --- | --- |
| 320×844 | iPhone 13 descriptor |
| 360×844 | Pixel 7 descriptor |
| 390×844 | iPhone 13 descriptor |
| 430×932 | Pixel 7 descriptor |
| 768×1024 | iPhone 13 descriptor with tablet-sized viewport |
| 1440×1000 | Desktop Chrome |
| 844×390 | Pixel 7 descriptor, landscape |

Phone/tablet captures used `isMobile`, `hasTouch`, device scale factor and mobile user agents. The engine was **Chromium**, including for the iPhone descriptor; these are not Safari or physical-device results.

Every row below was captured at all seven sizes in **light and dark**. The main matrix contains **560 completed captures**, with another **14 splash captures**. Initial network-idle timeouts/lazy route fallback captures were repeated using visible route headings; there are no unresolved missing screen captures.

| Screen group | States covered | Captures |
| --- | --- | ---: |
| Today | Populated, empty, guest | 42 |
| Log flows | Sheet, Describe, Photo, Manual, populated/empty Review, Edit, Saved | 112 |
| Insights | `/progress` and `/journey` (which redirects to `/progress`) | 28 |
| You | Overview, Profile & goals, Preferences, Momo, AI, Account, Data | 98 |
| Coach | Empty and conversation | 28 |
| Information | About, Support | 28 |
| Account | Sign in, Sign up, Forgot password | 42 |
| Public welcome | `/welcome` | 14 |
| Introduction | All three panels | 42 |
| Onboarding | All eight steps plus blocked state | 126 |
| Splash | First visit at every viewport/theme; repeat-visit behavior | 14 |

Additional checks covered a 390×400 shortened viewport with focused fields; backdrop scrolling, Escape/Back and focus trapping; a six-week calendar; real touch-event swipes; own-key AI settings; long first names and food names; 99,999 total kcal; and all 40 main states at 320px with enlarged text. Text enlargement used both a 200% root font size and a stable doubling of computed font sizes, because several contract type tokens are fixed in pixels. This simulates text enlargement and does not certify iOS Dynamic Type behavior.

The main matrix suppresses the roaming Momo overlay for repeatable captures. A separate 24-observation pass enabled it on Today, You and Coach at 390/1440, both themes, normal and reduced motion.

## Fixed

### F01 — Today summary cards had no separation below 1120px

- **Screen / viewport / theme:** Today; 320, 360, 390, 430, 768 and landscape 844; both themes.
- **Cause:** `src/styles/screens/today.css:259`. The summary's grid/gap declaration was confined to the desktop media query.
- **Fix applied:** Move the existing `display: grid; gap: var(--k-space-xl)` rule into the base layer. No new tokens or overrides.
- **Evidence:** Each of the three stacked gaps changed **0 → 24px**. At 1440px each remained 24px; the local desktop screenshots are **pixel-identical** before/after in both themes. At 390px the full page grows **72px**, exactly three gaps.
- **Screenshots:** [390 light before](review/ui-audit-2026-10-04/today-390x844-light-before.png), [after](review/ui-audit-2026-10-04/today-390x844-light-after.png); [390 dark before](review/ui-audit-2026-10-04/today-390x844-dark-before.png), [after](review/ui-audit-2026-10-04/today-390x844-dark-after.png); [1440 light before](review/ui-audit-2026-10-04/today-1440x1000-light-before.png), [after](review/ui-audit-2026-10-04/today-1440x1000-light-after.png); [1440 dark before](review/ui-audit-2026-10-04/today-1440x1000-dark-before.png), [after](review/ui-audit-2026-10-04/today-1440x1000-dark-after.png).

## Remaining findings, ranked by visible impact

P1 = obscured content or broken modal behavior. P2 = frequent interaction, narrow-screen or text-resize defect. P3 = smaller presentation or maintenance issue. Items marked **source-confirmed / device verification** have a demonstrated code gap but need physical hardware for the final visible result.

### F02 · P1 — The page scrolls behind an open log sheet

- **Screen / viewport / theme:** Today → log sheet; reproduced at 390×844; both themes. Shared dialog implementation affects other modal consumers.
- **Observed:** A wheel gesture on the backdrop changed the underlying page's scroll position **300 → 656** while the sheet stayed open. Focus trapping does not prevent background scrolling.
- **Cause:** `src/hooks/useDialogFocus.ts:19` handles focus and dismissal without a scroll lock; `src/components/Sheet.tsx:20` uses it directly.
- **Proposed fix:** Add a shared, reference-counted modal scroll lock that preserves position and survives nested dialogs; restore it on the final dismissal. Verify actual touch backdrop scrolling, nested portion sheets and route Back.
- **Evidence:** `supplemental-metrics.json`, `kind: sheet`. Escape, backdrop dismissal, route Back and the focus trap passed independently.

### F03 · P1 — Focused Profile fields are covered by the bottom nav

- **Screen / viewport / theme:** You → Profile & goals, **390×400**, both themes.
- **Observed:** Height occupies y316–360 and Weight y356–400. A hit test at each field's center lands on a nav item. Bottom content padding lets fields be reached manually but does not make native focus scrolling safe.
- **Cause:** `src/styles/screens/you.css:8` only pads the main content; `:114` provides a sticky toolbar; `:190` only gives sections a top scroll margin. The actual document scroll root has no focus clearance for the fixed nav (`src/styles/system/components.css:139`). Fields at `src/pages/SettingsPage.tsx:359` and `:362` have no visibility adjustment. `--you-toolbar-height` is referenced but never assigned.
- **Proposed fix:** Give the shared shell measured header/nav scroll clearance, field scroll margins and an ensure-visible focus path that reacts to a shortened viewport. Measure the toolbar instead of relying on its unused fallback variable.
- **Evidence:** [Shortened Profile viewport](review/ui-audit-2026-10-04/keyboard-profile-dark.png); `final-evidence-metrics.json`, `kind: profile-keyboard`. A real iOS keyboard remains a device check.

### F04 · P1 — A six-week calendar is cut off in landscape

- **Screen / viewport / theme:** Today date picker showing August 2026; **844×390**, both themes.
- **Observed:** The modal is **402.875px** tall, from **y−6.4375 to 396.4375**, beyond both viewport edges. Its top and bottom border are clipped.
- **Cause:** `src/styles/screens/home.css:3` and `:16` center an uncapped modal; `src/styles/system/components.css:285` changes appearance without adding a height limit or scrolling.
- **Proposed fix:** Add a system-layer maximum block size based on `dvh` and safe areas, with a scrollable body and reachable header/dismissal controls. Keep the modal's external margins within the viewport.
- **Evidence:** [Landscape calendar](review/ui-audit-2026-10-04/calendar-landscape-light.png); `supplemental-metrics.json`, `kind: calendar`.

### F05 · P1 — Notch and landscape safe areas are incomplete

- **Screen / viewport / theme:** Shared headers, bottom nav, docked actions, sheets and toasts on notched phones; both themes. **Source-confirmed / device verification.**
- **Cause:** `index.html:8` omits `viewport-fit=cover`. Bottom inset rules already exist, but headers in `src/styles/system/foundations.css:24`, first-run bars in `src/styles/screens/first-run.css:19` and `:205`, and the sticky You toolbar at `you.css:116` have no deliberate top/side safe-area treatment.
- **Proposed fix:** Add `viewport-fit=cover` while retaining pinch zoom; introduce `--k-*` safe-area tokens and apply top, bottom and landscape side clearance consistently to shell chrome, sheets, docks and toasts. Do not add zoom restrictions. Check physical iPhone Safari before calling this resolved.

### F06 · P2 — Calendar and week-strip touch targets are too small

- **Screen / viewport / theme:** Today calendar at every width, and Today week strip at 320px; both themes.
- **Observed:** Calendar month arrows **30×30**, close **26×26**, day cells **33.14×33.14** at 320 and **40×40** at 390. The 320 week-strip cells are about **41.14px wide** with zero gaps.
- **Cause:** Legacy calendar dimensions at `src/styles/screens/home.css:43`, `:67`, `:83` and `:100` survive the system restyle. Week tracks at `src/styles/screens/today.css:16` divide the available width into seven equal columns.
- **Proposed fix:** Give shared calendar controls 44px floors in the system layer. Redesign the narrow date grid/strip or make it deliberately scrollable with a visible cue and sensible snapping. Seven 44px controls plus six 8px gaps require **356px before padding**, so simply increasing minimum widths cannot satisfy a 320px screen.
- **Evidence:** [320 dark calendar](review/ui-audit-2026-10-04/calendar-narrow-dark.png); calendar measurements and matrix target bounds.

### F07 · P2 — Meal swipe jumps at the midpoint

- **Screen / viewport / theme:** Today meal rows; real mobile touch events at 390px light; the same shared code applies in dark.
- **Observed:** Translation goes **−80 → −172px** as the finger moves from −80 to −81px; release settles to −148px. Vertical touch scrolling moved the page 418 → 563 while the row stayed at translation zero.
- **Cause:** `src/components/SwipeRow.tsx:42` derives `open` from the live offset, then `:71` uses that changing state as the drag origin.
- **Proposed fix:** Capture the starting offset at pointer-down and calculate every move from that stable origin. Preserve `pan-y` and the direction lock. Check Safari's edge-back gesture on a real phone.
- **Evidence:** [Touch swipe at the jump](review/ui-audit-2026-10-04/touch-swipe-midpoint-light.png); `final-evidence-metrics.json`, `kind: touch-swipe` (`hasTouch`, coarse pointer, no hover confirmed).

### F08 · P2 — Keyboard focus reaches covered Edit/Delete buttons

- **Screen / viewport / theme:** Today meal rows; reproduced at 390px light; shared geometry in both themes.
- **Observed:** Edit receives focus while the opaque meal face still covers it; the center hit test returns the row face instead of the action.
- **Cause:** `src/components/SwipeRow.tsx:89` leaves the actions tabbable behind the face at `:108`; `src/styles/components/swipe.css:12` and system styles have no focus-reveal behavior.
- **Proposed fix:** Reveal the actions when one receives focus, or provide a visible actions control with an accessible menu. Make the focused action's ring visible and restore sensible row state after action/dismissal.
- **Evidence:** [Covered focused action](review/ui-audit-2026-10-04/covered-swipe-action-light.png); `supplemental-metrics.json`, `kind: swipe`.

### F09 · P2 — You tabs hide the active destination and scroll cue

- **Screen / viewport / theme:** All You tabs below 1120px, especially AI/Account/Data; both themes, demonstrated at 390px.
- **Observed:** The right edge shows a clipped label; navigating directly to later sections leaves the selected tab outside the visible strip.
- **Cause:** `src/styles/screens/you.css:129` creates a scroll row, `:137` hides the scrollbar, and `src/components/SettingsNavigation.tsx:25` has no active-tab reveal/snap behavior.
- **Proposed fix:** Keep deliberate horizontal scrolling, show a persistent continuation cue, use 8px gaps and sensible snap alignment, and reveal the selected tab on navigation without stealing focus. Keep the existing section menu as another route to the destinations.

### F10 · P2 — Public welcome content clips at 320px

- **Screen / viewport / theme:** `/welcome`, 320px, both themes; more pronounced at 200% text.
- **Observed:** The “01 Plate / 02 Numbers / 03 Journal” sequence extends **x20 → 331.125** in the normal-size capture. At enlarged text it reaches x546.25; the header actions and “Living.” marker also exceed the viewport. Document width still reports 320.
- **Cause:** `src/styles/welcome-poster.css:163` uses a nonwrapping flex strip and `:164` forces nowrap phase labels; header actions at `:54` and the display marker at `:68` also retain intrinsic widths. Body clipping in `src/styles/base.css:36` masks the result.
- **Proposed fix:** Migrate these layout rules into a token-based screens stylesheet. Wrap/stack the sequence and header when content needs the space; constrain and wrap the display marker. Fix the children before reconsidering body clipping.
- **Evidence:** [320 welcome](review/ui-audit-2026-10-04/welcome-narrow-light.png); complete matrix element bounds and enlarged-text captures.

### F11 · P2 — Long names and large text break Today containment

- **Screen / viewport / theme:** Populated, empty and guest Today at 320px; both themes, normal and 200% text; also visible behind the log sheet.
- **Observed:** A long first name makes the Momo greeting extend to **x1040.64** at normal size and **x1989.28** at doubled type. With enlarged type and five-digit kcal, the populated Today layout also grows to **334.5px wide** inside a 320px viewport. Long food names wrap; the normal-size five-digit hero value fits.
- **Cause:** `src/styles/screens/today.css:84` lacks breaking for a long single-word name (`TodayMomo.tsx:35`, `todayGreeting.ts:42`). The summary/layout grids at `today.css:258` and `:259` use implicit auto minimum tracks; large-number/macro content can widen them.
- **Proposed fix:** Use `overflow-wrap:anywhere` for the greeting, explicit shrinkable grid tracks and minimum inline size zero for summary children. Reflow macro/number labels when enlarged type cannot fit; preserve the full name and values in data.
- **Evidence:** [Long-name Today](review/ui-audit-2026-10-04/today-long-name-light.png); `text200-today-320-*.png` and corresponding measurements.

### F12 · P2 — You controls overlap or escape at enlarged text

- **Screen / viewport / theme:** You Overview and Preferences, 320px at 200% text; both themes.
- **Observed:** Light/Dark/System labels and icons overlap their three fixed columns. Overview controls reach **x354.25** and Preferences content **x371.25**; body clipping prevents this showing up as document overflow.
- **Cause:** `src/styles/screens/you.css:97` fixes three appearance columns; `:228` leaves the settings-card grid's implicit minimum track, while `:241` keeps rows horizontal and `:246` prevents controls shrinking.
- **Proposed fix:** Allow appearance choices to wrap/reflow by content width; use `minmax(0,1fr)` and minimum inline size zero for cards; stack label/control pairs where needed. Preserve 44px controls and 8px gaps.
- **Evidence:** [Enlarged You overview](review/ui-audit-2026-10-04/you-text200-dark.png); `text200-you-preferences-320-*.png`; enlarged-text metrics.

### F13 · P2 — Insights stats, milestones and chart labels do not reflow

- **Screen / viewport / theme:** `/progress` and `/journey`, 320px at 200% text; both themes.
- **Observed:** The three stat tiles cannot contain their labels/numbers; the layout reaches **x336.84**. The initial root-font-only test already clipped “FREEZES” at x325.19. Milestone captions run into each other, and calorie-chart date labels overlap even though their SVG container stays within the viewport.
- **Cause:** `src/styles/screens/kitchen.css:189` forces three stat tracks at every width; `:191` and `:192` do not protect labels/numbers against intrinsic size. `src/styles/screens/insights.css:49` consumes another 20px of horizontal tile padding. Milestones at `insights.css:60` retain five tracks with 4px gaps; chart dates at `src/components/Charts.tsx:301` draw every label at fixed bar-center coordinates without a text-fit check.
- **Proposed fix:** Reflow stats and milestones using text-relative minimum track widths, shrinkable tracks and wrapping. Widen when content fits. Reduce chart tick-label density based on available width and text size, preserving every bar/value and accessible date information. Check text-range/SVG label intersections in addition to element-box overflow.
- **Evidence:** [Enlarged Insights](review/ui-audit-2026-10-04/insights-text200-dark.png); stress measurements.

### F14 · P2 — Other form/card grids grow past 320px at 200% text

- **Screen / viewport / theme:** Saved, Sign in, Forgot password, onboarding Body step; 320px, both themes.
- **Observed:** Saved reaches **x428**, Sign in **x354.45**, Forgot password **x328.59**, Body **x367.98**. Saved macro/action content, enlarged account headings and the optional-field summary expose intrinsic minimum widths that widen ancestor grids. Saved's long meal names also remain forced to a single clipped line.
- **Cause:** Saved's implicit single-column shell/card grids (`src/styles/screens/flows.css:521`, `:592`, `:603`) retain auto track minima; macro text at `:598` lacks shrinking/wrapping protection. Legacy `src/styles/screens/log.css:382` leaves meal names nowrap, and `flows.css:567` never resets it. Account card/title/form/field grids (`src/styles/screens/account.css:101`, `:115`, `:143`, `:145`) have auto minima; headings at `:116` and `:210` have no breaking protection. Onboarding workspace/form/content grids (`first-run.css:220`, `:262`, `:291`) retain the width of the nonwrapping optional summary (`:332`), so even the correct two-column field grid inherits an inflated container.
- **Proposed fix:** Apply shrinkable grid tracks and minimum inline size zero at the shared shell/card/form level; wrap or stack headings and optional-field tools when their content needs it. Reset Saved name whitespace and break long macro/value content deliberately. Verify complete visible controls, not just `scrollWidth`.
- **Evidence:** [Enlarged Saved](review/ui-audit-2026-10-04/saved-text200-dark.png), [Sign in](review/ui-audit-2026-10-04/login-text200-dark.png), [Body step](review/ui-audit-2026-10-04/body-text200-dark.png); `text200-forgot-320-*.png`; final enlarged-text measurements.

### F15 · P2 — Custom instructions is a 14px editable field

- **Screen / viewport / theme:** You → AI setup → own-key mode; 390px; both themes.
- **Cause:** `src/styles/screens/you.css:261` applies `--k-text-sm` (14px) to the textarea rendered at `src/pages/SettingsPage.tsx:642`.
- **Proposed fix:** Use the shared 16px body input type token. Confirm focus zoom in iOS Safari.
- **Evidence:** [AI instructions in dark mode](review/ui-audit-2026-10-04/ai-instructions-dark.png); computed font-size in supplemental own-key captures.

### F16 · P2 — Secondary links miss the 44×44 target floor

- **Screen / viewport / theme:** Photo manual-entry alternative on phones, welcome FAQ/header sign-in, desktop account link; both themes.
- **Observed:** Photo's inline alternative is about **15px high** at 320; welcome FAQ is about **32px wide**, its header Sign in is **36px high** in landscape, and desktop “Ada Chen” is about **17px high**.
- **Cause:** `src/components/LogFlowUI.tsx:129` puts the alternative inside the privacy paragraph styled at `flows.css:157`, outside the action-link floor. Welcome links at `WelcomePage.tsx:120`, `:250`, `:255` use styles at `welcome-poster.css:57` / `:297` without both dimensions. `BottomNav.tsx:70` uses an account-link style at `system/foundations.css:204` without a height floor.
- **Proposed fix:** Use the shared secondary-action primitive or inline-flex link with both 44px floors and token-based padding. Keep neighbouring targets at least 8px apart. Migrate the welcome rules rather than adding to legacy.

### F17 · P2 — Several interactive neighbours have less than 8px separation

- **Screen / viewport / theme:** Bottom nav, You tabs/appearance, meal choices, Manual servings, introduction controls and first-meal choices; affected at phone/tablet widths; both themes.
- **Cause:** Nav gap **4px** (`system/components.css:148`), You tab/appearance gap **6px** (`you.css:132` / `:97`), log meal gap **6px** (`kitchen.css:46`), Manual stepper gap **0** (`flows.css:488`), intro controls **4px** (`first-run.css:141`), first-meal choices **6px** (`first-run.css:441`). Account tabs also abut at `account.css:121`.
- **Proposed fix:** Use the shared 8px spacing token and deliberate wrapping/scrolling. Account for the 58px + button's actual occupied width in the nav rather than merely widening the gaps.

### F18 · P2 — Insights inherits a tilted emblem and inset surface shadow

- **Screen / viewport / theme:** Insights, visibly confirmed at 390 and 1440px; both themes.
- **Cause:** The legacy emblem's `transform:rotate(-6deg)` / rounded corners (`src/styles/product-ui.css:83`) survive `src/styles/screens/insights.css:57`, which resets the separate `rotate` property. The own-past callout inherits its inset shadow from `src/styles/screens/progress.css:263`; `insights.css:115` resets paint but not `box-shadow`.
- **Proposed fix:** In the screens layer, explicitly reset the relevant `transform`, radius and callout shadow. Remove obsolete legacy definitions during migration. Keep the emblem's artwork intact.

### F19 · P2 — First-run/account surfaces exceed the resting shadow/tilt rules

- **Screen / viewport / theme:** Introduction, onboarding choices/daily recipe/first meal, and account pages; both themes; desktop account receipt adds another tilted surface.
- **Cause:** Introduction label/stamp rotations (`first-run.css:94`, `:128`), selected-choice shadows (`:372`), companion (`:241`), recipe wrapper plus calorie tile (`:402`, `:412`) create extra raised surfaces. Account live label and speech bubble (`account.css:65`, `:94`) add shadows; label rotation at `:66`, desktop receipt shadow/rotation at `:274`, `:275`.
- **Proposed fix:** Flatten resting text, controls, choices and secondary surfaces; retain only one hero per route and allowed dialog/nav/toast shadows. Leave mascot artwork rotation allowed. Migrate the first-run/account sheets to the full token and design contract.

### F20 · P3 — Keyboard hints are missing; servings lacks a numeric hint

- **Screen / viewport / theme:** Account, onboarding, log flows, You and Coach fields; phone widths; both themes.
- **Cause:** No `enterKeyHint` attributes exist in `src`. Manual servings at `src/pages/ManualEntryPage.tsx:160` has no `inputMode`. Most nutrition/height/weight fields already use decimal modes and account fields have appropriate autofill types.
- **Proposed fix:** Add next/done/search/send hints by task and a decimal mode for servings. Audit text/name/email/password autocomplete values without changing stored data or validation semantics.

### F21 · P3 — Edit topbar barely overflows at enlarged text

- **Screen / viewport / theme:** Edit, 320px at 200% text; both themes.
- **Observed:** Back and Favourite cannot fit the nonwrapping row; its right edge is **x321.20**.
- **Cause:** `src/styles/screens/flows.css:436` fixes the topbar to a nonwrapping flex row; Favourite at `:437` retains its intrinsic label/icon width.
- **Proposed fix:** Allow the topbar to wrap/stack, while retaining clear button labels, target floors and shared spacing.

### F22 · P3 — First-meal macro labels wrap unevenly

- **Screen / viewport / theme:** Onboarding first meal, 320 and 390px; both themes.
- **Observed:** “Protein (g)” breaks into two lines while the adjacent macro labels remain one line.
- **Cause:** Three narrow tracks at `src/styles/screens/first-run.css:432`; label markup at `src/pages/OnboardingPage.tsx:697` mixes the name and unit.
- **Proposed fix:** Give all macro fields a consistent label/unit arrangement and reflow the field grid by available text width. Keep the nutrition values visible at enlarged type.

### F23 · P3 — First visit forces a splash even when local data is ready

- **Screen / viewport / theme:** Splash, all seven viewports; both themes.
- **Observed:** Seeded first visits displayed the splash and reached content at roughly **1.5–1.7s** after navigation; repeat visits skipped it and reached content around **0.3s**. These are local observations, not production timing guarantees.
- **Cause:** `src/lib/splashTiming.ts:10` only skips an unshown splash on a quiet/repeat session. `src/store/AppContext.tsx:698` / `:704` wait for the reveal even after hydration is ready, then enforce hold and exit timers (180/500/320ms).
- **Proposed fix:** Make the UI loader disappear when data is ready before it has been shown; retain a short hold only once it is visible. The timing branch currently lives in the store: isolate the presentation change and leave hydration, persistence, API and domain behavior untouched.
- **Evidence:** Splash first/revisit timestamps in `final-evidence-metrics.json`; [phone splash](review/ui-audit-2026-10-04/splash-phone-dark.png).

### F24 · P3 — Public welcome still uses `vh` and legacy styling

- **Screen / viewport / theme:** Welcome pinned demo at desktop 1440px; both themes. The pinned version is disabled on phones and the tested 844×390 landscape viewport.
- **Cause:** `src/styles/welcome-poster.css:157` / `:158` use `300vh` and `calc(100vh - 62px)`; `src/pages/welcome/PlateToNumbers.tsx:190` only mounts the pinned behavior above 1000px width and 700px height. The sheet also retains literal poster colours/type/spacing.
- **Proposed fix:** Migrate to token-based screen rules and dynamic viewport units. Do not describe this as a reproduced phone-height failure: the mobile route uses its static presentation. Splash/onboarding already use `dvh`, and the shared sheet uses a scrollable `90dvh` cap.

## Checks that did not produce another confirmed defect

- **Same breakpoint bug:** No additional visible container was found whose required grid/flex/gap exists only above a desktop breakpoint. Several desktop-only grids belong to sections hidden in the base layout.
- **Tokens:** All referenced `--k-*` names resolve to declarations; no alias cycles were found. CSS parsing succeeded. `--club-line` has no declaration in any parent scope, but its legacy search-field border at `src/styles/poiem-brand.css:36` is replaced by the later `screens/you.css:50` border, so it is dormant debt, not a reproduced missing border. Remove that obsolete reference during migration.
- **Overflow:** Every normal-size main matrix capture has `document.scrollWidth === clientWidth`. The welcome and stress failures demonstrate why element bounds must also be checked: existing body clipping hides overflow from the document-width assertion.
- **Bottom reachability:** At maximum scroll, the sampled final content cleared the fixed bottom nav in all normal-size mobile/tablet captures. Desktop uses a side rail and was excluded from the bottom-bar comparison. Focus clearance is a separate failure (F03).
- **Dialogs:** Log-sheet content scrolls within its height cap. Backdrop, Escape and route Back dismiss it; the focus trap remains inside the dialog. Nested portion dialogs have an explicit Escape guard, so there is no confirmed double-dismissal finding.
- **Shortened viewport:** Visible fields in the sampled log/account/onboarding/Coach flows stayed reachable, apart from the Profile defect. This checks layout at 400px height, not browser keyboard implementation.
- **Contrast / focus:** Light/dark screenshots were inspected across the matrix. Sampled visible text on solid backgrounds in Today/You/Coach had no low computed contrast ratio; gradients/artwork were excluded, so this is not a full contrast certification. Focus styles are present on the shared primitives; swipe action visibility is the confirmed keyboard issue. Icon-only calendar/nav controls examined have accessible names; no unnamed-control defect was confirmed.
- **Motion / assets:** No running CSS animations remained under reduced motion in the separate observations. Fonts completed loading and Momo used reserved artwork dimensions. Small layout-shift scores were observed (maximum about **0.00183**), including changing metric text; no large font/Momo jump was reproduced. Recheck slow first loads on physical phones and reserve metric width if a visible shift remains.
- **Touch:** The real touch-event vertical drag continued to scroll the page and did not open the meal row. No essential control was found to require hover. Safari edge gestures and retained hover appearance need hardware checks.

## Console and verification results

| Check | Result |
| --- | --- |
| `npm run lint` | Passed; 13 warnings |
| `npm test` | **657 passed**, 81 files |
| `npm run build:local` | Passed; existing chunk/timing warnings |
| `npm run test:e2e -- --workers=2` | **112 passed, 45 failed** out of 157 |
| Chromium functional project | 108 passed; 1 appearance keyboard failure |
| Visual project | 1 passed; 44 screenshot failures |
| Production project | 3 passed |
| Isolated appearance keyboard rerun | Passed |

The end-to-end suite **does not pass yet**. The appearance failure was `appearance.spec.ts:51` (ArrowLeft did not select Light during the full run); its isolated rerun passed, so a deterministic app defect has not been established.

Six Today failures at 320/390/768 in both themes show the intentional **72px** height increase from the new gaps. Inspected desktop Today and unchanged Coach diffs show text rasterization differences against canonical baselines without a corresponding layout change. The same-browser desktop Today before/after captures are pixel-identical. Other screenshot differences still need individual triage; there is no blanket approval to update them.

**No visual baselines were updated.** Full-run results were preserved before the isolated rerun under `artifacts/ui-audit-2026-10-04/e2e-full-results/`. Verification logs are in the same directory (`verify-lint.log`, `verify-unit.log`, `verify-build.log`, `verify-e2e.log`, `verify-e2e-appearance-recheck.log`).

The local Google sign-in widget reports **403 / origin not allowed for the client ID** on port 5174; other captures occasionally log external Google network errors. This is local origin/client configuration, not a demonstrated layout defect. No uncaught application exception was established from the completed main matrix. External requests also made `networkidle` unsuitable as an audit readiness signal; repaired captures wait for the actual screen content.

## Follow-up implementation and verification after this list is reviewed

1. Fix shared modal/focus/safe-area behavior, then targets and narrow/enlarged-text layouts, then design migration details. Apply changes only in system/screens layers and UI components; use `--k-*` tokens, no new ID selectors or `!important`.
2. Add the requested **mobile Playwright coverage** for iPhone 13 and Pixel 7 with genuine touch/isMobile contexts across the listed routes. The existing 390px desktop visual project is insufficient.
3. Add assertions for document **and element** bounds at 320/360/390/430, final-content clearance, target floors/gaps, Today card gaps, focus visibility at shortened heights, and the confirmed dialog/swipe failures.
4. Add Today and log-sheet **320px and landscape** visual baselines. Inspect each diff before accepting deliberate updates, including the old `277c9aad` Today baselines. Resolve canonical-platform rasterization separately from layout changes.
5. Rerun lint, units, local build and all end-to-end projects. Show 390/1440 before/after in both themes for each additional screen changed. Commit locally in small logical groups.

These test/configuration and application changes are intentionally pending at the requested **STOP checkpoint**.

## Real-phone confirmation, listed separately

- iOS Safari notch, home indicator and landscape side spacing after F05; headers, nav, docked actions, sheets and toasts.
- Actual keyboard opening/closing, focus scrolling, textarea zoom, autofill and dismissal; 400px emulation cannot reproduce Safari's visual viewport behavior.
- Address-bar collapse/expansion and orientation changes, including full-height first-run screens and modals.
- Pinch zoom and actual browser text enlargement / accessibility text settings, including long names and five-digit values.
- Edge-back swipe versus meal drag, vertical momentum scrolling and body lock under nested dialogs.
- Retained hover styles after touch, long press/context menu behavior and haptics.
- Slow/cold font and Momo loads, reduced-motion system settings, and reload/resume while a sheet is open.
