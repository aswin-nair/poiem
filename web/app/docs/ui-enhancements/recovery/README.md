# Settings, backup and local recovery

October 10, 2026 · Local M5 delivery on `poiem-motion-return` · Source `04552501` · Comparison baseline `e9c5eddb`

Open the [before/after gallery](gallery.html). The [recovery state sheet](../RECOVERY-STATE-SHEET.md) describes retention, focus and replacement rules. The [full plan](../E2E-PLAN.md) and [acceptance checklist](../E2E-CHECKLIST.md) remain active.

## Built

- **Settings departure:** Stay, Save and leave, or Discard and leave protect pending profile and AI edits. Panel/search navigation retains drafts. Both drafts validate before either is applied; an invalid Save opens and focuses its actual field. Discard keeps preferences already applied. Back/Forward resume the original router transaction. A full document leave uses the native browser prompt where supported.
- **Sign-out:** Pending edits offer Stay or Discard and sign out. Stay lets the user save first. Account expiry/change uses the existing handoff and cannot be held by an old account's prompt.
- **Backup review:** Choose and validate first, then compare the named account's current copy with the backup. Record counts, meal dates, profile/preferences/AI choices and replacement scope are visible. Cancel makes no replacement. Confirm applies the exact validated snapshot once through the existing API. A stale account, cancelled read, newer file or changed current state cannot apply an old preview. Invalid files produce an in-page error. No AI request or connection probe is sent.
- **Sheets:** Focus, Escape handling and the background scroll lock are established before the first paint. Scrolling stays locked until the final shared sheet closes. A backup preview closes before a Settings departure decision opens, leaving one modal to own focus.
- **Sync presentation:** Existing status and authority actions wrap in document flow above the journal. The inherited fixed banner no longer covers content. This is a layout change; the existing sync decision and durability rules remain.
- **Help:** Support and About link directly to the applicable AI, backup, account and pause controls.
- **Secondary routes:** Saved, Insights and You load on demand. Navigation remains available while opening. Failed screen downloads offer a reload and Return to Today without exposing the raw exception. Heading focus waits for the loaded page; unknown Settings hashes fall back to You.
- **Saved:** Native semantic dropdowns retain keyboard behavior with 16px selected text, a consistent decorative arrow and room for labels. Their arrow cannot intercept a tap.

The default remains Poiem AI. No operator credential, nutrition calculation, entitlement rule, API/domain implementation, managed-model setting or Expo code is changed.

## Comparison evidence

The archived before revision and current after revision use the same synthetic account, meals, frozen date, theme and browser settings. Eight states at 390×844 and 1440×900 in light/dark have whole-page and viewport images: 32 states / 64 images per revision. Modal images use the visible viewport in both views, so the background does not dominate the comparison.

[Before observations](before/observations.json) and [after observations](after/observations.json) record no page errors or horizontal overflow. The [gallery check](gallery-check.json) loaded all 64 selections / 128 images, exercised all four selectors by keyboard and found no gallery overflow at 390 or 1440.

Supplementary **after-only** failed-download captures show the recovery screen for [Saved phone](route-download/route-download-saved-390.png), [Saved desktop](route-download/route-download-saved-1440.png), [Insights phone](route-download/route-download-insights-390.png), [Insights desktop](route-download/route-download-insights-1440.png), [You phone](route-download/route-download-you-390.png) and [You desktop](route-download/route-download-you-1440.png). Those tests abort the requested screen module, verify recovery focus/navigation and reload the same URL with the existing durable meal data intact. They are additional recovery evidence, not paired before/after screenshots.

Offline and conflict images are **synthetic presentation fixtures**, using the existing banner classes and action structure. They establish wrapping, disabled appearance and control reachability; they do not establish offline queue durability, live conflict resolution or a server comparison. The before invalid-file browser alert was dismissed before capture; the after error is visible next to import. The capture helper initially waited for a heading inside Today's main region, while Today renders it in its header; the readiness locator was corrected and only the final complete captures are published.

## Verification

The [verification record and reproduction commands](verification/README.md) retain the environment, source revision and batch boundaries.

| Check | Local outcome |
|---|---|
| Full unit/component suite | Final repeat: 973 tests in 116 files passed with two workers |
| Recovery integration | 50 cases passed: Settings, backup, help links, sync presentation and existing You behavior |
| Broader Chromium integration | 302/303 passed; the Escape timing case passed three unchanged repeats, then the earliest-mount check exposed the timing gap described below |
| Affected final integration | 62 passed; six new route cases stopped in an invalid storage fixture before navigation. After fixture correction all six passed in the final route batch |
| Route download/focus recovery | 23 passed: eight failed-download/hash cases, two direct-link focus cases, twelve exact Settings-search cases and the earliest-mount sheet check |
| Phone and production coverage | 16 passed: iPhone/Pixel layouts, keyboard-height inputs, landscape and production `/app/` routes/assets |
| Type check and local production build | Final Windows build passed; main JS 406.12 kB raw / 130.30 kB gzip. Whole initial asset footprint is measured separately below |
| Lint | Final scoped run: 0 errors; 13 existing warnings (12 Fast Refresh exports and one accessibility-test children prop) |
| Pinned Linux screenshots | Final complete run: 63 passed. Four intentional Saved changes reviewed; earlier warm repetitions passed 15/15 |
| Comparison gallery | 64 selections / 128 loaded images; keyboard and overflow checks passed |

The first combined recovery run found eight banner-position failures caused by an inherited fixed-position rule and four backup fixture failures. The banner now explicitly resets that rule. Fixtures now assert the existing importer's normalized state, target the correct named controls and delay only the intended file read. All 50 then passed. The initial unbounded unit run also hit four existing five-second timeouts while other browser/build work was active; the unchanged full suite passed with two workers. No test timeout or visual tolerance was increased.

The broad Escape failure passed three unchanged repeats. A stronger regression check dispatches Escape at the earliest observable sheet mount and verifies that focus and the scroll lock are already owned. It failed before the fix. Focus/Escape setup and scroll locking now use layout effects; that check and the affected logging flows passed. Six new failed-download tests initially read the retired localStorage state after migration to IndexedDB and stopped before testing navigation. They now seed once and read through the existing durable-state API; all six passed. The final unit repeat first stopped before any test could start because the sandbox denied a temporary-cache rename; the unchanged run outside that sandbox passed all 973. A bare lint attempt was cancelled after scanning ignored vendor/cache files; the complete source/config/test lint uses the existing ignore file and explicit cache/artifact exclusions.

An independent source review identified the unknown-hash focus fallback, missing failed-download recovery for newly lazy screens and direct-link recovery-heading focus. Those are included in the final route checks. A follow-up review found no additional material issue in backup ownership, atomic draft validation, account isolation or modal scroll locking.

The first Saved baseline update passed three cases; the fourth and its single-case recheck timed out during initial navigation before a comparison. The already reviewed actual image was preserved as that fourth baseline, followed by 15 unchanged warm checks (four Saved cases and one Today case, three repetitions each) and the final complete 63-case pass. The cold-start cause is unconfirmed. Screenshots of all four actual/expected differences were reviewed: changes are confined to the dropdown text/arrow and the destination control's width. Other surfaces and the 200-pixel tolerance remain unchanged.

## Performance

The [controlled comparison](performance/README.md) uses planning baseline `923f2e4e` and source `04552501`, built with the same lockfile, Windows runtime and local backend. Initial-load samples include every successfully requested JavaScript/CSS asset. The computed gzip footprint falls from 315,778 to 311,133 bytes (−1.47%); actual recorded JS/CSS transfer falls 2,546 bytes (−0.79%) as requests grow from 14 to 21. Phone LCP median is 2,740ms versus 2,760ms before, with an unexplained 16,104ms candidate outlier retained. Three samples per width are too variable for a stable loading-speed or field-budget claim.

Both revisions completed 70 trusted-click samples without functional errors. All seven actions on both revisions miss the lab budget of p95 ≤100ms and zero attributable long tasks. Candidate p95 feedback ranges from 318.2ms (sheet close) to 2,247.6ms (Saved repeat). Some actions improve and others regress in this small, heavily throttled set. The [complete table and raw traces](performance/README.md) retain every sample. This following-frame feedback proxy is not browser INP or model response time. The performance gate remains open.

## Remaining release checks

Physical iOS Safari and Android Chrome, native keyboard/camera/clipboard/selection behavior, safe areas and screen-reader checks remain pending. Focused WebKit/Firefox, participant usability, real cloud staging/account/offline/conflict checks and field performance remain separate. Intercepted local responses and synthetic presentation cannot close them.

At this M5 snapshot, the original F05 safe-area implementation was still open: the viewport metadata omitted `viewport-fit=cover` and top/side clearance needed coordinated owners. The subsequent [safe-area follow-up](../safe-areas/README.md) implements those owners and records its own comparisons and checks. This historical M5 gallery and performance data remain tied to `04552501`; physical verification is still pending.

No rollout is performed. The before references are comparison snapshots, not a claim that a deployment has been validated. Work is saved locally; no push, pull request or deployment is included.
