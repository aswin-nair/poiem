# Saved, Insights, Coach and exact Settings search

October 9, 2026 · Local M4 delivery on `poiem-motion-return` · Comparison baseline `989e5320`

Implementation commits: `49945c7e` (Saved, Insights and Coach) and `e9c5eddb` (exact Settings search). The following documentation commit contains the comparison package.

Open the [before/after gallery](gallery.html). The [state sheet](../ONGOING-USE-STATE-SHEET.md) describes the interactions and retained data. The [full delivery plan](../E2E-PLAN.md) and [acceptance checklist](../E2E-CHECKLIST.md) remain active.

## Built

- **Saved:** Recently used, Name and Most used sorting; compact phone rows and desktop columns. Usage comes from exact matches in the current journal. Quarter portions survive sorting, search, filters and Recents → Saved. Logging retains the selected destination, rounded totals, grams, ingredients, duplicate-activation guard and Undo; Saved templates stay unchanged.
- **Insights:** A factual seven-day summary names its dates, logged days and meal count. Trends and Journey are separate. Every chart day can be inspected by touch, keyboard or date picker and opened in the existing journal. Saved local dates match the journal across timestamp boundaries. An actual zero remains logged; unlogged intake is unknown. The displayed average uses all logged days, including zero. Calorie sums, targets, weight and pause rules are retained.
- **Coach:** Expanding multiline draft, Clear draft, editable starter/follow-up text and explicit Send. Response Copy confirms only after clipboard acceptance; denied access gives selected text for manual copying. Request ownership, retry, cancellation, deletion, AI access and safety handling remain.
- **You:** Search finds individual controls, opens the correct panel/disclosure and focuses the exact control. Hidden or disabled fields explain their prerequisite. Search never enables a connection, changes a preference, saves a draft or activates import/deletion. Catalog metadata contains no user values or credentials.

Portion selections and Coach draft text belong to the current screen visit; this slice does not add persistence for them after route departure or reload. Existing saved entries, conversations and Settings drafts keep their established persistence rules.

## Comparison evidence

The before set uses the archived baseline and the after set uses the updated app. Both have the same synthetic account, meals, frozen date, theme and browser settings. Eight states are captured at 390×844 and 1440×900 in light/dark, as whole pages and visible viewports: 32 states / 64 images per revision.

[Before observations](before/observations.json) and [after observations](after/observations.json) contain no page errors or horizontal overflow. The [gallery check](gallery-check.json) loaded all 64 comparison selections / 128 images, checked all four selectors by keyboard and found no gallery overflow on phone or desktop. Screenshots are review evidence, separate from the pinned visual baselines.

In the matching three-Saved/one-recent 390px fixture, the page height falls from 1799px to 1358px, a reduction of 441px. The 1440px version falls from 1448px to 1065px. These describe layout density, not participant task time. The factual weekly summary and inspector add reading/action space to Insights; that page is deliberately longer on a phone.

Whole-page captures retain the original screen position of fixed navigation and sticky composition controls, which can obscure a row in the image. Visible-screen captures show the actual viewport; later controls remain accessible by scrolling in the app. The initial comparison fixture had invalid extra fields on Saved templates and was corrected without changing application validation. The isolated before server was restarted after its missing shared files were restored. Only final successful captures enter this package.

## Verification

| Check | Local outcome |
|---|---|
| Source, browser checks, scripts and configuration lint | 0 errors; 13 existing warnings |
| Full unit/component suite | 940 tests in 110 files passed |
| Type check and local production build | Passed |
| Saved focused browser checks | 7 passed; 320/390/1440, both themes, totals/destination/Undo/template invariance |
| Insights focused browser checks | 13 distinct cases validated; sparse/zero/stored-date, keyboard, touch, ranges and journal return |
| Coach drafting and recovery | 12 passed; pending-copy assertion additionally passed |
| Exact search and existing You behavior | 17 passed; 2 additional disabled-control/large-text cases passed |
| Integrated source Chromium | 258 distinct cases validated across broad, completion and unchanged recheck runs |
| iPhone / Pixel Chromium emulation | 12 distinct cases validated across initial run and isolated recheck |
| Built public and `/app/` routes/assets | 4 passed |
| Pinned Linux screenshots | Initial comparison: 51 unchanged cases passed; 12 intended Saved/Insights/Coach layouts differed and were reviewed. Saved dropdown rendering was stabilized in M5; its four captures passed three unchanged repeats. The final integrated result is recorded in the [recovery report](../recovery/README.md). |
| Gallery | 64 selections / 128 images; keyboard checks and observations passed |

The first full unit run passed 939/940: a static-markup assertion expected wardrobe’s exact opening tag without the new stable search ID. It now checks the disclosure and its ID while still asserting that it starts closed; all 940 pass. Focused Insights/Saved browser fixtures initially matched multiple confirmation/log buttons and were corrected to the intended named controls after confirming the application behavior. The source assertions and final outcomes are retained.

The phone/production combined run passed 15/16. The Pixel dark wide/landscape route sweep exceeded its original 120-second total timeout at navigation; it passed unchanged on a one-worker recheck in 47.9 seconds. No product or test timeout was changed.

The broad source run completed 248 passes and one 320px daily screenshot timeout before its runner was interrupted without a final summary. The remaining seven cases and two Settings cases added during the run passed in a nine-case completion pass. The original 320px case then passed unchanged in 13.7 seconds, within its original 60-second limit. Together these runs validate all 258 current cases; the original timeout and interruption remain recorded.

The pinned visual run initially could not reach comparisons: dependency installation timed out, then a bounded retry failed before TLS connection to the registry. Recovery used a workspace-local cache of 79 exact locked Linux/arm64 tarballs, copied by verified integrity or fetched from their exact lockfile URLs. No dependency, lockfile or global configuration changed. Offline installation and the pinned build passed. The first completed comparison passed 51 unchanged cases and found only the 12 deliberate Saved, Insights and Coach differences. Actual, expected and diff captures were reviewed before updating those cases; tolerances and other baselines remain unchanged.

The first full comparison after those updates passed 62/63. Saved at 390px in dark had 359 differing pixels confined to the text of its two native dropdowns; borders, layout, values and navigation matched. An unchanged isolated run reproduced that same difference. The precise rendering cause is unconfirmed. The reviewed dropdown capture was saved for that one baseline, then passed three unchanged repeats. The original comparison and isolated failure remain recorded; the 200-pixel tolerance is unchanged.

The next full comparison passed 61/63, with the same class of native dropdown text difference in Saved's two light captures. M5 replaces the platform arrow rendering with a decorative SVG, keeps the semantic native select, and sets selected text to the 16px body token. Four reviewed Saved baselines now pass three unchanged comparisons each. Cold-start navigation timeouts during the narrow capture update are retained in the M5 evidence; they did not produce image comparisons. No unrelated baseline or tolerance was changed to hide them.

## Build cost

The previous local build and this build use the same dependency lock. Vite reports decimal kB; these figures do not establish download timing or interaction performance.

| Asset | Previous raw / gzip | Updated raw / gzip | Gzip increase |
|---|---|---|---|
| Main JavaScript | 537.51 / 170.60 kB | 554.09 / 174.93 kB | 4.33 kB |
| Main CSS | 343.18 / 56.94 kB | 354.57 / 58.53 kB | 1.59 kB |
| Lazy Momo scene JavaScript | 20.89 / 7.49 kB | 20.89 / 7.49 kB | None |

The main assets add about 5.92 kB compressed for field search, journal inspection and compact-library styling. Coach remains a lazy route. The existing large-main-chunk warning remains. Route splitting, comparable lab traces and field performance are still release work; the added bytes are recorded as a tradeoff, rather than a claimed performance improvement.

## Remaining work

M5 now implements Settings departure handling, reviewed backup import, sync recovery presentation, Support/About consistency and route splitting. Its [recovery report](../recovery/README.md) contains current verification and performance results; the build figures above describe this historical M4 slice. J11's route-exit guard is checked locally. J10's existing connection behavior still requires applicable real service/cloud checks.

Physical iOS Safari/Android Chrome, native keyboard and clipboard permissions, other browser engines, screen-reader checks, participant usability and real cloud staging/sync remain separate. Local emulation and intercepted responses do not establish those outcomes. The full roadmap is not marked complete.

Work is saved locally. No push, pull request, deployment, operator credential change or model migration is performed. Previous source reference: `989e5320`.
