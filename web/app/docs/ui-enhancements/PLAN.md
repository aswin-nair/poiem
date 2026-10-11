# Poiem UI enhancement plan

The current execution plan is [E2E-PLAN.md](E2E-PLAN.md), with the journey and release checks in [E2E-CHECKLIST.md](E2E-CHECKLIST.md). The screen ideas below are the earlier proposal; use the end-to-end plan for scope, order and acceptance.

October 8, 2026 · Delivery plan for desktop and phone

The first core meal build is implemented locally: Today hierarchy, logging-method discovery, compact recents and estimate correction/confirmation. See the [comparison gallery](core-meal/gallery.html) and [implementation evidence](core-meal/README.md). The broader first-session prototype, new Momo storyboards and subsequent screen enhancements remain planned.

## Direction

Make Poiem feel like a playful kitchen journal: bold poster headings, warm paper, colourful meal labels, tactile controls and Momo performing small comic scenes. Give the daily actions a clear place and make long collections easier to scan.

This plan is based on the screen code and checked-in review screenshots. Its priorities are design hypotheses; the proposed usability goals still need participant measurement. Implementation status and measured layout changes are recorded separately in the evidence linked above.

## Build on the completed work

Keep the existing Neo Brutalist palette, shared controls, desktop navigation, light/dark themes, quick repeat logging, portion controls, Undo, draft restoration, cancel/retry recovery and custom API setup. Momo already has freestanding scenes, borrowed-word play, 42 local lines, finite action feedback and Calm/reduced-motion controls. Extend these systems.

## Release 1 — Today, logging and review

### 1. Bring Today’s useful content forward — highest priority

**Observed:** On phone, the greeting, day-progress panel, calorie card and macros all precede Meals. The desktop already has a useful summary/meal split.

- Put a compact daily summary near the top, with a clear Log a meal action. Keep calories and the three macros visible.
- Turn the greeting and day-progress information into smaller rows, with an expandable milestone detail. Keep the full progress story in Insights.
- Give empty meal groups a compact add row; expand a group as meals arrive.
- On desktop, retain the two columns and make the summary area more compact. Keep Water easy to reach.
- Keep calorie language neutral and show the selected date clearly.

**Acceptance:** At 390×844, the summary and primary logging action are visible together. The first meal or empty-meal action starts within the usable first viewport in the standard review fixture. At 320px, text wraps without horizontal scrolling.

### 2. Make every logging method easy to find

**Observed:** The logging sheet places its Photo, Describe and Manual methods after the recent-meal list. Recent rows repeat destination/context information and use substantial height.

- Place Photo, Describe and Manual choices before the recent list; keep Saved accessible beside them.
- Show three compact recent rows initially, with Show more for the rest.
- Put the selected meal and date in one clear header; keep each row’s accessible Log label specific.
- Keep name, calories, portion and Log visible. Expand secondary nutrition details on demand.
- Keep the keyboard closed on arrival and preserve the existing one-tap repeat path.

**Acceptance:** All logging methods are discoverable without scrolling at 390×844. Repeating a recent meal still takes one deliberate Log tap after opening the sheet. No duplicate entries on rapid taps.

### 3. Make review and correction feel effortless

**Observed:** Desktop already has a sticky summary. On phone, confirmation follows the editable fields. The original estimate is retained internally, but individual corrections have no visible reset.

- Add a phone confirmation strip with final calories, portion and Log meal. Position it clear of the keyboard and focused fields.
- Extend the existing desktop summary to show final macros alongside calories.
- Mark corrected values with a small Adjusted label and offer Reset to estimate per field.
- Keep ingredient detail optional and preserve the rule that changed totals cannot be presented as the original ingredient breakdown.
- Keep honest estimating, retry, cancellation and restored-draft states. Use an indeterminate loading animation unless real progress is available.

**Acceptance:** Users can change portion, find the final total and log without searching for confirmation. Errors focus the correct field. Resetting one field preserves other corrections. No invented confidence score or progress percentage.

## Release 2 — More character and clearer screen identity

### 4. Extend Momo with three new mini stories

- **The ticket folder:** Momo folds a decorative journal ticket into a paper plane after a completed task and a quiet interval.
- **The sign polisher:** He peeks around a header and polishes its decorative underline, followed by a short joke.
- **The star waiter:** He balances the public Saved star on a tiny tray and nearly drops it.

Use public interface words and decorative props. Keep the actual labels, numbers and control positions stable. Reuse the existing scene scheduler, protected regions, visit caps, Close/Mute controls and motion preferences. Queue scenes until typing, dialogs and Undo feedback are finished. Keep local jokes available without an AI request.

### 5. Give important moments a consistent visual language

- Use a paper-stamp motif for confirmed logging, a recipe-divider motif for Saved and a weekly journal motif for Insights.
- Extend the existing water drops, saved-star pop and navigation feedback with a few purpose-specific variations.
- Reserve hard shadows and bright fills for the main action and selected feature panels; keep reading rows easy to scan.
- Apply shared spacing, field, icon and empty-state rules across routes. Preserve meal/macro colour meanings in both themes.

**Acceptance:** A storyboard demonstrates each new scene in light/dark and phone/desktop layouts. One scene plays at a time, never covers a useful control, never takes focus and ends cleanly. Calm and reduced motion have readable static versions. New decoration uses the existing animation system and loads after core content.

## Release 3 — Saved, Insights and Coach

| Area | Enhancement | Acceptance |
|---|---|---|
| Saved | Compact phone rows; denser desktop layout; Recently used, Name and Most used sorting | Name, calories and Log remain visible. Sorting has a clear active state and a stable tie-break. Existing search, filters, portions and save feedback still work. |
| Insights | A short factual weekly summary; clearer separation of trends and Journey; a chart-day inspector with Open this day | Every summary identifies its period and data basis. Touch and keyboard users can select a day. Unlogged days remain distinct from zero intake. The inspector reaches the correct journal date. |
| Coach | Expanding multiline composer; starter prompts become editable drafts; Copy response and unobtrusive follow-up actions | Starter selection does not send automatically. Enter/newline behaviour is clear. Composer works at keyboard height. Cancel, retry and message deletion remain available. |

Sorting can be derived from existing meal/history data. Chart inspection can use existing journal dates. Do not introduce new backend work or persistent meal-photo storage in this release.

## Release 4 — Settings, accessibility and speed

- Let Settings search jump to an exact field or switch, open its disclosure and briefly highlight the focused control.
- Use consistent Poiem AI wording across availability and recovery messages. Keep personal API setup advanced but clearly labelled. Distinguish Saved setup from an actually verified provider connection.
- Review empty, loading, offline, paused, invalid and unavailable states across every core route, with one useful next action per state.
- Preserve 44px minimum app controls; use larger primary phone actions where space allows. Confirm focus visibility, 200% zoom, long names, large text and screen-reader announcements.
- Audit route loading and remove unnecessary work from the initial screen. Measure the animation and download cost against the current build before adding further effects.

Large targets help users activate controls accurately; WCAG’s minimum criterion includes sizing and spacing rules. Poiem’s proposed 44px control policy is its own stronger product target. See [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Preserve a way to disable nonessential interaction motion, as described in [W3C animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

## Delivery and review

1. Produce before/after concepts for Today, Log sheet and Review at 390px and 1440px, plus the three Momo storyboards. Review these before implementing the affected screens.
2. Implement Release 1 in small screen-focused changes, followed by Release 2. Use the existing design tokens and components.
3. Implement the collection, chart, Coach and Settings improvements in the listed order.
4. Review 320, 390, 768 and 1440px, plus landscape and keyboard-height layouts, in both themes. Include empty accounts, populated accounts and long labels.
5. Verify task completion, focus, tap targets, reduced motion, Undo, draft recovery and performance. Include physical iOS Safari and Android checks before release; browser emulation remains useful for repeatable coverage.

### Usability goals to measure

- A new user can find Photo, Describe or Manual logging without help.
- A returning user can repeat a meal in two taps from Today.
- A user can correct an estimate and identify the final total before saving.
- A user can find a saved meal and inspect a chart day without guessing.
- Momo adds a memorable moment without causing a missed tap or interrupted task.

The Today/Log sheet/Review comparison set and working daily meal loop are available locally. Next deliver the first-session/account continuity prototype and the three new Momo storyboards, then implement the remaining milestones. Task-based participant review is still pending.
