-- Upgrade only the untouched, previously seeded Free model. Safe to repeat.
-- Verified image/text support and pricing against the public catalogue on 2026-10-07.
-- Free is an account allowance; this model uses the operator's paid provider credits.
-- Preserve model/fallback choices saved by administrators, including the old model.
UPDATE ai_plan_config
SET model = 'google/gemini-3.5-flash-lite',
    fallback_models = ARRAY['google/gemma-4-31b-it']::text[],
    updated_at = NOW()
WHERE plan = 'free'
  AND provider = 'openrouter'
  AND model IN ('google/gemma-4-31b-it', 'google/gemini-2.5-flash-lite')
  AND updated_by IS NULL
  AND cardinality(fallback_models) = 0;
