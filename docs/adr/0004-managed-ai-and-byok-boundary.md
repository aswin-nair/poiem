# ADR 0004: Managed web AI with explicit BYOK

## Status

Accepted for the web-first rollout (2026-09-16).
Updated for custom BYOK connections and the Free-model default (2026-10-07).

## Decision

Authenticated web users use Poiem's managed AI by default. The API selects the
model from the database plan configuration; browsers never choose a managed
model or receive the operator key. Free accounts receive 20 food scans per
UTC day. Premium accounts receive 100 food scans and 50 Coach messages per UTC
day. A reservation is made atomically before an upstream attempt and is
released on provider failure, while global and per-IP attempt caps are never
refunded. Expired reservations are recoverable by the next request.

BYOK is an explicit “Use my own API” setting. Users may configure a custom
API endpoint and model rather than being restricted to provider presets.
Compatible BYOK calls continue to go directly from the browser to the selected
provider; that API must support the chosen request format and browser CORS.
Custom connections support OpenAI Chat Completions, native Gemini generateContent,
and native Anthropic Messages formats, with bearer, API-key-header, or no
authentication. Hosted connections require HTTPS; local development also allows
HTTP on local loopback for local models. Proprietary formats need a compatible
gateway. The browser sends
neither Poiem cookies nor Poiem account tokens to a custom endpoint and refuses
redirects. Momo's
live-authored dialogue is BYOK-only; its reviewed local dialogue pool remains
the fallback. Coach is managed-Premium-only, while a Free user may use Coach
with their own key.

Poiem AI turns on when `OPENROUTER_API_KEY` is set. Set `ENABLE_MANAGED_AI=false`
to disable. The database migration must be applied before serving. Payments,
entitlement webhooks, and native iOS/Expo managed serving remain out of scope.
The operator credential is server-only and is never displayed or editable in
end-user settings. End users see Poiem AI as the default connection.

## Consequences

- Plan and subscription state are authoritative in `users` and
  `ai_plan_config`; expiry is checked on every request, so correctness does
  not depend on a cron job.
- `ai_usage_daily`, `ai_scope_daily`, and `ai_usage_reservations` provide
  transaction-safe user, IP, and global limits.
- The old `/api/gemini` route remains untouched and fail-closed.
- The default Free model is `google/gemini-3.5-flash-lite`, with the previous
  `google/gemma-4-31b-it` as an explicit fallback. The scoped model migration
  preserves administrator choices and user quotas. Existing installations must
  apply it before benefiting from the upgrade. Free account requests are still
  operator-paid; the exact price increase and selection evidence are recorded in
  [the rollout guide](../operations/managed-ai-rollout.md#free-model-decision-2026-10-07).
- This supersedes the BYOK-only launch clause in ADR0002 for the browser
  surface. Mobile remains BYOK-only until a separate decision.

## Rollout guardrails

Set the following Vercel/Worker secrets only in a protected environment:

```text
# OPENROUTER_API_KEY=<operator secret>
# ENABLE_MANAGED_AI=false
# MANAGED_AI_GLOBAL_DAILY_MAX=2000
MANAGED_AI_IP_DAILY_MAX=250
```

Apply `npm run db:migrate:plans` against the intended Neon environment, verify
the seeded models against the current OpenRouter catalogue, bootstrap an
administrator by a controlled SQL change, then set the flag and global cap.
An authorized managed call is normal telemetry; unauthorized or unentitled
managed serving is an incident.
