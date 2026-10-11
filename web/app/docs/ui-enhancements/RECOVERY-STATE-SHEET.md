# Poiem recovery states

October 10, 2026 · Local M5 implementation · Before reference `e9c5eddb`

The [comparison gallery](recovery/gallery.html) shows phone and desktop in both themes. The [delivery report](recovery/README.md) records evidence and the remaining release checks. These changes use the existing validation, persistence and sync APIs.

| State | What the user sees and can do | Retained data and focus |
|---|---|---|
| Pending profile or AI edits | Save settings remains available, including when a draft is invalid. Preferences that apply immediately keep their own confirmation. | Profile and AI drafts remain in memory across Settings panels and exact search. A preference never applies unrelated draft fields. |
| Leaving Settings with edits | A sheet offers Stay, Save and leave, and Discard and leave. | Stay, Escape and backdrop keep the draft. Stay receives initial focus. Discard restores the current applied copy, including preferences already changed. Save validates both drafts before either update, then resumes the original router transaction. |
| Invalid departure Save | The decision sheet closes and the relevant panel opens with a visible error. | Input remains. Focus moves to the actual invalid control, including a field inside a disclosure. No partial profile/AI save occurs. |
| Browser Back or Forward | Settings panel history stays usable; departure to another app route asks about pending edits. | The router retains the exact blocked transaction. A full document leave uses the browser's native prompt where supported. A prompt does not persist an unsaved API key. |
| Intentional sign-out with edits | Stay or Discard and sign out; the sheet explains saving first. | Stay permits the usual explicit Save. Discard ends these page drafts. There is no combined save-and-sign-out promise while the existing persistence API provides no awaitable durability result. |
| Account expiry or change | Existing account recovery proceeds. | Old-account drafts cannot hold a new account behind a departure prompt. The account provider unmounts its private state; a late file read cannot open or apply the old account's backup. |
| Selecting a backup | The file is read and validated before any replacement. | Input resets so the same file can be selected again. A newer file, cancellation, account change or unmount invalidates an older read. No connection probe runs. |
| Invalid or unreadable file | An in-page error explains how to choose a valid exported JSON backup. | Current data and drafts remain. Raw file/parser details are not displayed. The error receives its existing live announcement. |
| Valid backup preview | Named account and filename, current/backup record counts, meal date range and expandable profile/preferences/AI comparison. Cancel and Replace Poiem data are explicit actions. | The preview holds the validated snapshot and current applied state. It excludes secret values and explains replacement, discarded drafts, setup status, key binding and the absence of import Undo. Initial focus is the cancel control. |
| Cancel backup | Return to the same Settings panel. | No replacement; pending drafts remain. Escape/backdrop also cancel. Focus returns to the import control. |
| Confirm backup | Replace using the exact reviewed validated snapshot. Local confirmation states that account sync has its own status. | Ownership clears synchronously so repeated activation applies once. A changed current copy requires selecting the file again. Existing import validation controls normalization and credential binding; imported secrets never become a new credential. |
| Preview plus route departure | The backup review closes before the unsaved Settings decision opens. | One modal owns focus. Cancelled file work stays cancelled; Stay retains pending Settings drafts. Shared sheets establish focus, Escape handling and the background scroll lock before their first paint; scrolling unlocks after the final sheet closes. |
| Offline or sync conflict presentation | Existing sync status and authority actions wrap above the journal instead of covering it. Buttons remain readable and reachable on narrow screens. | This slice changes presentation only. Disabled states, backup prerequisites, recovery and authority decisions remain in the existing app context. Gallery fixtures are synthetic and do not establish real cloud durability. |
| Support and About | Consistent links to AI setup, backup, account and pause controls. | Links use known Settings destinations, reveal the applicable panel/control and preserve the existing prerequisites. |
| Loading a secondary route | Saved, Insights and You load their route code on demand. Workspace navigation remains available while opening. | Heading focus waits for actual route content. Exact Settings links retain their own focus handling. No logging rule or data model changes. |
| Failed secondary-screen download | A safe error offers Reload this screen and Return to Today, with workspace navigation still available. | The recovery heading receives focus, including from a direct Settings link. Reload opens the same URL in a fresh document, clearing a rejected lazy import; returning to Today resets the route boundary. The route failure makes no journal replacement and exposes no raw exception. |
| Saved dropdowns | Larger selected text and a consistent decorative arrow. | Native semantic selects retain keyboard and platform selection behavior. The decorative arrow cannot intercept a tap. |

## Boundaries

Meal dates use each entry's saved local calendar date, with the existing timestamp fallback for older entries. Other record dates can lie outside the meal date range. Counts describe records in the current and validated backup; they are not a server comparison.

Appearance stored separately on the device, sign-in, password and plan are outside backup replacement. The existing importer retains a current personal key only for the same service, format and authentication binding; another connection requires re-entry. The default Poiem AI operator key is never rendered in the preview or catalog.

Physical keyboards, safe-area/browser chrome, native selection menus, screen readers, WebKit/Firefox and cloud staging remain separate release checks. Chromium emulation and synthetic sync presentation cannot close them.
