# Fud AI — Web Stack Addendum
### Revisions to the build plan for React + TS + Vite + Neon

This supersedes §6.5, §7, §9 and parts of §11 of the main plan. Everything else — the guardrail in §1, the design direction, the screen specs, the economy in §5 — holds unchanged.

---

## 1. What actually changes on web

Four of these are real constraints, not preferences. Two of them affect retention directly.

### 1.1 iOS push notifications — the serious one

Web Push works on Android and desktop. On iOS it works **only if the user has added the PWA to their home screen** (16.4+). A user on iOS Safari who hasn't installed will never receive a streak reminder.

For a product whose retention loop is "come back tomorrow," that's a hole in the floor, not a rough edge. Three mitigations, in order of value:

1. **Prompt to install right after the first successful log**, inside the celebration afterglow — the single highest-intent moment you'll ever get. Not on first launch, where install prompts get dismissed reflexively. Frame it in terms of the benefit: "Add Fud AI to your home screen so I can remind you." Track `install_prompt_shown` / `install_completed` and treat the conversion rate as a top-line metric.
2. **Email fallback** for the streak-at-risk nudge, opt-in, for uninstalled iOS users only. Low CTR but non-zero, and it costs almost nothing.
3. **Forgiving catch-up.** Allow backfilling yesterday for free (not 50 gems as the main plan says — that price was written assuming reliable notifications). Charge gems only for days older than 48h. If you can't reliably remind people, don't penalise them for the gap.

Instrument push permission state as a user property and segment every retention metric by it. My guess is you'll see a 15–25 point D7 spread between installed and uninstalled, and that number is what justifies the install-prompt work.

### 1.2 Camera

`getUserMedia` is fine on modern mobile Safari and Chrome, but:

- **No background pre-warm.** The native trick of warming the session on foreground doesn't exist. Cold start is ~300–800ms. Mitigate by requesting the stream when the user's finger goes *down* on the FAB (`pointerdown`), not on click — buys you ~100ms of free latency.
- **Requires HTTPS and a user gesture.** Non-negotiable, plan the flow around it.
- **Keep `<input type="file" accept="image/*" capture="environment">` as a fallback.** It hands off to the native camera app — worse UX, but it works everywhere, including in embedded webviews where `getUserMedia` is blocked.
- Constrain to `facingMode: 'environment'`, `width: { ideal: 1920 }`. Downscale to ~1024px on canvas before upload; you'll cut recognition round-trip meaningfully and food recognition doesn't need more.

Your §11 exit criterion of **p50 camera→saved under 5s** is still achievable on web, but it's tighter. Budget: 500ms camera open, 300ms capture+downscale, 1500–2500ms recognition, then user edit time. The recognition call is where you have room — make it start uploading during the shutter animation, not after.

### 1.3 Haptics

`navigator.vibrate()` works on Android, does nothing on iOS Safari. Your celebration loses a sensory channel for roughly half your users. Compensate on iOS with a slightly longer confetti burst and an optional short audio cue (default off — audio-on-by-default is hostile).

### 1.4 Rive on web

`@rive-app/react-canvas` is solid. Notes:

- WASM payload is ~200KB gzipped. **Lazy-load the mascot** — dynamic `import()` after first paint. It must never block Today from rendering.
- Use `@rive-app/react-canvas-lite` if you don't need the full renderer feature set; meaningfully smaller.
- Canvas rendering happens on the main thread. Keep the mascot **out of the React re-render tree entirely** — drive it through imperative `useRive` refs and state machine inputs, never through props that change on every log. See `MascotController.tsx`.
- Set `useOffscreenRenderer: true` if you end up with more than one Rive canvas mounted.

### 1.5 Storage and offline

| Was (native) | Now (web) |
|---|---|
| MMKV | `localStorage` for tiny prefs only |
| expo-sqlite | **IndexedDB via Dexie** for entries + outbox queue |
| — | **Service worker** via `vite-plugin-pwa` (Workbox) |

Offline-first stays mandatory — people log in restaurants on bad connections. Pattern: write to Dexie immediately, render optimistically, push to an outbox table, drain the outbox on `online` and on visibility change. Conflict resolution: last-write-wins per entry ID, entries are effectively immutable so collisions are rare.

### 1.6 Layout gotchas

Bottom nav + FAB on mobile web needs: `100dvh` not `100vh` (iOS URL bar), `env(safe-area-inset-bottom)` padding, and `overscroll-behavior-y: contain` on the scroll container to kill pull-to-refresh fighting your ticket scroll.

---

## 2. Where things go in the monorepo

The split you already have is well suited to this. The gamification engine is pure logic with zero I/O, which means it belongs in `domain` and is exhaustively unit-testable — that's a real advantage over the typical version of this app where streak logic is smeared across API handlers.

```
packages/contracts/src/
  gamification.ts     zod schemas: XP events, streak state, quest defs, mascot behavior config
  entries.ts          entry + food DTOs
  index.ts

packages/domain/src/
  streak.ts           reconcile / recordLog / repair — pure, deterministic
  streak.test.ts      table-driven, incl. DST + travel cases
  xp.ts               daily XP computation with caps
  xp.test.ts
  quests.ts           progress evaluation against a day's entries
  gems.ts             ledger balance + affordability
  mascot/select.ts    behavior selection: priority, cooldowns, weighted pick, decay
  mascot/select.test.ts

web/app/src/
  mascot/
    anchors.tsx       AnchorProvider + useAnchor + getAnchorRect
    MascotController.tsx
    behaviors.ts      the behavior table (data, not logic)
    rive-inputs.ts    state machine input map
  features/today/     Ticket, MacroMeter, WaterRow
  features/log/       Camera, ResultCard, Celebration
  lib/db.ts           Dexie schema + outbox
```

**Keep `domain` free of React, Date.now(), and Math.random().** Pass `now` and a seeded RNG in as arguments. That's what makes the mascot behavior selector and the streak engine testable, and it's the difference between "we think the streak logic is right" and "we know it is."

---

## 3. The server boundary — do this before anything else

Vite is client-only. **Do not put the Neon connection string in the browser bundle**, and don't rely on the Neon Data API with RLS as your only line of defence for the gamification writes.

The reason is specific to this app: XP, gems, and streak state are all client-visible and all valuable. If the browser can write to `xp_ledger` directly, someone will grant themselves 50,000 gems within a week of launch, and worse, your economy analytics become garbage.

Three options, in order of how well they fit what you have:

1. **Hono on Node/Bun**, deployed anywhere, using `@neondatabase/serverless`. Shares `packages/contracts` types directly, and Hono's zod validator middleware consumes your existing schemas with no adapter. This is my pick.
2. **Vercel/Netlify functions** if you're already deploying there — same code, less routing control.
3. Neon Data API + RLS for **reads only**, with all mutations going through option 1.

The rule: **the client proposes, the server computes.** Client posts "I logged this entry"; the server runs the same `packages/domain` functions to derive XP, streak, and quest progress, and returns the new state. The domain package running on both sides is what lets you render optimistically without trusting the client.

Since you have Neon over MCP in your dev environment, run the migration in `neon/001_gamification.sql` against a branch first — Neon branching is genuinely good for this, and it means you can throw a 30-day simulated user run at the economy and drop the branch afterwards.

---

## 4. Testing plan

You have Vitest and Playwright already, so this is mostly about knowing what to point them at.

### Vitest (packages/domain)

The streak engine is where the bugs will be. Table-driven cases, all included in `streak.test.ts`:

- Log same day twice → no double increment
- Gap of exactly 1 day → streak alive, no freeze consumed
- Gap of 2 days with 1 freeze → freeze consumed, streak continues
- Gap of 3 days with 1 freeze → streak breaks
- Gap of 3 days with 2 freezes → survives
- **DST forward/back** in a DST-observing zone → no phantom missed day
- **Travel east across timezones** (IST → NZDT) → user "loses" a day, must not break
- **Travel west across the date line** → negative gap, must not increment twice or crash
- Milestone fires exactly once at each threshold
- Repair outside the 48h window is rejected
- Repair limited to once per calendar month, and the counter resets on month change

Plus a 30-day economy simulation asserting the gem balance lands in a sane band — that's the test that stops you shipping an economy where nobody can ever afford a 400-gem outfit.

### Playwright (web/app)

- Onboarding → first log completes, celebration plays, ticket shows one entry
- **Log flow performance budget**: assert camera-open → entry-visible under 5s with a mocked recognition response
- Offline: go offline, log, assert optimistic render; go online, assert outbox drains
- Streak break + freeze consumption via clock manipulation
- **The mascot must never block a click.** Position the mascot overlay over the FAB, then assert `page.click('[data-testid=fab]')` still fires. This one catches a real, easy-to-ship bug and it should be in CI from the day the overlay lands.
- Reduce-motion: set `prefers-reduced-motion: reduce`, assert no ambient behaviors fire

---

## 5. Revised roadmap

Phases 1–3 and 5–6 from the main plan are unchanged. Two insertions:

**Phase 0 — Server boundary (3–4 days, before Phase 1).** Stand up the API, wire Neon, run the migration, get `packages/domain` importable from both sides. Everything downstream depends on this and retrofitting it later means rewriting every mutation.

**Phase 2.5 — PWA shell (3–4 days, after the log loop).** Service worker, manifest, install prompt at the post-first-log moment, push subscription flow with the iOS install gate. Slot it here rather than at the end, because the install-prompt conversion rate is data you want early — it shapes how much you invest in notifications at all.

Phase 4 (Mascot v1) is slightly cheaper on web than native — no bridge, no native module config — but budget the same time and spend the difference on the anchor system, which is fiddlier here (see below).

---

## 6. The anchor system on web — one important difference

In React Native you can cache measured rects, because layout only changes on re-layout. **On web, scrolling moves everything**, so a cached rect goes stale continuously.

The fix is to store *elements*, not rects, and call `getBoundingClientRect()` lazily at the moment a behavior starts. Cheap, always correct, no scroll listener needed for measurement.

You do still need a scroll listener, but for a different reason: to **cancel** in-flight anchored behaviors. If the mascot is walking toward the FAB and the user scrolls, the target has moved and the animation is now wrong. Cancel on scroll and let the idle loop resume — which also gives you `dizzy_scroll` for free as the reaction.

That's implemented in `anchors.tsx` and `MascotController.tsx`.

---

## 7. Answers to the open questions, given this stack

**Portion estimation:** the LiDAR option is off the table on web. Go with visual portion references (a set of illustrated portion sizes the user taps) — which was the right answer anyway, and now it's also the only one. Build the reference set for your top 200 foods.

**Recognition vendor:** on web you're posting an image to an HTTP endpoint regardless, so vendor choice is unconstrained by the stack. The Indian-food accuracy question from §13 of the main plan is unchanged and still the deciding factor.

**Mascot production:** Rive files are portable — a rig commissioned for web works unchanged if you later ship native. Nothing about this decision is stack-locked, so it can proceed in parallel with Phase 0–2.
