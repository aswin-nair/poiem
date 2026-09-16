# Managed AI rollout checklist

The web managed-AI path is intentionally disabled until an operator enables
it. No live database or provider changes are performed by the application
build.

1. Set `DATABASE_URL`, `JWT_SECRET`, and rate-limit secrets in the protected
   deployment environment.
2. Run `npm run db:migrate:plans` from `web/` and confirm both `ai_plan_config`
   rows exist. Never run this against production without the normal migration
   approval and backup rehearsal.
3. Set `OPENROUTER_API_KEY`. That turns Poiem AI on for signed-in accounts
   (model `google/gemma-4-31b-it`). Set `ENABLE_MANAGED_AI=false` to disable.
   Optionally set `MANAGED_AI_GLOBAL_DAILY_MAX` (default 2000) and
   `MANAGED_AI_IP_DAILY_MAX`.
4. Mark the initial operator with a controlled database update to
   `users.is_admin = true`; the admin API never accepts that field from a
   browser request.
5. Use `/app/admin` to load the live model catalogue and save plan models and
   limits. Saving validates that every primary/fallback model supports text
   and images.
6. Enable `ENABLE_MANAGED_AI=true`, exercise status and analyze in staging,
   and verify that provider failures return a safe error without consuming a
   user's successful-call allowance.
7. Monitor `managed_ai_invoked`, quota, 5xx, and unauthorized-serving alerts;
   an authorized call is not an incident.

The daily retention route removes old AI reservations and counters. Subscription
expiry is evaluated synchronously on every status/analyze request, so a missed
cron cannot extend Premium access.
