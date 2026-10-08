# Poiem · Momo and action animations

October 7, 2026 · `poiem-motion-return`

Open the [before-and-after gallery](gallery.html) to compare this update with the previously pushed Neo Brutalist UI at `8e7e968a`.

## What changed

- Momo appears as a freestanding mascot with a separate comic speech bubble. He waves, points, borrows a public interface word and dances with it, or plays with water drops. The real heading keeps its text and accessible name while receiving one small wiggle.
- The 42 local lines include screen comments and reactions to recent actions. Momo can comment on water, saving and navigation. Private text and nutrition values never become joke material.
- Buttons, links, choices and disclosures have short decorative reactions. Water produces drops; save actions produce stars; navigation animates the arriving active icon. Controls retain their position and tap area.
- A newly saved meal's arriving star pops once. Switches rebound after their state changes, wardrobe changes give Momo a happy hop, and a newly filled decorative water glass hops once.
- The existing Lively, Calm, mute and reduced-motion settings govern these moments. Effects end, rapid taps coalesce, and navigation or preference changes clean up active decoration.

No dependency was added. The changes are confined to the web app and its review artifacts.

## Momo's timing and placement

Lively starts after 18–35 seconds and allows up to four visits per browser session, with 75–150 seconds between visits. Calm starts after 45–90 seconds and allows two visits, 180–300 seconds apart, with static art. The scene module loads after eight seconds of eligibility during the waiting period.

Scenes can appear on Today, Saved, Insights, About and the Journey alias. Typing, a keyboard, dialogs, receipts, Undo toasts, existing Momo speech, hidden tabs and recent interaction defer them. Logging and focused form routes keep their existing workflows. Show Momo off, mute and paused tracking disable scenes.

Placement measures the visible bubble, art, word prop and controls separately. It protects interactive controls, calorie and macro readouts, Journey values and the bottom navigation. A compact arrangement is available for desktop, landscape and crowded portrait screens. Scrolling repositions the scene or ends it when no clear space remains. An unsuccessful placement does not consume a session visit.

Close and Mute Momo each have a 44px target and an accessible name. Momo makes one polite announcement without taking focus. The nine-second timeout pauses on hover or keyboard focus. Dismissal restores focus when needed; the largest successfully displayed scene keeps its measured scroll clearance until the route changes, avoiding a jump at the bottom of the page.

## Screenshots and observations

The gallery contains four before-and-after comparisons at 390px and 1440px, in both themes. The `before` images preserve `8e7e968a`; `after` images match the deliberately updated canonical Linux Chromium baselines. The other 55 canonical checks retain their previous expectations.

Eight additional examples show 320px dark, 844×390 landscape dark, Saved dark, Insights light, a Water comment, water feedback, save feedback and switch feedback. These use the actual Lively setting with OS and profile reduced motion disabled. They capture single moments in finite animations. Canonical comparisons use consistent static screenshot settings.

[Scene observations](scene-observations.json) record Today at 320/390/1440px and landscape, plus Saved, Insights, About and Journey. All reviewed scenes were visible, with no horizontal overflow or runtime errors. Placement and visual review protect the painted bubble, art, prop and controls; the large transparent stage can cross a control's rectangle, as the 320px stage-bounds observation shows. Its empty areas let pointer events through.

[Action observations](action-observations.json) record water, navigation, save and switch feedback in Lively, plus water feedback in Calm and reduced motion. The water control stayed 44×44px in the same position; its three drops were gone after 650ms. The arriving saved star animated once. The Calm and reduced-motion water checks produced no spatial effects or particles.

## Verification

| Check | Result |
|---|---|
| Type check | Passed on final source |
| Lint | Passed; 13 existing warnings |
| Unit tests | 867 passed across 101 files |
| Local production build | Passed using the canonical Linux build; existing large entry-chunk warning remains |
| Canonical visual suite | 59 passed; exactly four Momo images deliberately updated after review |
| Chromium and production browser suite | 178 passed out of 179; the remaining case timed out dismissing onboarding before swipe delete, then passed on an isolated rerun. Includes the 12 Momo cases |
| iPhone and Pixel touch projects | 12 passed, including keyboard-height fields and portrait/landscape routes in both themes |
| Final Momo behavior suite | 12 passed, including focus, preferences, dialog/input priority, navigation and dismissal scroll clearance |

Existing assertions were adapted for the freestanding scene, stable switch markup and new style layers. No new tests were introduced for this animation pass. The Momo behavior suite was rerun after the final placement and scroll-clearance refinement.

## Download sizes

[Detailed measurements](assets.json) come from the final canonical Linux local build used for the passing visual suite. Values are the sum of gzip sizes for emitted assets, rather than the bytes downloaded for one route.

| Gzip bytes | Previous `8e7e968a` | Current | Growth from previous |
|---|---:|---:|---:|
| All JavaScript | 312,126 | 318,997 | 6,871 |
| All CSS | 62,623 | 64,161 | 1,538 |

The historical `96ef630a` growth budgets are exceeded: JavaScript grew 17,090 bytes against a 10,240-byte limit; CSS grew 3,148 bytes against a 2,048-byte limit. The previous snapshot's passing size results do not apply to this update. Cold Today downloads and the earlier strict interaction-latency gate were not remeasured.

## Remaining device checks

Physical iOS Safari and Android keyboard/address-bar behavior, notch and home-indicator spacing, haptics and screen-reader behavior still need checks on real devices. The phone projects use Chromium touch emulation, which does not certify Safari behavior.

The [previous Neo Brutalist report](../neo-brutalist/README.md) preserves that snapshot's results. [DESIGN.md](../../DESIGN.md) documents the current interaction and Momo rules.
