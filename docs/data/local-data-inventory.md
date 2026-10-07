# Local data inventory

- Status: Versioned web-sync, account-security, and mobile session/outbox baseline
- Last reviewed: 2026-08-20
- Code baseline: `web/app/src/types.ts`, `web/app/src/lib/*.ts`, and `mobile/src/db/schema.ts`

This document inventories the current web and Expo persistence surfaces. It is descriptive, not permission to sync a field. The migration decision for each group is recorded in `migration-map-v1.md`.

## Classification

| Class | Meaning | Examples |
|---|---|---|
| Secret | Credential material that must never enter normal app-state sync or analytics | BYOK API key, session token, password hash |
| Sensitive | Personal, health-adjacent, food, or private-content data | Birthday, weight, food entries, coach messages |
| Pseudonymous | Product telemetry that can identify a device or account when combined with other data | Analytics events, experiment assignment |
| Preference | User-selected behavior with limited sensitivity | Sound, haptics, provider/model without a key |
| Derived | Recomputable state that is not authoritative | Level, streak, quest progress, calculated targets |

## Web `AppState`

The current browser authority is a schema-versioned, per-account IndexedDB record
containing the latest validated secret-free snapshot and ordered sync outbox.
`fud-ai-web-state-<userId>` is now a migration-only legacy source that is removed
only after durable commit. Runtime `AppState` still carries the BYOK key for AI
calls, but persistence and transport serialize a secret-free copy. The key is
stored separately under `fud-ai-private-ai-key-<userId>` and is rejected again at
the server boundary.

| Field path | Shape | Class | Authority and notes |
|---|---|---|---|
| `onboarded` | boolean | Preference | Workflow marker; validate against profile completeness rather than trusting it alone |
| `profile.name` | optional string | Sensitive | User-entered display name |
| `profile.gender` | `male`, `female`, or `other` | Sensitive | Calculation input; differs from mobile's two-value `sex` field |
| `profile.birthday` | `YYYY-MM-DD` string | Sensitive | Age-gate input |
| `profile.heightCm` | number | Sensitive | Profile measurement |
| `profile.weightKg` | number | Sensitive | Current profile measurement; weight history is separate |
| `profile.activityLevel` | enum including `extraActive` | Sensitive | Calculation input; mobile lacks `extraActive` |
| `profile.goal` | `lose`, `maintain`, or `gain` | Sensitive | Calculation input |
| `profile.bodyFatPercentage` | optional number | Sensitive | Calculation input |
| `profile.weeklyChangeKg` | optional number | Sensitive | Requested rate; must be revalidated |
| `profile.goalWeightKg` | optional number | Sensitive | Must pass BMI refusal rules |
| `profile.customCalories` | optional number | Sensitive | Input, not an approved output; must pass the shared calculation path |
| `profile.customProtein` | optional number | Sensitive | User target input |
| `profile.customFat` | optional number | Sensitive | User target input |
| `profile.customCarbs` | optional number | Sensitive | User target input |
| `profile.soundEnabled` | optional boolean | Preference | Local feedback preference |
| `profile.hapticsEnabled` | optional boolean | Preference | Local feedback preference |
| `profile.trackingPaused` | optional boolean | Sensitive | Safety/off-ramp state |
| `foodEntries[]` | array | Sensitive | Authoritative meal history |
| `foodEntries[].id` | UUID-like string | Sensitive | Preserve as the client mutation ID |
| `foodEntries[].name` | string | Sensitive | User food content; prohibited in analytics |
| `foodEntries[].calories/protein/carbs/fat` | numbers | Sensitive | User-reviewed nutrition values |
| `foodEntries[].timestamp` | ISO string | Sensitive | Preserve the instant and derive local day only with an explicit zone |
| `foodEntries[].emoji` | optional string | Preference | Presentation metadata |
| `foodEntries[].source` | source enum | Sensitive | Product-method metadata; do not place food text beside it in telemetry |
| `foodEntries[].mealType` | meal enum including `other` | Sensitive | Mobile lacks `other` |
| `foodEntries[].servingSizeGrams` | optional number | Sensitive | User-reviewed serving value |
| `foodEntries[].ingredients[]` | optional array | Sensitive | Each row contains `item`, `grams`, `calories`, `protein`, `carbs`, and `fat` |
| `weightEntries[]` | `{ id, date, weightKg }[]` | Sensitive | Authoritative history; absent from the current Expo schema |
| `exerciseEntries[]` | `{ id, name, emoji, caloriesBurned, durationMinutes, timestamp }[]` | Sensitive | Authoritative activity history; absent from the current Expo schema |
| `favoriteMeals[]` | array | Sensitive | Saved meal objects with `id`, name, macros, optional emoji/grams/ingredients, and meal type |
| `chatMessages[]` | `{ id, role, content, timestamp }[]` | Sensitive | Private coach content; migration should require explicit disclosure |
| `aiSettings.provider` | provider enum | Preference | May sync only if the product decision permits |
| `aiSettings.model` | string | Preference | May sync only if the product decision permits |
| `aiSettings.customInstructions` | optional string | Sensitive | May contain private text; keep out of analytics and review before sync |
| `aiSettings.apiKey` | string | Secret | Runtime-only compatibility field. Persist separately on the device; it must never sync, enter logs, analytics, crash reports, or ordinary export |
| `gamification.xp` | number | Derived | Recompute or verify from accepted events |
| `gamification.level` | number | Derived | Recompute from XP |
| `gamification.streakFreezes` | number | Derived | Compare with the freeze ledger/policy |
| `gamification.freezeUsedDates[]` | local-date strings | Sensitive | Migration input for freeze reconciliation |
| `gamification.freezeEarnedMonth` | `YYYY-MM` string | Derived | Recompute under the current policy |
| `gamification.pauseStartedDate` | local-date string or null | Sensitive | Active pause start; required to hold streak/freeze/quest progression across relaunches |
| `gamification.pauseProtectedDates[]` | local-date strings | Sensitive | Neutral days that bridge a streak without increasing it |
| `gamification.xpEvents[]` | `{ id, key, xp, label, timestamp }[]` | Sensitive | Dedup keys and audit input; labels are display content |
| `gamification.awardedKeys[]` | string array | Sensitive | Untruncated idempotency ledger; display-feed truncation must never remove these keys |
| `gamification.pendingLevelUp` | number or null | Derived | Ephemeral presentation state; do not migrate |
| `gamification.seenBadgeIds[]` | string array | Preference | May migrate after legacy-key merge |
| `gamification.quest` | optional object | Derived | Contains `date`, `type`, `target`, `progress`, `completedAt`, and optional `beforeHour`; regenerate/verify by local day |

## Other web browser stores

| Key | Shape | Class | Current lifecycle |
|---|---|---|---|
| `fud-ai-web-state` | legacy raw `AppState` | Sensitive plus Secret | Copied into the per-user key and immediately removed when no per-user state exists |
| `fud-ai-web-state-<userId>-quarantine` | last malformed raw state blob | Sensitive plus possible Secret | Retained locally for recovery when hydration validation fails; removed by explicit data deletion |
| `fud-ai-private-ai-key-<userId>` | raw provider API key | Secret | Device-local compatibility store; removed when cleared and excluded from AppState export/transport |
| `fud-onboarding-draft-<userId>` | versioned onboarding step, profile draft, and first-meal draft | Sensitive | Resumable during setup; removed on completion or explicit data deletion |
| IndexedDB `fud-ai-web-durable` / `accounts` | schema-v1 per-user `{ state, serverVersion, origin, updatedAt, outbox[] }` | Sensitive | Primary offline authority; each ordered mutation has a stable UUID, account/session binding, base version, timestamp, local day, bounded IANA time zone, retry/lease state, and a secret-free snapshot; removed after confirmed destructive deletion |
| `fud-ai-durable-account-<userId>` | serialized durable account record | Sensitive | Explicitly surfaced fallback only when IndexedDB cannot be opened; same validation and deletion rules as the primary record |
| `fud-ai-durable-recovery-<userId>` | malformed durable record | Sensitive | Quarantined device-recovery copy; never hydrated as state; removed by confirmed deletion |
| IndexedDB `fud-ai-web-drafts` / `drafts` | schema-v1 per-user `{ envelope, recovery? }` text/manual/review drafts | Sensitive | Primary food-log draft store; each section expires seven days after last edit; removed after successful log, data reset, or account deletion; persists across sign-out for the same account; never contains a BYOK key or photo bytes |
| `fud-log-drafts-v1-<encodedUserId>` | schema-v1 text/manual/review drafts | Sensitive | Fallback only when IndexedDB cannot be opened; same expiry and deletion rules as the primary record |
| `fud-log-drafts-recovery-v1-<encodedUserId>` | `{ raw, quarantinedAt }` malformed draft blob | Sensitive | Quarantined locally and removed by expiry (seven days after quarantine) or explicit data/account deletion |
| `fud-ai-local-users` | email-keyed `{ sub, email, name, passwordHash, salt, createdAt }` records | Secret | Development/local-backend compatibility only; production cloud mode uses the API account store |
| `fud-ai-auth-session` | `{ sub, email, name, picture?, provider? }` | Sensitive | Removed on sign-out |
| Access JWT | short-lived bearer | Secret | Held in memory only; a leftover `fud-ai-auth-token` in `localStorage` is cleared and rejected |
| `fud_refresh` cookie | rotating refresh token | Secret | HttpOnly, SameSite=Lax; hashed at rest on the server |
| `fud-analytics-v1` | newest-first telemetry envelopes `{ schema_version, event_id, occurred_at, environment, release, platform, app_surface?, event }`, capped at 200 | Pseudonymous | Current device-local ring buffer; `event` is restricted to the contracts allowlist |
| `fud-crashes-v1` | newest-first `client_crash` envelopes with `error_name` and `handled` only, capped at 200 | Pseudonymous | Device-local crash buffer; no message, stack, or application state |
| `fud-analytics` | legacy unversioned event rows | Pseudonymous | No longer read or written; removed by explicit data deletion |
| `fud-notify-log` | `{ date, kinds[] }`, where kind is `routine`; logs written before the loss-framed reminders were retired may still hold `save` or `freeze`, which are never migrated and are harmless (they only count toward the daily cap) | Preference | Replaced as the local day changes and removed by explicit data deletion |
| `fud-seen-badges` | badge-ID string array | Preference | Legacy side store; partially normalized into `AppState` and removed by explicit data deletion |
| `poiem-ring-ack-v1` | local `YYYY-MM-DD` string; absent by default | Preference | Device-local. Written when the Day ring closes for the first time that local day, so its flourish plays once per local day (another device may play it once more). Replaced the next local day it closes; removed by explicit data reset or account deletion, alongside the notification log. Never synced, exported, or carried by guest claim |

The durable browser record is schema-versioned and preserves an ordered,
idempotent outbox. It retains bounded malformed-state recovery copies and
surfaces recovery/conflict states, but it is still a full-snapshot protocol,
not a field-level merge ledger. A version conflict never blind-retries: the user
must first download a secret-free device backup, then explicitly adopt the
validated server snapshot or rebase the latest device snapshot onto the newly
observed server version.

## Expo SQLite

The database name is `calorie-tracker.db`. Drizzle migration `0000_lazy_nova.sql` creates six product tables plus Drizzle's migration metadata.

| Table | Columns | Class | Authority and notes |
|---|---|---|---|
| `profile` | `id`, `name`, `date_of_birth`, `sex`, `height_cm`, `weight_kg`, `activity_level`, `goal`, `weekly_rate_pct`, `timezone`, `daily_kcal_target`, `protein_g_target`, `carbs_g_target`, `fat_g_target`, `sound_enabled`, `haptics_enabled`, `tracking_paused`, `created_at` | Sensitive, Preference, Derived | Single profile row; calculated target columns must be revalidated rather than trusted during cross-client migration |
| `foods` | `id`, `name`, `brand`, `serving_label`, `serving_grams`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `source`, `is_favorite`, `last_used_at` | Sensitive | Mixes built-in and custom food catalog rows; built-ins should not be uploaded as user records |
| `meal_entries` | `id`, `food_id`, `custom_name`, `servings`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `meal_slot`, `logged_at_utc`, `local_date` | Sensitive | Authoritative meal history; `local_date` is deliberately stored at write time |
| `points_ledger` | `id`, `delta`, `reason`, `local_date`, `created_at` | Sensitive | Append-only authoritative event ledger for points; total is derived |
| `streak_freezes` | `id`, `granted_local_date`, `consumed_local_date` | Sensitive | Freeze ledger |
| `quests` | `id`, `local_date`, `type`, `target`, `progress`, `completed_at` | Sensitive, Derived | Daily quest state; verify against deterministic generation |
| `onboarding_drafts` | `id`, `schema_version`, `step`, `payload`, `updated_at`, `quarantined` | Sensitive | Resumable onboarding; incompatible or under-age payloads are quarantined |
| `product_events` | `name`, `recorded_at` | Pseudonymous | Once-only local markers such as `first_log`; no food text or body metrics |
| `sync_outbox` | mutation id, account/device ids, kind, entity JSON, cursor, retry metadata | Sensitive | Secret-free contract envelopes only; never tokens. Upload stays disabled unless entity sync is explicitly enabled |
| `sync_state` | `user_id`, `device_id`, cursor, last ack/error | Pseudonymous | Device cursor for an authenticated account; no credentials |

SecureStore also holds `fud.session.refresh.v1`, secret-free session metadata, the stable device id, and the app-lock flag. Access tokens stay in memory. The Expo schema still has no weight-history, exercise, coach-chat, or ingredient-line tables. Secrets must not be added to SQLite.

## Current server destination

`web/db/schema.sql` contains `users`, versioned `user_states`, `auth_sessions`,
`state_mutations`, `password_reset_tokens`, privacy-keyed `rate_limit_buckets`,
and additive `account_entities`, `entity_tombstones`, `device_cursors`,
`entity_mutations`, and `migration_attempts`. State writes still use a
per-user advisory transaction lock, optimistic base version, canonical
request hash, and per-user UUID mutation ledger. Account deletion cascades
across user-owned rows. `user_states.state` remains the live JSONB snapshot.
Entity tables are empty unless projection is explicitly enabled.
`POST /api/entities` stays fail-closed. Mobile account grants stay fail-closed
until `ENABLE_MOBILE_AUTH=true`. Password-reset mail stays fail-closed until
`APP_ORIGIN`, `MAIL_FROM`, and `RESEND_API_KEY` are set. Local-to-cloud upload
stays fail-closed. Retention periods and cleanup status are recorded in
`retention-schedule.md`.

## Review triggers

Update this inventory whenever a persisted field, browser key, SQLite column, secure-store entry, analytics envelope, server entity, export field, or deletion behavior changes.
