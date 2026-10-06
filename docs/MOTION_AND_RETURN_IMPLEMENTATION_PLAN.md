# Poiem motion and return: implementation work plan

Status: proposed continuation of Phase A, awaiting the user's strategy review. No Phase B application changes have started. Prepared against `0a106d84`; recheck the approved starting revision before implementation.

This plan breaks [MOTION_AND_RETURN_STRATEGY.md](MOTION_AND_RETURN_STRATEGY.md) into reviewable work packages. The strategy defines the product behavior, timing, safety rules and budgets; this document defines implementation order, dependencies and acceptance evidence. If they disagree, resolve the difference in the strategy before coding.

The outcome is a daily product that responds consistently, acknowledges real logging, gives Momo a little life, and offers one honest reason to return. It keeps Poiem's current design system. Public welcome, a broad onboarding/auth redesign, new reward systems, remote analytics and background notification infrastructure are outside this pass.

## Working cadence

- First receive the user's strategy grade/approval and incorporate revisions. A request for a more detailed plan is still planning, not approval to implement.
- Then work from a new `codex/motion-and-return` branch based on freshly fetched `origin/main`. Preserve the current branch and existing audit artifacts.
- Each package below produces a small reviewable change, relevant tests and a before/after note. A package is done when its acceptance checks pass, not when its animation looks good in one preview.
- New shared logic belongs in `packages/product` or `packages/domain` as appropriate; web-specific presentation stays in `web/app`. Use the existing Motion, feel, art and design primitives.
- No pushing or deployment. The user handles GitHub. Final handoff distinguishes completed code checks from pending device, assistive-technology or production evidence.

## B0 — Establish the implementation baseline

**Depends on:** strategy approval. **Priority:** prerequisite.

1. Fetch `origin/main`, create the new branch, and record its exact commit. Compare that revision with the audited `0a106d84`: code references, behavior and outstanding gaps may have changed.
2. Check workspace instructions and preserve unrelated changes. Keep this plan and the approved strategy available on the implementation branch without carrying unrelated UI work with them.
3. Run the current web lint, unit/product tests, type/build checks and the named motion/accessibility/gesture tests. Record existing failures separately; don't report them as newly introduced or silently change unrelated features.
4. Capture representative starting states in light/dark at 320, 390, 768 and 1440px. Include Today before/after logging, sheet open, Saved, expanded preferences and wardrobe, Insights and Coach. Existing baselines remain the reference; runtime clips supplement stills.
5. Measure gzip sizes from a fresh build, including deferred product chunks and the initial signed-in route. Record the build configuration, commit and tool versions so later comparisons use the same conditions.
6. Prepare deterministic test cases: first-time user, first/second/third log, Light/Regular/Detailed commitment, simultaneous unlocks, existing outfit, paused tracking, neutral over-guide totals, returning after a gap, and saved quiet preferences on a direct route.

**Deliverable:** a baseline report with real pass/fail results, screenshots and bundle measurements. No invented retention, device-performance or screen-reader baseline.

**Gate:** a known starting revision and reproducible checks. Relevant existing defects are recorded before implementation changes their behavior.

## B1 — Make preferences and product guardrails reliable

**Depends on:** B0. **Priority:** P0.

**Primary touchpoints:** [App](../web/app/src/App.tsx), [AppContext](../web/app/src/store/AppContext.tsx), [feel](../web/app/src/lib/feel.ts), [profile](../web/app/src/lib/profile.ts), [storage](../web/app/src/lib/storage.ts), [todayGreeting](../web/app/src/lib/todayGreeting.ts), [Momo](../web/app/src/components/Momo.tsx), [a11y](../web/app/src/styles/a11y.css).

1. Define one resolved experience policy for the daily app: whole-app intensity, saved sound/haptics, Momo visibility/mute/motion, OS reduced motion and tracking pause. This is a small policy layer over existing settings, not a new animation engine.
2. Default the new whole-app intensity to Standard. Keep existing mascot Calm/Lively/Off and disabled channels. Intensity caps mascot activity; it never implicitly enables a hidden mascot, sound or haptics.
3. Document defaults, import/backup normalization and account-switch behavior for any new fields. Update the local-data/retention/deletion contract wherever new persisted data is introduced.
4. Initialize feel after product preferences hydrate and before any route can emit cues. Suppress cues before preferences are known. Synchronize changes and cancel affected pending cues/animations on preference or account changes.
5. Apply Momo policy to every product placement: Today, log sheet, analysis, Coach, wardrobe and reward presentation. Hide removes art; mute suppresses character dialogue; reduced Momo motion retains static expressions. Factual save/status text remains available.
6. Remove calorie/over-guide inputs from the Today character path. Keep budget information in the factual budget display and keep Momo unchanged when only nutrition values change.
7. Stop canvas celebrations in reduced-motion/quiet paths. Until B4 removes the automatic celebration chain, existing presentations must obey preferences and have stable completion timing.
8. Remove the streak-save/freeze-safety nudge from the web experience and replace loss copy/tests. Old browser permission must not implicitly activate the later reminder feature. B7 finishes its controls.
9. Make Coach's programmatic scrolling respect reduced motion and the user's reading position. Keep all Support/recovery surfaces quiet.

**Acceptance:** direct-opening Manual, Saved, Settings or Coach with sound/haptics off produces no audio/vibration; switching accounts doesn't inherit another person's feel settings; live reduced-motion changes stop active movement; hiding/muting Momo works across all placements; changed calorie totals cannot change Momo's greeting or expression.

**Review evidence:** preference truth table, migration tests, direct-route quiet e2e, reduced-motion checks, copy tests and a short comparison of current vs corrected behavior.

## B2 — Make accepted actions produce one trustworthy acknowledgement

**Depends on:** B1. **Priority:** P0; highest implementation risk.

**Primary touchpoints:** [AppContext](../web/app/src/store/AppContext.tsx), [logFeedback](../web/app/src/lib/logFeedback.ts), [gamification](../web/app/src/lib/gamification.ts), [Manual](../web/app/src/pages/ManualEntryPage.tsx), [Review](../web/app/src/pages/ReviewFoodPage.tsx), [Saved](../web/app/src/pages/SavedMealsPage.tsx), [LogSheet](../web/app/src/pages/LogSheet.tsx), [Home](../web/app/src/pages/HomePage.tsx), shared [enamel awards](../packages/product/src/enamelAwards.ts).

1. Define what the existing state/persistence path actually accepts. Feedback must never masquerade as durable/cloud acknowledgement, hide a storage failure, or become the writer of journal state.
2. Describe the accepted action with its stable ID, type and local date. Associate awards and eligibility using exact keys and before/after state, replacing Today's two-second proximity inference.
3. Put the new pure presentation decision in the shared product layer with narrow inputs. Keep sound, timers, storage and UI side effects outside reducers/selectors so React retries cannot replay them.
4. Add activation guards before Manual, Saved and sheet quick/relog paths generate entry IDs. Keep existing Review/AI guards. A cancelled or failed attempt must remain retryable.
5. Preserve IDs through offline retry and sync. Undo/edit/restore update journal state without creating a new log award or repeating the same presentation.
6. Acknowledge the saved action immediately with its visible row and Undo. Keep existing offline/conflict notices; no delay is added to persistence or navigation for motion.
7. Add first-ever acknowledgement semantics. Backfill migrated state only from reliable existing evidence of prior logging; an empty current journal alone is not proof of a new user. Preserve acknowledgement through guest claim and deletion/import paths. Don't grant a new award to solve a presentation ambiguity.
8. Define once-only ring/milestone/outfit presentation acknowledgements without changing award amounts or ownership. Document any minimal new persisted metadata and its deletion behavior.

**Acceptance:** rapid double activation creates one entry; ordinary retries and edits do not add XP; two nearly simultaneous valid actions receive their own correct outcomes; remount/import/sync cannot replay a celebration; first-ever presentation doesn't restart after deleting all meals.

**Review evidence:** before/after save-flow trace, unit tests for exact association/deduplication, rapid-activation e2e and existing offline/conflict/guest-claim regression results. Resolve uncertainties about acceptance or migration here before staging rewards.

## B3 — Apply one interaction vocabulary across the daily screens

**Depends on:** B1 and B2. **Priority:** P1.

**Primary touchpoints:** [motion presets](../web/app/src/lib/motionPresets.ts), [PressableButton](../web/app/src/components/PressableButton.tsx), [Sheet](../web/app/src/components/Sheet.tsx), [BottomNav](../web/app/src/components/BottomNav.tsx), [shared system components](../web/app/src/styles/system/components.css), [AppShell](../web/app/src/components/system/AppShell.tsx), [LogFlowUI](../web/app/src/components/LogFlowUI.tsx), [Coach](../web/app/src/pages/CoachPage.tsx).

1. Normalize recipes using the existing presets: press 90–120ms, standard confirmation/route fade 240ms, bounded art springs. Only transform/opacity animate; static values and selection colors update immediately.
2. Remove the FAB's 120ms routing delay. Make sheet controls available immediately rather than staggering interactive children from invisible states. Preserve dialog focus, Escape, scroll position and opener-focus restoration.
3. Fix the route-entrance target for the shared shell; animate arriving content rather than the fixed nav. Do not re-run a full page entrance while opening the sheet over its background.
4. Reuse shared press states for buttons, icon buttons, chips, filters, tabs, portions and toggles. One semantic action produces one cue, not both a generic button cue and a parent cue. Keyboard, pointer cancellation and disabled states remain correct.
5. Remove filter-triggered list entrances from Saved. Preserve swipe direction discrimination and non-gesture Edit/Delete controls. Don't scale a long text row away from the pointer.
6. Replace meter width transitions with a fixed fill and transform. Keep accessible values settled and truthful; don't attach rewards to nutrition meters.
7. Give Photo/Describe one waiting rhythm, remove the undefined `k-bop` reference, and retain Cancel/fallback. No synthetic progress or delayed response display.
8. Give Review/Edit a small factual correction confirmation. Give Coach a short message arrival, one send acknowledgement and no forced scroll while reading history.

**Acceptance:** all controls are at least 44px and named; no animation delays routing or hides an input; no double cues; the same interaction has the same feel across screens; Calm/OS reduced motion stays static as specified.

**Review evidence:** component examples, keyboard/swipe/tap-target results, route/sheet clips, long-name/mobile checks and unchanged settled baselines except documented decisions.

## B4 — Restore the Day ring and redesign log feedback delivery

**Depends on:** B2 and B3. **Priority:** P1.

**Primary touchpoints:** [DayRing](../web/app/src/components/DayRing.tsx), [Home](../web/app/src/pages/HomePage.tsx), [shared day-ring rules](../packages/product/src/dayRing.ts), [LogCelebration](../web/app/src/components/LogCelebration.tsx), [LevelUpOverlay](../web/app/src/components/LevelUpOverlay.tsx), [Toast](../web/app/src/components/Toast.tsx), [today styles](../web/app/src/styles/screens/today.css).

1. Integrate the existing Day ring into a compact flat Today section near Momo's note. Preserve the single hero, spacing/type contract and factual calorie budget. Reserve the art/status space so feedback doesn't shift controls.
2. Use Light/Regular/Detailed requirements from the shared calculation. Label optional arcs as optional. Data/commitment changes update the ring truthfully without earning a new presentation just for a settings change.
3. Replace automatic full-screen log/level-up queues with one nonmodal confirmation. Preserve actual XP/level/wardrobe state and its visibility in existing Insights; only presentation changes.
4. Coalesce simultaneous events in the approved priority order. All eligible outcomes remain granted and visible; at most one artwork sequence and one cue run.
5. Implement repeat caps: first-of-day at most 480ms; second-log automatic payoff at most 240ms; third and later at most 120ms or static. First-ever/deliberate outfit preview can reach 720ms. Repeat caps override a coincident ring/unlock sequence.
6. Show Undo immediately, with its existing ten-second availability and focus/hover pause. Never move focus into automatic feedback or require Continue.
7. Acknowledge incomplete→complete logging transitions once per local day. Reload, a backdated log, a commitment toggle or Undo/restore must not reopen the payoff.

**Acceptance:** a real first log visibly changes the Day ring; a third log remains faster/lighter even if it closes the ring; another action is possible during feedback; paused/quiet paths retain plain confirmation without reward choreography; calorie changes cannot close the ring.

**Review evidence:** first/second/third-log clips, commitment cases, simultaneous-event tests, screen-reader status review, and an explicit Today before/after baseline decision at all four widths/themes.

## B5 — Deliver existing milestones and wardrobe reveals at the right moment

**Depends on:** B4. **Priority:** P1.

**Primary touchpoints:** [wardrobe rules](../packages/product/src/wardrobe.ts), [HabitMilestones](../web/app/src/components/HabitMilestones.tsx), [MomoWardrobe](../web/app/src/components/MomoWardrobe.tsx), [Home](../web/app/src/pages/HomePage.tsx), [Progress](../web/app/src/pages/ProgressPage.tsx).

1. Observe eligibility after accepted logging, note, water and favorite actions; don't require another food log before showing a newly available piece.
2. Implement the known anticipation sequence: piece name/rule immediately, brief preview/label/try-on within 720ms where permitted. No mystery pack, odds or added reward tiers.
3. Retain the existing first-meal Blossom handover. Automatic previews never overwrite the chosen outfit; a deliberate Try it on action changes equipment through the existing wardrobe logic.
4. If multiple pieces arrive, list all names together and animate one preview. Keep the existing dressing room available for the rest, with no forced carousel.
5. Visit/anniversary discovery is silent/static. Already owned pieces stay owned, including after a break or journal deletion. Keep the current journal-derived unclaimed eligibility semantics rather than adding a permanent historical ledger.
6. Acknowledge only existing logged-day milestones once, using the existing Insights path and a small Today status. Do not animate weight/calorie graphs as achievements.

**Acceptance:** eligible pieces appear without waiting for another meal, all eligible pieces are available, the chosen outfit survives preview, no reveal repeats on refresh, and reduced-motion/Momo-off paths convey the same factual result immediately.

**Review evidence:** first-meal, standalone note/favorite unlock, multiple-piece and existing-outfit examples; shared policy tests; screenshot decisions only where a resting state intentionally changes.

## B6 — Integrate Momo and the return experience

**Depends on:** B1 and B5; local metadata contract agreed before persisting anything. **Priority:** P1.

**Primary touchpoints:** [TodayMomo](../web/app/src/components/TodayMomo.tsx), [MascotOverlay](../web/app/src/mascot/MascotOverlay.tsx), [controller](../web/app/src/mascot/controller.ts), [behaviors](../web/app/src/mascot/behaviors.ts), [expressions](../web/app/src/mascot/expressions.ts), [mascotMemory](../web/app/src/lib/mascotMemory.ts), [shared voice](../packages/product/src/mascotVoice.ts), [shared lines](../packages/product/src/mascotLines.ts).

1. Consolidate the inline four-line tap cycle with shared content memory and no immediate repeats. New lines must pass the exhaustive voice/copy tests.
2. Correct the embedded pose wiring. Allow one visible focal Momo to blink/breathe gently in the permitted modes; don't attach the old life hook to every avatar or add another art renderer.
3. Keep existing safe destinations, whole-path/bubble clearance, screen exclusions and input/modal/visibility suppression. No new roaming on Saved, Insights, Coach, forms or phone Today.
4. Share cooldown lifecycle across remounts. Pause timers/eye tracking while hidden or busy. Cancel pending dialogue on mute, hide, pause or account changes.
5. Define minimal local product-visit/acknowledgement metadata. A product absence is not a missing meal; don't infer returns from eating timestamps. Bound storage and document account isolation/deletion.
6. Same-day reopen: show existing values/outfit with no reward replay or calorie count-up. A short greeting fade is sufficient.
7. After a product-visit gap of at least two local days: one warm welcome, preserved progress and no missing-day count. If tracking is paused, don't ask for automatic resumption.
8. Add one settled next-item note based on an existing cumulative milestone or logged-day outfit. Evening seed example: “2 logged days · Pencil at 3.” No deadline, extra progress ladder or demand to close remaining arcs.

**Acceptance:** Momo remains clear of controls, no unsolicited speech occurs during editing, same-day visits don't replay rewards, comeback copy appears once per return, and breaks leave existing progress/ownership intact.

**Review evidence:** idle/tap/busy clips, no-repeat tests, safe-path regressions, fake-clock same-day/gap/evening tests and quiet/paused examples. Do not claim device performance from these functional tests.

## B7 — Finish You controls and optional reminders

**Depends on:** B1 policy foundation and B6 return semantics. **Priority:** P1.

**Primary touchpoints:** [Settings](../web/app/src/pages/SettingsPage.tsx), [SettingsNavigation](../web/app/src/components/SettingsNavigation.tsx), [web notifications](../web/app/src/lib/notifications.ts), [shared notifications](../packages/domain/src/notifications.ts), [notification fixtures](../packages/domain/fixtures/notifications.v1.json).

1. Add App feel: Calm, Standard and Lively. Explain each choice briefly. Keep Standard as the new setting's default and preserve independent channel/mascot preferences.
2. Add Keep it quiet: Calm + Sound off + Haptics off + reminders off. Display the resulting settings and allow separate later changes.
3. Make preference save behavior explicit. An immediate experience-setting update must patch only its intended fields; it must not accidentally save unrelated profile/goals edits still pending in the You form.
4. Preserve previous mascot activity when re-enabling Show Momo rather than forcing Lively. Make mute, hide and reduced motion match their labels throughout the product.
5. Add explicit reminder Off/On, selected local time and granted/denied/unsupported permission states. Browser permission alone is not consent; migrated users default Off. Request permission only following deliberate opt-in.
6. Permit at most one chosen routine reminder per day, with the global two-per-day ceiling intact. Suppress while paused or already logged. Remove streak/freezes/targets from routine eligibility and avoid catch-up delivery after an absence.
7. Use approved warm copy and describe the current foreground delivery limitation. No background push/service-worker work or promises of closed-browser delivery.
8. Update shared fixtures and consumer tests when shared eligibility changes; the mobile alpha must not silently diverge on shared policy even though its UI is outside this pass.

**Acceptance:** quiet applies across routes, old Off preferences stay Off, pending profile changes aren't accidentally committed, permission denial doesn't trigger repeated prompts, reminder Off prevents delivery despite a browser grant, and changing clocks/refreshing cannot exceed daily delivery limits.

**Review evidence:** expanded You before/after, preference migration/save-isolation tests, notification suppression/cap/copy fixtures, keyboard/tap-target checks and permission-state demonstrations.

## B8 — Add proportionate local measurement and enforce budgets

**Depends on:** baseline from B0; approved data contracts from B1/B6; feature behavior from B4–B7. **Priority:** P2, with baseline collection beginning at B0.

**Primary touchpoints:** [analytics](../web/app/src/lib/analytics.ts), [telemetry contract](../packages/contracts/src/telemetry.ts), [retention schedule](data/retention-schedule.md), [local-data inventory](data/local-data-inventory.md), [build script](../web/app/scripts/build.mjs).

1. Reuse existing first-log start and entry-save duration for task completion measurement. Separate successful attempts, abandonment and retries; never record elapsed time between eating and saving.
2. Specify local product-visit-day, coarse preference changes and once-only moment outcomes only where necessary. Extend the strict contract deliberately and keep sensitive content out.
3. Define D1 and exact D7 return, logs per active/logged day, first-log duration, channel/reminder opt-outs and quiet use. Report denominators and existing-Off vs new opt-outs separately.
4. Don't pretend the newest-200-event buffer establishes complete weekly cohorts. Use an explicitly bounded local summary or a consented study diary with its own retention/deletion contract.
5. Remote delivery remains disabled. Population dashboards require a separate consent, identity, sink and retention design and are not a dependency for usable feedback.
6. Add a repeatable build-size comparison: added total JS ≤10 KiB gzip, added CSS ≤2 KiB gzip, extra initial signed-in-route JS ≤5 KiB gzip; zero new runtime dependencies or motion/audio assets.
7. Profile ten repetitions of core interactions. Record post-acceptance confirmation p95 ≤100ms, animation scripting p95 ≤4ms/frame, <5% missed frames and no animation-attributable long tasks >50ms on a documented mid-range Android device.
8. Enforce one choreography, at most six moving decorative elements and at idle one focal Momo/two tracks. Check feedback-induced layout shift is zero. Simplify motion that misses budget rather than raising the limits.

**Acceptance:** diagnostic storage is bounded/deletable and account-safe; no food/body/chat/secret payload enters events; bundle gates compare matching fresh builds; real performance evidence is present or explicitly pending.

**Review evidence:** metric definitions, event/data review, deletion tests, per-chunk base/after gzip report, device traces and limitations. Return uplift is evaluated later through consenting cohorts; no uplift is promised for this build.

## B9 — Complete quality review and prepare the handoff

**Depends on:** B1–B8. **Priority:** required for completion.

Run the complete signup/guest claim → first meal → Today → log → correct/edit → delete/Undo → Saved/relog loop. Include offline/manual fallback, cloud conflict/retry and account changes using the existing test environment. Motion must not change adult gating, target floors, pause protection, data recovery or Support accessibility.

Check every scoped screen in both themes at 320, 390, 768 and 1440px, plus long content, keyboard, enlarged text, OS reduced motion and saved quiet settings. Expand panels/disclosures so hidden controls are tested. Check polite announcements with actual assistive technology; a DOM assertion alone does not certify the experience.

Run existing mascot-motion, tap-targets, swipe-row, ui-consistency, Home, onboarding and release-flow checks, new logic tests, lint/type/build and shared consumer tests affected by changes. Preserve unrelated approved visual snapshots. Day ring and preference insertions require explicit reviewed before/after snapshot updates; animation-disabled baselines cannot validate running motion.

Prepare the handoff with:

- Exact starting/final revision or current diff and a scoped change list.
- Before/after stills plus short clips for log, ring, wardrobe, Momo and quiet paths.
- Test results and deliberately updated baselines with reasons.
- Gzip delta report and Android/runtime/accessibility evidence.
- Data/preference migration notes and any genuine pending checks.
- A rollback path using the scoped changes; no irreversible data rewrite.

**Completion gate:** all required code checks pass; no lost/duplicate accepted entries, unsafe copy or preference bypass; budgets are met; missing human/device/production evidence is clearly marked. Hand over locally without pushing, deploying or claiming production certification.

## Review checkpoints and practical parallel work

| Checkpoint | Reviewable result | Decision before moving forward |
| --- | --- | --- |
| **After B1–B2** | Reliable quiet/settings behavior and one accepted-action confirmation. | Save/persistence semantics, migration and duplicate prevention are proven. |
| **After B3–B4** | Consistent taps and a working Today Day ring with short nonmodal feedback. | Approve the deliberate Today composition and first/second/third-log behavior. |
| **After B5–B6** | Known wardrobe anticipation and visit-aware Momo warmth. | Confirm the character feels adult, optional and clear of the task. |
| **After B7–B8** | Understandable controls, optional reminders and real budget evidence. | Confirm preference save semantics, truthful delivery copy and data limits. |
| **After B9** | A complete local review/evidence pack. | User decides GitHub/release actions separately. |

Once the shared acceptance/preference interfaces are agreed, separate workers can handle shared control feedback, Momo content/pose integration, and tests/evidence in parallel. Keep journal-state changes, feedback consumption and integration under one owner to avoid competing edits to the save path. Parallel work must not invent different event rules, timing presets or preference semantics.

The first implementation batch is **B0 → B1 → B2**. Do not start the visual reward work until these foundations are verified. This document concludes the requested detailed planning; application implementation remains awaiting strategy approval.
