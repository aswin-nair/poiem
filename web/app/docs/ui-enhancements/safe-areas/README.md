# Safe-area follow-up: comparison evidence

The original F05 request adds `viewport-fit=cover` and coordinates the top, side and bottom inset owners throughout the web app. This comparison records that follow-up after the M5 recovery work.

Open [the comparison gallery](gallery.html). The gallery has an optional striped overlay showing the synthetic inset regions; the PNG files themselves are unmodified screenshots. Full images open when selected.

## Compared sources

- **Before:** exact Git revision `e042f587`, exported into a separate cache directory without changing the active checkout.
- **After:** local implementation commit `5ff6164b`. The capture was made from the working tree based on `e042f587`; the eight implementation-file hashes were matched to the committed source. The raw [observations](observations.json) retain that match, the source patch and SHA-256 hashes.
- Both sources share the existing installed dependencies. Shared package code is unchanged between these versions. No dependency installation or package change is part of this comparison.

## Capture method

The 34 comparison pairs contain 68 viewport screenshots:

| Shape | CSS viewport | Synthetic inset: top / right / bottom / left | Views, in both themes |
| --- | --- | --- | --- |
| Portrait | 390 × 844 | 44 / 7 / 34 / 11px | Today, Log sheet, Settings toolbar, backup preview, Welcome, sign in, first-session introduction |
| Desktop | 1440 × 900 | 0 / 0 / 0 / 0px | The same seven views |
| Landscape | 844 × 390 | 0 / 44 / 21 / 44px | Today and Log sheet |
| Short screen | 390 × 400 | 44 / 7 / 34 / 11px | Settings departure dialog |

Each view uses a fresh desktop Chromium context, UTC and the existing synthetic Ada Chen account where signed in. The clock is set to `2026-09-19T20:00:00.000Z`; appearance is explicitly set to light or dark. Reduced motion, disabled optional mascot overlays and local data make the screenshots repeatable. API and external requests are blocked. Backup preview receives a synthetic file and does not apply it. Settings is deliberately made dirty before capturing its sticky toolbar and departure dialog.

The asymmetric portrait edges stress separate left/right owners. The 400px viewport is a short-screen geometry case. It does not simulate an actual phone keyboard. Zero-inset desktop captures provide a visual comparison for the existing layout.

The short-screen departure images show the dialog's initial scroll position. Its footer can start below the viewport; interaction checks scroll to and reach each action. The gallery does not imply that all dialog content must fit at once.

## Delivered changes and checks

Pages, navigation, toasts, sticky toolbars, dialogs and fixed confirmation actions share coordinated screen-edge spacing. Momo's art, speech and props use the same visible safe bounds. The phone welcome header keeps Sign in on one line with a 44px target. Pinch zoom remains unrestricted.

The final unit suite passed **981 checks**, the canonical screenshot suite passed **63 comparisons**, and the 15 inset interaction cases plus six Momo cases passed in their recorded batches. The gallery loads all **68 images**, has no horizontal overflow at 320, 390 or 1440px, and its keyboard controls work. Full batch boundaries, retries and unresolved loading failures are preserved in the [verification report](verification/README.md) and [results](verification/results.json). This is not an overall release pass.

The final Pixel-only recheck passed three unchanged repetitions. Earlier Pixel, Firefox and WebKit loading failures remain recorded. Response-time targets, other-engine verification and physical-device checks remain open.

## What this evidence can establish

The images and raw geometry show content positioning in these synthetic CSS cases. The before version is observed as it was; it is not expected to pass the new inset contract. Raw observations record horizontal overflow, page errors and selected visible control rectangles. Offscreen controls are recorded and are not automatically treated as inset collisions. Separate interaction checks scroll each relevant action into view and verify that it can be reached.

These screenshots do **not** certify iOS Safari `env()` values, physical display cutouts, browser chrome, keyboard transitions, pinch gestures, VoiceOver or TalkBack. Physical device and assistive technology checks remain release work. The recovery performance measurements were taken at the previous source revision; this screenshot set is not a new performance measurement.

## Reproduction

From `web/app`, with Node 24+, the existing dependencies and the matching Chromium installation:

```text
node docs/ui-enhancements/safe-areas/capture.mjs
```

The script uses only ports **5297** and **5197**, exports the exact before revision into `.cache`, links the existing dependency directory and starts one Vite server per source with the local backend. It closes the browser and stops both of its servers in a `finally` block. It does not stop other preview servers or reset the worktree.

To compare two committed revisions and write a separate output folder:

```text
node docs/ui-enhancements/safe-areas/capture.mjs --before-ref e042f587 --after-ref <safe-area-commit> --output <output-directory>
```

The script retains exports, PNGs and raw observations for review. It fails after capture if a page error or horizontal overflow greater than 1px is recorded. The current source hashes allow a later commit to be matched to this working-tree capture without claiming the images were generated from a different revision.

Use `--resume` to retain completed images only when the recorded source hashes still match. The final capture stopped once while waiting for desktop Today after fourteen before images; the unchanged resume completed all 68. An earlier partial capture also stopped waiting for a Settings field. Both attempts are preserved in the verification history; the cause is unconfirmed.
