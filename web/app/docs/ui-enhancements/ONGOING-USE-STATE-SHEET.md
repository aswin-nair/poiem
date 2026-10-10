# Everyday use: controls and retained data

October 9, 2026 · M4 local implementation · `poiem-motion-return`

The [comparison gallery](ongoing-use/gallery.html) shows eight states on phone and desktop in light and dark. [Verification](ongoing-use/README.md) records the local checks and remaining release gates.

## Saved

| Action / state | Visible result | Data contract |
|---|---|---|
| Open Saved | Recently used order, destination, search and meal-type filters | Sort copies the collection; templates are never rewritten. |
| Recently used / Most used / Name | Order follows exact matching journal entries or alphabetical names | Ties are stable. Unused meals follow used meals in Recently used and Most used; Name sorts alphabetically regardless of usage. Counts refer to matching logs in the current journal, rather than lifetime usage. |
| Choose a quarter portion | Portion and calories/macros update together | Existing `scaleMeal` and rounding remain authoritative for the logged entry, including grams and ingredients. |
| Sort, filter or search hides the row | Portion returns when the row becomes visible | Selections are stored by existing `mealKey` for this Saved visit. Navigation away or reload starts a new visit at 1×. |
| Save a recent meal | It moves to Saved with its chosen portion | The template stores the original meal values. The selected multiplier stays separate. |
| Change destination, then Log | One entry and confirmation in Today | Selected destination, final values and Undo remain correct. Rapid activation retains the existing guard. |
| No saved meals / no matches | A useful next action or clear-filters action | No synthetic entry, usage count or recommendation is generated. |

Exact matching uses the existing name/calorie/macro key. A modified or scaled nutrition entry has a different key; the UI says “matching journal logs” to describe this scope.

## Insights

| Action / state | Visible result | Data contract |
|---|---|---|
| Your week | Seven named dates, logged days and meals saved | A logged day contains at least one actual entry. Today is labelled in progress. This summary remains seven days when the chart changes to Month. |
| Week / Month | Chart range and data source are explicit | Seven or thirty local calendar days, inclusive of today. Nutrition totals and target calculations are retained. |
| Unlogged day | Dashed track; “intake is unknown” | Missing data is not presented as zero intake. |
| Actual zero-calorie entry | Zero is logged, with its meal count | The day contributes to the displayed average’s logged-day denominator. |
| Inspect a bar / date | Date, calories, meal count and macro values | Saved `localDate` takes priority across travel/timestamp boundaries, matching the journal. |
| Keyboard arrows / Home / End | Adjacent / first / last day selected | Roving chart focus stays in the chart. Only the chart viewport scrolls when necessary. |
| Day picker / previous / next | Same selection as the chart | Buttons disable at the range limits. All dates remain available in a month. |
| Change range | Retain a selected day inside the new range, otherwise select today | The selection is presentation state; no entry is edited. |
| Open this day | The existing journal opens at the selected date | Existing `journalDay` navigation is used. Back to today retains normal meal destinations. |
| Tracking paused | Existing paused notice, numbers hidden | Pause/streak rules are retained. |

Weight and calorie Trends are grouped separately from Journey milestones, consistency, archive and achievements. The chart also has a textual data table for assistive technology. Physical screen-reader and browser-engine checks remain pending.

## Coach

| Action / state | Visible result | Data contract |
|---|---|---|
| Starter / latest-answer follow-up | Text enters the focused, editable draft | No request or message is sent until Send. Selecting a suggestion replaces the current draft. |
| Enter | New line; composer expands within a viewport limit | Plain Enter does not submit. Send or Ctrl/Cmd+Enter submits; IME composition does not trigger the shortcut. |
| Clear draft | Empty focused composer | Saved conversation is untouched. The draft is local to the current Coach visit. |
| Send / responding | Existing response status and Cancel beside the composer | Existing request ownership and duplicate-message protection remain. |
| Failure / cancelled response | Existing contextual Retry, original message retained | Retrying uses the original history/message; deletion or Clear aborts its pending response. |
| Copy pending / success | “Copying…” then “Response copied” | Success is announced only after clipboard acceptance. Copy does not change chat. |
| Clipboard unavailable / denied | Read-only response text, focused and selected | Manual copying remains possible. No false success or automatic permission request. |
| Narrow / keyboard-height viewport | Draft, Send and Clear remain reachable | Composer is capped and scrolls internally. Physical keyboards and browser chrome still need device checks. |

AI access, safety handling, quota logic and provider context are retained. Mocked responses in the browser suite do not establish upstream or CORS availability.

## Exact Settings search

| Action / state | Visible result | Data contract |
|---|---|---|
| Search a public setting name | Individual controls and descriptions | Catalog contains names and synonyms, never personal values or credentials. |
| Activate result | Correct panel, exact focused control, brief outline | Search clears; existing profile and AI drafts survive panel changes. |
| Field inside a disclosure | Disclosure opens; control receives focus | Opening does not toggle, submit or save any setting. |
| Own API off / wrong auth method | Explanation; prerequisite focused | Search never enables a connection or changes authentication. Fallbacks are resolved through known catalog IDs. |
| Maintain goal / hidden Momo / disabled personality | Explanation; relevant prerequisite focused | Existing goal/visibility/live-AI values remain unchanged. |
| Hosted-only account control unavailable locally | Sign-in details or device Sign out focused | Search does not misrepresent local capability or sign out automatically. |
| Import / Delete result | Action button focused | File dialog, confirmation and destructive actions require a separate activation. |
| Same result again / unknown hash | Same result can be focused again; unknown hash ignored | No arbitrary selector or user data is accepted from the hash. |
| Change immediate preference / Save draft | Existing confirmation and validation | Search adds navigation only. Settings route-exit handling and import preview remain M5 work. |

## Character and motion

No new Momo scenes are added in this slice. The three finite stories from [first-session Momo](first-session/momo/gallery.html), existing caps, protected actions, mute/off/pause and reduced-motion behavior remain. Chart inspection, search focus and draft preparation use immediate positioning without a forced animated scroll.
