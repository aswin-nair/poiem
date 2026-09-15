# ADR 0004: Managed web AI with explicit BYOK

## Status

Accepted for the web-first rollout (2026-09-16).

## Decision

Authenticated web users use Poiem's managed AI by default. The API selects the
model from the database plan configuration; browsers never choose a managed
model or receive the operator key. Free accounts receive 20 food scans per
UTC day. Premium accounts receive 100 food scans and 50 Coach messages per UTC
day. A reservation is made atomically before an upstream attempt and is
released on provider failure, while global and per-IP attempt caps are never
refunded. Expired reservations are recoverable by the next request.

BYOK remains available only through the explicit Advanced setting. BYOK calls
continue to go directly from the browser to the selected provider. Momo's
live-authored dialogue is BYOK-only; its reviewed local dialogue pool remains
the fallback. Coach is managed-Premium-only, while a Free user may use Coach
with their own key.

The `ENABLE_MANAGED_AI` flag is fail-closed. It must be enabled together with
`OPENROUTER_API_KEY` and a positive `MANAGED_AI_GLOBAL_DAILY_MAX`; the database
migration must be applied before serving is enabled. Payments, entitlement
webhooks, and native iOS/Expo managed serving remain out of scope.

## Consequences

- Plan and subscription state are authoritative in `users` and
  `ai_plan_config`; expiry is checked on every request, so correctness does
  not depend on a cron job.
- `ai_usage_daily`, `ai_scope_daily`, and `ai_usage_reservations` provide
  transaction-safe user, IP, and global limits.
- The old `/api/gemini` route remains untouched and fail-closed.
- This supersedes the BYOK-only launch clause in ADR0002 for the browser
  surface. Mobile remains BYOK-only until a separate decision.

## Rollout guardrails

Set the following Vercel/Worker secrets only in a protected environment:

```text
ENABLE_MANAGED_AI=false
OPENROUTER_API_KEY=<operator secret>
MANAGED_AI_GLOBAL_DAILY_MAX=0
MANAGED_AI_IP_DAILY_MAX=250
```

Apply `npm run db:migrate:plans` against the intended Neon environment, verify
the seeded models against the current OpenRouter catalogue, bootstrap an
administrator by a controlled SQL change, then set the flag and global cap.
An authorized managed call is normal telemetry; unauthorized or unentitled
managed serving is an incident.
