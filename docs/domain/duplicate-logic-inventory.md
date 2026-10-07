# Duplicate domain logic inventory

- Status: Shared policy extracted with recorded exceptions
- Last reviewed: 2026-08-20
- Decision reference: `docs/adr/0001-product-source-of-truth-and-shared-domain.md`

This inventory identifies rules that appear in both TypeScript clients. Web
behavior remains the current product reference until a difference is explicitly
approved as a platform exception.

| Domain | Shared owner | Remaining adapter / exception | First characterization evidence |
|---|---|---|---|
| Adult age and target safety | Nutrition primitives in `@fud-ai/domain/nutrition` | Full `computeTargets` stays client-specific: web has `other` / `extraActive`, kg weekly change, optional body fat, and custom macros; mobile uses `female/male`, percent rate, and a different moderate multiplier | `targets.v1.json` |
| Local calendar day | `isLocalDate`, calendar arithmetic, `localDateInZone`, `localHourInZone` | Web `localDayKey` still uses the device zone on read; mobile stores the IANA day at write | `calendar.v1.json` |
| Base streak | `@fud-ai/domain/streak` | Clients map entries and pause dates into the shared engine | `streaks.v1.json` |
| Streak freezes | `@fud-ai/domain/freezes` | Web passes pause days as extra coverage; mobile does not. Grant persistence stays in each store | `freezes.v1.json` |
| XP / points and levels | Web award eligibility and `WEB_LEVEL_XP` in `@fud-ai/domain/xp` | Mobile `points.ts` quadratic curve and ledger amounts stay an exception | `xp.v1.json` |
| Daily quests | Seed, progress, and titles in `@fud-ai/domain/quests` | Mobile keeps a fourth candidate slot for legacy `hit_protein` dates; web hour progress still uses the device clock | `quests.v1.json` |
| Meal-slot default | `@fud-ai/domain/meals` | Web may still store `other` as an explicit override; the default never returns it | `meals.v1.json` |
| Notification eligibility | `@fud-ai/domain/notifications` | Delivery, permission, and storage stay web-only. Mobile has no scheduler | `notifications.v2.json` |
| State and sync contracts | `@fud-ai/contracts` v1 | Snapshot `PUT /api/state` remains authoritative; entity projection stays fail-closed | Phase 4 / 5 release notes |

## Extraction order

1. Freeze current web and mobile behavior in neutral JSON fixtures without UI or storage dependencies.
2. Classify each mismatch as a bug, intended platform difference, or product decision.
3. Extract target safety and local-day behavior first because other rules depend on them.
4. Extract streak/freezes, then XP/points and quests.
5. Extract notification eligibility separately from platform delivery.
6. Switch one client at a time while both old-vs-new characterization suites remain green.
7. Delete the private implementation only after both consumers use the package.

## Rules that remain adapters or presentation

- React/React Native state stores and hooks.
- Browser `localStorage`, Expo SQLite/Drizzle, secure storage, and future sync queues.
- Notification delivery APIs and permission prompts.
- User-facing explanation strings, mascot behavior, sounds, haptics, and navigation.
- Database row mapping and API transport.
- Device-zone `localDayKey` on web until a versioned `localDate` field exists.

## Exit criteria

- Every row above has cross-client fixtures and an owner for unresolved differences.
- The shared package accepts explicit time, zone, and identity inputs.
- No extracted function imports UI, storage, network, clock, or random APIs.
- A change to shared rules runs both web and mobile checks in CI.
