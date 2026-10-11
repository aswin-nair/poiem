# Three small Momo stories

October 9, 2026 · Local implementation companion

Momo performs these scenes through the existing interlude scheduler. The stage floats in reading space. The actual labels, nutrition values and controls keep their positions. Props are local vector drawings with no network or AI request.

## Story beats

| Scene | Setup | Performance | Ending | Quiet version |
|---|---|---|---|---|
| Ticket → paper plane | A decorative ticket arrives beside Momo. | Momo reads the ticket, it folds into a plane, and the plane travels across its small stage with a drawn trail. | The plane rests beside his wave; Momo becomes still. | A small ticket and plane sit together; no flight or pose animation. |
| Sign polisher | A decorative copy of an approved public heading appears. | Momo points; a small brush passes across the underline and a shine appears. | Momo bows, then rests beside the finished sign. | The public sign, brush, underline and shine remain visible and still. |
| Saved star waiter | A star sits above a mint tray. | Momo points as the tray tilts. The star nearly slips over one edge, then recovers. | Momo bows; the star returns to the centre of the tray. | The star and labelled Saved tray remain visible and still. |

The comment stays readable for the nine-second scene. The main choreography finishes within 4.8 seconds; it does not loop. Hovering or focusing the scene keeps its comment available until the person moves away. Dismiss and Mute retain 44px targets.

## Choosing a story

- A pending `submit` action gives the ticket its turn before the existing submit joke; a pending `save` action does the same for the waiter. These are decorative action reactions, and do not claim that a meal or request succeeded.
- The polisher joins the public title pool after the existing borrowed-word scenes. With deterministic first-choice selection, the original first title and water scenes remain unchanged.
- Lines and props use public interface text only: Today, Yesterday, Water, Saved, Insights, Journey or About. Anything outside that list becomes “TA-DA!”. Meal names, notes, calorie totals and other personal text are never copied.
- The existing lively/calm visit limits, no-repeat history and delay bands are retained. A scene that cannot be safely placed spends no visit.

## Placement and interruptions

Each story prop clips its entire flight, brush or star movement to a 108×64px box. The scheduler measures that box along with the bubble, character and actions, and finds space clear of controls and important reading values. It recalculates after scrolling, resizing and visual-viewport changes. If it cannot fit, it defers the scene.

Typing, the keyboard, dialogs, Undo feedback, loading and focused logging/account flows take priority. Opening a blocker removes the current scene; its pose timers and heading animation are cleaned up. The reserved page clearance remains until the route changes, so dismissing Momo does not pull a control out from under a finger.

Calm mode, the in-app reduced-motion preference and the device preference use the static versions. Off, mute and tracking pause suppress interludes. The first screenshot of a scene should not be mistaken for animation evidence: timed browser checks cover choreography and interruption separately.

## Reproducible preview fixtures

Use the normal seeded account with `mascotActivity: 'lively'`, `mascotReducedMotion: false`, local RNG `() => 0`, and the interlude test hook enabled. The standard visual seed normally reduces mascot motion, so its preference must be set explicitly when demonstrating movement.

| Fixture | Route and preparation | Selection | Capture |
|---|---|---|---|
| Ticket plane | Today; on phone scroll the companion/Water area into view. | Dispatch the same `poiem-action-play` event used by app controls, with `{ kind: 'submit' }`. | Advance the first-visit timer to 18.5 seconds, then capture the folding, flight and final phases. |
| Heading polish | About offers a public heading and room on phone; Today also works on wide desktop. | Seed seen IDs `title-borrow`, `title-heavy`, `title-wiggle` with visits zero to isolate the later title scene. | Advance to 18.5 seconds; capture brush travel and the final sign. |
| Saved waiter | Today; on phone scroll the companion/Water area into view. | Dispatch the app action event with `{ kind: 'save' }`. | Advance to 18.5 seconds; capture the tilt and recovered tray. |

The seen-ID fixture isolates scene selection; it is not a claim about ordinary first-visit cadence. For a calm preview use 45.5 seconds. For a reduced-motion preview keep lively cadence and enable device reduction. Cover light/dark at 390px and 1440px; keep the small-screen 320px and landscape placement checks separate from the storyboard.

Focused automated coverage is in `momoInterludes.test.ts`, `MomoInterlude.test.tsx` and `momo-stories.spec.ts`. Final execution results and visual evidence belong in the release report.
