# Interaction layout follow-up

11 October 2026 · Baseline `84d0cf1e` · Implementation `bc85116f` (includes `1f5010d2`)

This follows the [smaller-download pass](../response-time/README.md) and addresses repeated UI work. The current Neo Brutalist layout, Momo scenes, animation recipes and data rules remain.

## Changes

- Today reuses selected-day entries, totals and meal groups while their immutable inputs stay the same. Current-day status includes the local calendar key, so an update after midnight can still refresh it. Meal rows use default shallow comparison with full entry objects, the fresh flag and action callbacks. Context changes can replace callbacks and still redraw rows; this does not promise that every Water/store update skips rendering.
- Floating Momo's stage and actual speech box share one fresh obstacle snapshot per scheduled check. Dialog/toast blocking, dense-phone deferral, travel collision, safe insets, visual viewport and visibility checks remain. Geometry does not persist across frames or actions. Speech stays hidden while a new resting position is measured.
- Placement retries require a mounted floating host. A missing host is placed afresh when it returns; it cannot trigger a continuous frame loop while absent. This fixes the timer regression found during this pass.
- Coach keeps the same draft-height formula and text measurement, while caching the viewport cap until window/visual-viewport resize and coalescing resize events. Editing and deleting text still resize the field.
- The meal receipt retains its initial before-paint clearance read. Subsequent ResizeObserver updates use the browser's border-box measurement, with the existing rectangle read as a fallback.

These changes reduce repeated work by construction. They do not by themselves establish faster feedback or a passing performance budget.

The final local checks passed: 994 units, 68 combined browser cases and 63 canonical visual cases. The 16 appearance pairs are byte-identical. The controlled comparison still fails all seven action budgets; loading results are mixed and the download estimate grows by 268 gzip bytes. No overall speed or release-completion claim is made.

## Evidence

- [Before and after gallery](gallery.html): Today, Coach, a real local first-meal receipt and floating Momo when space permits, both themes, phone and desktop.
- [Verification](verification/README.md): checks, fixture history and limits.
- [Performance comparison](performance/README.md): exact builds and unchanged action-feedback method.

No push or deployment is included. Physical phones, other browser engines, assistive technology, participant evidence, field performance and real cloud durability remain open release work.
