# Managed AI rollout checklist

The web managed-AI path uses a protected server credential. Signed-in users
see Poiem AI as their default; there is no operator-key field in the product.
No live database or provider changes are performed by the application build.

1. Set `DATABASE_URL`, `JWT_SECRET`, and rate-limit secrets in the protected
   deployment environment.
2. Run `npm run db:migrate:plans` from `web/` and confirm both `ai_plan_config`
   rows exist. This runs the plans schema followed by the scoped
   `20261007_free_ai_model.sql` upgrade. Existing hosted accounts receive the
   new Free model only after this migration is applied. Never run this against
   production without the normal migration approval and backup rehearsal.
3. Set `OPENROUTER_API_KEY`. That turns Poiem AI on for signed-in accounts
   (Free model `google/gemini-3.5-flash-lite`, with
   `google/gemma-4-31b-it` as its fallback). Set `ENABLE_MANAGED_AI=false` to disable.
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

## Free model decision (2026-10-07)

Free describes the account's included allowance, not a zero-cost upstream
model. The new default is operator-paid Gemini 3.5 Flash-Lite. The current
[OpenRouter catalogue](https://openrouter.ai/api/v1/models) lists image input,
text output, and structured-output support. Google describes it as a fast
multimodal model for extraction and high-volume work in its
[model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

The catalogue's general intelligence index is 22.2 for Gemini 3.5 Flash-Lite
and 14.7 for the previous Gemma 4 31B. Google's
[model card](https://deepmind.google/models/model-cards/gemini-3-5-flash-lite/)
also reports improved general and visual reasoning over Gemini 3.1 Flash-Lite.
These are reasons to select the stronger default, not proof of more accurate
food recognition or nutrition estimates. No live inference benchmark was run.
The application still validates nutrition output and keeps estimates editable.

Operator prices per million tokens at review time:

| Model | Input | Output |
| --- | ---: | ---: |
| Previous Gemma 4 31B | $0.09 | $0.34 |
| New Gemini 3.5 Flash-Lite | $0.30 | $2.50 |

This is a 3.33x input and 7.35x output price increase. At the unchanged 1,600
token food-output cap, output alone can cost up to $0.004 per primary attempt;
input, image accounting, and a separately charged fallback add to that amount.
Prices and availability can change. Daily user allowances, global/IP attempt
caps, and the shared 24-second request timeout remain unchanged. The global
cap counts attempts, not dollars; use provider spend controls for a money limit.
Premium's default model is unchanged. The upgrade was prepared locally without
making paid provider requests or applying a live database migration.

The migration upgrades only Free rows with a previously seeded model, an empty
fallback list, and no administrator recorded in `updated_by`. It leaves an
administrator's model/fallback selection and every daily quota intact. Rows
already changed by an administrator stay on their chosen model until edited
explicitly. The older plans migration also preserves administrator edits when
updating its legacy seeds. The new schema seeds the same upgraded default for
new installations.

The previous Gemma model is the explicit fallback for upgraded defaults. Each
fallback reserves another operator attempt before being called. Existing rules
allow fallback on unavailable/missing models or unusable responses; authentication,
credit, and quota failures stop immediately. Invalid responses are never returned
as nutrition data, and exhausted provider attempts return the existing safe error
without using the user's successful-call allowance.

The operator credential stays in the server environment. Status/analyze replies,
plan configuration, upstream errors, and request telemetry do not include it.
The provider key is used only in the server's upstream authorization header;
the server rejects a response containing that credential.
