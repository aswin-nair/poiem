# Core meal UI implementation

October 8, 2026 · Local delivery on `poiem-motion-return` · Comparison baseline `923f2e4e`

Implementation commits: `9e0257a2` (Today) and `3a90ddbb` (picker and Review). The following documentation/screenshot commit contains this review package.

Open the [before/after gallery](gallery.html). Choose Today, the log picker or Review, then phone/desktop, light/dark and viewport/whole page. The [state sheet](../CORE-MEAL-STATE-SHEET.md) records context, calculation, draft and recovery contracts. The [full delivery plan](../E2E-PLAN.md) remains active.

## Built

- **Today:** Daily calories, all three macros and a primary Log a meal action come first. Meals follow immediately on phones. The smaller greeting and chosen-step ring follow Meals; desktop retains the two-column summary/journal layout. Empty meal groups use quieter dashed outlines. Archive, guest, tracking-pause, date selection, confirmation and Undo behavior are retained.
- **Picker:** Photo, Describe, Manual and Saved precede search and recents. Three compact recent rows show initially; Show more and search expose the others. Portion and Log remain separate named targets, with a shared visible Today/destination header and specific accessible destination labels. Opening the picker keeps the keyboard closed.
- **Review:** A phone confirmation strip shows final calories, portion, destination and the single Log meal action. At keyboard/short-window height it returns to normal document flow. Desktop shows final macros in its existing sticky summary. Each changed nutrition field has Adjusted and Reset. Reset uses the original estimate at the current portion and retains other corrections. The original estimate is stored separately in the account-scoped draft; legacy drafts remain editable and explain when their original estimate is unavailable.
- **Character and feedback:** Existing tactile actions, confirmation, freestanding Momo scenes, protected controls, visit caps and motion preferences remain in use. Dense screens can defer a scene until a quiet space is available. This slice adds no new Momo story or provider request.

## Measured comparison

The before set was captured from an isolated archive of `923f2e4e`, using the same deterministic account, date, theme and browser settings as the after set. Phone captures use Chromium with iPhone touch settings at 390×844; desktop is 1440×900. These are visual comparisons of real running code, rather than concept mockups.

In the standard 390px light fixture, Meals begins at **490.16px**, previously **735.53px**: approximately **245px earlier**. Daily totals and the main log action are visible together. This measures layout access, not an observed reduction in task completion time. Geometry for both themes is retained in [before observations](before/observations.json) and [after observations](after/observations.json).

## Verification

| Check | Local outcome |
|---|---|
| Lint | 0 errors; 13 existing warnings |
| Unit/component suite | 890 tests in 101 files passed |
| Type check and production build | Passed |
| Chromium app integration | 189 distinct cases validated across the broad pass, focused repairs and dense-screen Momo addition |
| iPhone / Pixel browser emulation | 12 cases passed |
| Built `/app/` routes, metadata and essential assets | 3 cases passed |
| Extra touch layout/correction inspection | 48 observations across 14 device/theme combinations; no horizontal overflow or page errors |
| Canonical Linux visual suite | 63 cases passed, including four new Review correction views; no retries |
| Canonical Linux Momo interactions | All 13 cases passed; no retries |
| Gallery | 24 comparison combinations and 6 correction profiles loaded; no page errors or phone overflow |
| Independent source review | No actionable issues found; read-only review |

The initial broad run exposed seven failures after adding the second Today log action and changing layout. Selectors now identify the intended main-navigation or summary action. Settings panel checks wait for the selected destination URL before proceeding. All seven affected cases passed their focused rerun. Review checks use the numeric input role to distinguish a field from its new Reset button.

The local browser run accidentally included platform-specific visual comparisons on Windows through configuration merging; those comparisons were stopped and are excluded from the app integration count. Deliberate baselines are generated and checked in the project's pinned Linux Playwright environment. Only affected Today, picker and Momo compositions are replaced; four new Review correction views are added. Screenshot tolerance is unchanged.

The phone Momo screenshot initially found no safe placement in the completed ring fixture: the Details and nearby meal/Water controls correctly prevented a scene. The cameo fixture now uses the existing detailed commitment with an incomplete ring, which offers real reading space. A separate dense-screen case confirms deferral without consuming a visit. The production placement protections are unchanged.

Momo checks use explicit quiet desktop and phone viewports. Two local rechecks initially remained on the app loading screen under concurrent cold startup; both passed their single-worker rerun. The final Linux run checks the complete scene suite with no retries. This records the failed startup attempts as well as the later result.

The extra [touch observations](touch/observations.json) cover iPhone 13's default 390×664 browser viewport, Pixel 7's 393×727 viewport, 320/360/430/768px, and 844×390 landscape, in both themes. Review resets after reload and validation at a 400px-high window are captured for iPhone, Pixel and 320px. Those are browser emulation and viewport-resize checks; they do not prove native keyboard behavior.

All fixtures use synthetic accounts and deterministic responses. Local/mocked checks establish client navigation, focus, save guards, draft restoration, calculation and recovery. They do not establish real hosted authentication, provider/CORS availability, account sync, email delivery or native camera behavior.

## Build cost

Both revisions were built locally with the same installed dependencies. Values below are Vite's emitted main entry assets in decimal kB, not a full network trace or field performance measurement.

| Main asset | Baseline raw / gzip | Updated raw / gzip | Gzip increase |
|---|---|---|---|
| JavaScript | 531.17 / 168.74 kB | 534.54 / 169.59 kB | 0.85 kB |
| CSS | 330.29 / 54.96 kB | 335.96 / 55.78 kB | 0.82 kB |

The added layouts and correction/draft controls add approximately 1.67 kB compressed across these two assets. The existing main-chunk size warning remains. This is a small delivery cost for the new controls; the plan's broader route-splitting and lab/field measurements remain pending. No new animation library or mascot asset is introduced.

## Remaining work and release status

This is the first working core meal slice. The full M0/M1 first-session prototype, welcome/account continuity changes, three new Momo stories, Saved sorting, chart-day inspection, Coach drafting/copy, exact Settings search and the remaining recovery/performance work are still planned.

Physical iOS Safari and Android Chrome checks, native software keyboard/camera/address-bar behavior, Firefox/WebKit integration, screen-reader spot checks, participant task review, comparable performance traces and applicable cloud staging checks are pending. The local result is ready for review, but it does not claim the full release gate is complete.

Changes are saved locally. No push, PR, deployment or production model migration is performed in this delivery. The existing BYOK formats and server-only default credentials are unchanged. Previous deployable source reference: `923f2e4e`; local baseline comparisons are available in this gallery.
