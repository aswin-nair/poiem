# First session, account continuity and Momo scenes

October 9, 2026 · Local delivery on `poiem-motion-return` · Comparison baseline `cda79780`

Implementation commits: `7d9cd57a` (first session and account recovery) and `657e606c` (Momo performances). The following documentation commit contains the comparison package.

Open the [before/after gallery](gallery.html) and [Momo storyboards](momo/gallery.html). The [state sheet](../FIRST-SESSION-STATE-SHEET.md) records the first-session contracts; the [scene specification](../MOMO-STORYBOARD.md) records character timing and placement. The [full delivery plan](../E2E-PLAN.md) remains active.

## Built

- **Welcome:** Start opens setup. Three short steps explain setup, a real first meal and saving progress. Returning members have a visible sign-in path on narrow phones and on the public production route.
- **Setup:** Current section, remaining steps, next section and saved-resume messages are explicit. The active form precedes Momo on phones. Manual is the first guest method; Photo and Describe explain the account requirement and retain setup when opening sign-in. Methods and macros reflow at enlarged text. Adult eligibility, profile validation, targets and first-meal activation rules are retained.
- **Account entry:** Create account and Sign in are separate guest actions. Copy explains unfinished setup, device progress and the existing account's authority. Phone forms appear before the poster; desktop retains the two-column layout. An explicit setup handoff copies valid guest answers only into an unconfigured account with no existing account draft. The guest source is retained.
- **Session recovery:** Expiry and deliberate sign-out have distinct client handling. An allowed task can resume once after the same account and its drafts hydrate. A missing review draft falls back to the meal picker; a missing edited meal falls back to Today. The chosen journal day and Settings panel can resume. Different-account sign-in, deliberate sign-out and expired/malformed return records clear the return. The record contains account-scoped navigation only and expires after 30 minutes; credentials, meal contents, images and receipts are excluded.
- **Password recovery:** Errors and confirmation receive focus. Email can be changed after a request without losing the entered address. Missing or expired reset links have an action to request a fresh link. Success returns to sign-in with a password-updated message. Only explicit setup/claim flags survive recovery links; the reset token is not forwarded.
- **Momo:** Three finite prop stories join the existing local line pool: ticket-to-plane, sign polishing and a star waiter. Existing first scenes, visit caps, protected controls, interruption and cleanup rules remain. Calm and reduced motion show static props; off, mute and tracking pause suppress interludes. No new animation library or provider call is added.

## Comparison evidence

The before set runs the archived baseline and the after set runs the updated application, with matching synthetic state, date, theme and browser settings. Eight entry/setup/account/recovery screens are captured at 390×844 and 1440×900, in both themes, as whole pages and initial viewports. The observations contain 32 states per revision with no page errors or horizontal overflow.

In the 390px light fixture, the Age form begins at **203.19px**, previously **295.58px**: about **92px earlier**, with the companion after it. The unfinished-setup account card begins at **74px**, previously **378.84px**: about **305px earlier**. These measure access to the forms, not participant task completion time. Values are in [before observations](before/observations.json) and [after observations](after/observations.json).

Momo has 12 new phone/desktop light/dark views and nine phone story-beat frames. These are captured running scenes with finite CSS keyframes sampled at named phases and real pose timers advanced through the app clock. They are review fixtures, not replacements for locked visual baselines. [Capture observations](momo/manifest.json) record stage bounds, focus, errors and protected-control collisions; none are reported in the set. Static screenshots alone do not establish motion behavior; the timed browser checks cover that separately.

## Verification

| Check | Local outcome |
|---|---|
| App source, scripts and browser-check lint | 0 errors; 13 existing warnings |
| Full unit/component suite | 928 tests in 106 files passed |
| Final focused design/account/continuity units | 36 passed |
| Type check and local production build | Passed |
| Daily-use Chromium regressions | 151 distinct cases validated across the broad run and focused rechecks |
| Welcome behavior | 5 cases passed |
| New entry/recovery behavior | 7 cases passed |
| Setup and first-meal browser checks | 12 cases passed across focused runs |
| Account/setup continuity | 3 local-account journeys passed |
| Cloud-client recovery simulations | 6 journeys passed; all API responses intercepted locally |
| New and existing Momo scene behavior | 35 cases passed |
| iPhone / Pixel Chromium emulation | 12 distinct cases validated across the broad run and isolated rechecks |
| Final built public and `/app/` routes/assets | 4 cases passed |
| Pinned Linux screenshots | 63 cases passed, no baseline updates or retries |
| Galleries | All 64 comparison selections and 12 Momo views loaded, with no page errors or phone overflow |

The broad daily-use run initially passed 149 of 151 cases. Signup still expected its old Continue label; it now checks Create account and passes. A Settings cross-panel save check failed once during the concurrent run and passed its isolated focused rerun with its original assertions. The 12-case Settings/signup recheck passed. Two initial iPhone light-route checks did not reach Saved during concurrent startup; both passed the one-worker rerun with unchanged assertions. These earlier failures remain part of the evidence.

The final setup/continuity pass validated 13 of 15 cases on its first run. Its two initial phone setup cases remained on Opening beyond the five-second assertion timeout during concurrent startup; both passed the one-worker recheck, retaining every original step, contrast, focus and completion assertion. Together the focused runs validate all 12 setup cases and three local continuity journeys.

The local recovery fixture initially looked for the cloud-only Forgot password link on the local backend. It now checks local return context separately; the full link traversal is verified in the intercepted cloud-client suite. No recovery email or live account/provider request is made by these checks.

The default lint invocation scanned generated reports and dependencies in this worktree and was stopped. The reported source result uses explicit application, browser-test, script and configuration paths. The existing main JavaScript chunk size warning remains.

## Build cost

Both revisions were built with the same installed dependencies. These are Vite's emitted assets in decimal kB, not a full download or interaction trace.

| Asset | Baseline raw / gzip | Updated raw / gzip | Gzip increase |
|---|---|---|---|
| Main JavaScript | 534.54 / 169.59 kB | 537.51 / 170.60 kB | 1.01 kB |
| Main CSS | 335.96 / 55.78 kB | 343.18 / 56.94 kB | 1.16 kB |
| Lazy Momo scene JavaScript | 18.43 / 6.76 kB | 20.89 / 7.49 kB | 0.73 kB |

The main assets add about 2.17 kB compressed. The character stories add another 0.73 kB to the lazy scene chunk. Route splitting, comparable lab interaction traces and field performance remain planned.

## Remaining delivery and release checks

This completes the local first-session/account slice and the three new Momo stories. Saved sorting, Insights day inspection, Coach drafting/reuse, exact Settings search, Settings departure handling, import preview and remaining recovery/performance work are still open in M4/M5. The whole roadmap is not marked complete.

Hosted authentication, real email delivery, cloud staging/sync, physical iOS Safari and Android Chrome, native camera and software keyboard behavior, other browser engines, screen-reader spot checks and participant usability remain separate checks. Local simulations do not establish those outcomes.

Work is saved locally. No push, pull request, deployment, operator credential change or production model migration is performed. The previous source reference is `cda79780`.
