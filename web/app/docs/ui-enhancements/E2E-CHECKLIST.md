# Poiem UI: end-to-end acceptance checklist

October 8, 2026 · Companion to [E2E-PLAN.md](E2E-PLAN.md)

This is the acceptance checklist for the full proposed redesign. Core meal, local first-session/account, everyday-use controls and local recovery are implemented; outcomes are recorded in [core meal evidence](core-meal/README.md), [first-session evidence](first-session/README.md), [everyday-use evidence](ongoing-use/README.md) and [recovery evidence](recovery/README.md). Three Momo stories are captured in the [scene gallery](first-session/momo/gallery.html). J11's exact search, cross-panel drafts and route-exit guard, and J13's validated import preview have local checks. J12's new banner checks establish presentation only. Performance budgets, physical devices, other browser engines, participant review and cloud staging remain separate release checks. A journey listed below is not automatically marked passed by a local suite count.

**Coverage levels**

The subsequent [safe-area follow-up](safe-areas/README.md) implements the original F05 screen-edge request and records its own source, synthetic inset fixtures, gallery and verification outcomes. J14/J16 physical cutout, keyboard and assistive-technology checks remain pending.

The [rendering follow-up](response-time/README.md) records the next local performance experiment against `131bd0d7`. Its browser, screenshot and lab timing outcomes remain distinct; a smaller asset or functional pass does not close the response-time or field-performance gates.

- P0: task completion, navigation, persistence, credentials, primary controls and recovery. A failing applicable P0 blocks release.
- P1: discovery, efficiency and presentation. Each included enhancement must meet its acceptance condition; cosmetic deferrals must be recorded explicitly.
- Run relevant checks after each milestone, then an integrated pass on the release candidate. Broaden testing when a change or unresolved failure warrants it. Use existing suites where they already cover the behaviour.

**The critical journeys**

| ID | Priority | Start → actions → result | Failure/recovery and observable pass condition | Existing suite to reuse or extend |
|---|---|---|---|---|
| J01 | P0 | Fresh visitor → setup → first manual meal → guest journal → create/sign into account → reload | Back/reload retains setup; eligibility remains enforced; exactly one first meal survives claim. Existing-account claim follows the current conflict policy rather than silently overwriting either copy. | `onboarding.spec.ts`, `onboarding-ui.spec.ts`, `auth.spec.ts`, `release-flow.spec.ts`; extend claim-through-reload coverage |
| J02 | P0 | Returning member → login → intended eligible app task; forgot password → reset → login | Wrong password remains recoverable; expired/invalid reset link has a clear next action; same-account session recovery preserves the allowed draft. Different-account login and intentional sign-out do not expose or resume another account's draft. | `auth.spec.ts`, `navigation.spec.ts`; add focused return-intent/reset-browser cases where absent |
| J03 | P0 | Today → selected meal → Photo → choose image → estimate → change portion → review → log | Picker cancellation leaves a useful screen; denied/unavailable camera offers gallery/manual; timeout/failure retains the available preview; cancel ignores a late response. Exactly one correctly scaled entry appears in the indicated destination. | `meal-flow.spec.ts`, `repeat-meal-context.spec.ts`; extend new review strip and correction reset |
| J04 | P0 | Today → Describe → enter meal → estimate → correct → log | Cancel/retry retains recoverable input and destination. Invalid or malformed model output offers recovery and creates no meal. Reloaded draft can continue or start fresh intentionally. | `meal-flow.spec.ts` |
| J05 | P0 | Today → Manual → fill fields → log → edit → save → reload | Empty/invalid required values focus the field; draft and errors remain visible at keyboard height; rapid double activation creates one entry. Final stored values match the displayed values. | `meal-flow.spec.ts`, `log-activation.spec.ts`, `release-flow.spec.ts` |
| J06 | P0 | Today → recent/Saved meal → adjust portion → choose meal destination → repeat | Portion display and saved totals agree, including rounding; search/no-results recovery works; changing a sort/filter does not change the chosen food. Default recent repeat takes two taps from Today. | `repeat-meal-context.spec.ts`, `food-club-library.spec.ts`, `log-activation.spec.ts` |
| J07 | P0 | Existing journal entry → edit → save as favourite → delete → Undo → reload | One confirmation appears; Undo restores the correct entry; duplicate activation is rejected. Deleting a journal entry preserves its independent Saved template. | `release-flow.spec.ts`, `swipe-row.spec.ts`, `log-moment.spec.ts` |
| J08 | P1 | Insights → change period → select chart day → inspect values → open journal → return to Today | Empty/sparse history stays understandable; an unlogged day is not labelled zero intake. Keyboard and touch reach the inspector and correct journal date. Range labels describe which data they affect. | `progress.spec.ts`, `ui-ux-improvements.spec.ts`, `food-club-library.spec.ts`; extend chart inspection |
| J09 | P0/P1 | Coach → starter prompt → edit multiline draft → send → copy or follow up | P1: starter is editable and copy works. P0: unavailable state retains a draft; cancel/retry does not duplicate a message; clear/delete prevents a late response from reappearing. Composer remains usable with the keyboard. | `coach-recovery.spec.ts`, `mobile-ux.spec.ts`; extend composer/starter/copy behaviours |
| J10 | P0 | You → AI setup → default or personal connection → save → use food logging/Coach → reload | Cover managed ready/disabled/exhausted and applicable plan restrictions; custom formats, bearer/header/no-auth configuration, invalid URL, missing key and failed request. Default exposes no operator key. Exports/sync omit personal keys; a changed imported endpoint requires re-entry. No automatic paid connection probe. | `food-club-you.spec.ts`, `meal-flow.spec.ts`, `navigation.spec.ts`; reuse transport/storage/API unit coverage and add durable browser coverage for the new configuration paths |
| J11 | P0/P1 | You search → exact preference/field → change → leave panel/route → reload | P1: disclosure opens and the exact control receives focus. P0: immediate preferences save independently; invalid profile/AI drafts stay pending; valid Save applies the intended draft; Stay/Discard works on route exit; an error in another panel becomes visible and focused. | `food-club-you.spec.ts`, `feel-preferences.spec.ts`, `release-flow.spec.ts` |
| J12 | P0 | Valid cached cloud journal → offline edit/log → reload → reconnect → sync | UI distinguishes saved-on-device from synced. Pending changes survive reload and arrive once. A conflict exposes the existing backup/choice flow; failed resolution preserves recoverable data. A stale server copy cannot silently replace unsynced work. | Extend browser coverage around `AppContext.tsx` and existing persistence/sync unit suites; prove real persistence in cloud staging |
| J13 | P0 | Export → choose backup → inspect preview → cancel or confirm replacement → reload | Invalid file gives an in-page error. Cancel leaves data unchanged. Confirm applies exactly the reviewed replacement. Keys remain excluded or bound correctly. Clear-data/account-delete paths use disposable test accounts, a clear consequence and explicit confirmation. | Extend `food-club-you.spec.ts` or a focused data-management suite; reuse storage and account API tests |
| J14 | P0/P1 | Eligible quiet screen → Momo scene → scroll/tap/close/mute → navigate/reload | P1: all new storyboards render correctly. P0: no covered controls, focus theft or scroll jump; typing/dialog/Undo priority; finite cleanup; one scene; persisted controls; Calm/OS reduced motion; no delayed scene after leaving an eligible route. | `momo-interlude.spec.ts`, `mascot-motion.spec.ts`, `motion-rules.spec.ts`, `feel-preferences.spec.ts` |
| J15 | P0 | Open supported routes directly; use browser Back/Forward; open/close logging sheet; use production `/app/` URLs | Correct route and heading focus, preserved underlying scroll after sheet close, useful handling of missing entries/expired drafts, no broken assets or accidental duplicate history steps. Customer sessions cannot reach privileged admin data. | `navigation.spec.ts`, `production.spec.ts`, `release-flow.spec.ts`; applicable role checks in API tests |
| J16 | P0/P1 | Complete key tasks with keyboard, touch, zoom, large text, dark theme and reduced motion | P0: named reachable controls, visible error/focus, no blocked action, no horizontal page overflow, no accidental audio/haptics. P1: visual hierarchy and motion match reviewed concepts. | `mobile-ux.spec.ts`, `tap-targets.spec.ts`, `appearance.spec.ts`, `ui-obstacles.spec.ts`, `visual.spec.ts` |

**Meaningful test fixtures**

Use a fresh guest; a partially onboarded user; a signed-in empty journal; a populated journal with long meal names and decimal portions; a large Saved collection; sparse history across date boundaries; paused tracking; managed Free/Premium availability; each personal API format; and an offline journal with queued changes. Use synthetic accounts and neutral dummy credentials. Track actual state transitions and visible outcomes.

For correction reset, define the baseline explicitly: the original model estimate scaled to the currently selected portion. Changing portion rescales from a stable base once. Resetting calories does not reset protein or the selected meal slot. Keep a focused pure-logic test for this calculation and one browser journey for the visible behaviour.

Fix date/time and random Momo selection in fixtures. Keep each test's account/storage isolated. Use named controls and wait for actual navigation, focus or status changes instead of fixed sleeps. Use deterministic provider responses for routine failures and retry paths. This approach follows [Playwright best practices](https://playwright.dev/docs/best-practices).

**Device and state matrix**

| Pass | Coverage |
|---|---|
| Daily implementation check | Affected journey at 390×844 and 1440×900; focused logic checks for stateful changes; relevant light/dark and reduced-motion variants |
| Responsive pass | 320px narrow phone, 390px phone, Pixel-sized phone, 768px tablet, 1440px desktop, 844×390 landscape and a short keyboard-height viewport |
| Browser integration pass | Chromium full critical set; focused WebKit and Firefox checks for capture, forms, focus, scrolling, storage and routing |
| Visual pass | Reviewed light/dark before/after comparisons in the pinned canonical environment; finite animations settled for layout comparisons; selected frames/captures for actual motion |
| Real-device pass | iOS Safari and Android Chrome: camera/gallery chooser, software keyboard, address-bar changes, safe areas, touch, long press, audio/haptic preferences and screen-reader spot checks |
| Cloud staging pass | Disposable account creation/login/reset, guest claim, server persistence across a fresh browser, session expiry, offline queue/reconnect and conflict recovery |
| Production smoke | Welcome/app entry points, direct route reloads, essential assets, default availability status and authorized navigation |

Cover the combinations that could expose different behaviour. Run P0 meal flows on desktop and phone. Exercise theme/motion combinations on shared controls and scenes, then representative complete journeys; duplicating every test across the entire Cartesian product adds noise without equivalent evidence.

**What each environment proves**

- Local app plus mocked API responses proves client workflow and error handling. It does not prove hosted authentication, email delivery, sync durability or upstream availability.
- A controlled cross-origin service or a bounded, explicitly triggered staging integration check proves the chosen custom service's browser/CORS path. Mock interception alone does not.
- Cloud staging with a fresh browser proves account persistence and real server handoffs. Keep deletion/import tests confined to disposable data.
- Real phones prove camera, keyboard and browser-chrome interactions that desktop emulation cannot establish.

**Release gate and evidence**

For each journey record: final commit, fixture, environment, viewport/browser, expected result, actual result, status and evidence link. Status is Passed, Failed, Blocked or Not applicable with a reason. Include screenshots/traces for actionable failures without passwords, tokens or real personal data.

The candidate must have no unresolved applicable P0 failure and no missing main action, duplicate save, data-loss path or credential exposure. Review intentional screenshot changes before accepting new baselines. Investigate flaky failures; a retry result is recorded alongside the initial failure rather than silently replacing it.

Build and type checks must pass. Relevant unit/API suites protect calculation, persistence, credentials and entitlement behaviour. Run the integrated browser/visual coverage after dependent changes settle. Record physical-device and staging gaps explicitly; local passing counts cannot substitute for those checks.

Record performance against M0 with the same measurement conditions and identify any accepted tradeoff. The release report links the final before/after gallery and the previous deployable revision for rollback. After deployment, smoke-test the customer entry points and watch the existing error/meal-completion signals for regression.
