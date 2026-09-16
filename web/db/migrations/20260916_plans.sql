-- Web managed AI. All days/reset boundaries are UTC. Safe to apply repeatedly.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS ai_plan_config (
  plan text PRIMARY KEY CHECK (plan IN ('free', 'premium')),
  provider text NOT NULL DEFAULT 'openrouter' CHECK (provider = 'openrouter'),
  model text NOT NULL,
  fallback_models text[] NOT NULL DEFAULT '{}',
  daily_food integer NOT NULL CHECK (daily_food BETWEEN 0 AND 10000),
  daily_coach integer NOT NULL CHECK (daily_coach BETWEEN 0 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);
-- Verified via https://openrouter.ai/api/v1/models on 2026-09-16:
-- both accept text + images. Do not replace an operator's existing configuration.
INSERT INTO ai_plan_config (plan, model, daily_food, daily_coach)
VALUES ('free', 'google/gemma-4-31b-it', 20, 0),
       ('premium', 'google/gemini-2.5-flash', 100, 50)
ON CONFLICT (plan) DO NOTHING;
-- Environments seeded before these defaults changed still hold the superseded values. Each
-- update is guarded on the value it replaces, so a deliberate operator choice is never lost.
UPDATE ai_plan_config SET model = 'google/gemma-4-31b-it', updated_at = NOW()
WHERE plan = 'free' AND model = 'google/gemini-2.5-flash-lite';
UPDATE ai_plan_config SET daily_food = 20, updated_at = NOW()
WHERE plan = 'free' AND daily_food = 5;

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  task text NOT NULL CHECK (task IN ('food', 'coach')),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  PRIMARY KEY (user_id, day, task)
);
-- Counts provider attempts, including fallbacks/timeouts, rather than just successes.
-- Failed calls may still cost money. These counters must never be refunded.
CREATE TABLE IF NOT EXISTS ai_scope_daily (
  day date NOT NULL,
  scope_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (day, scope_key)
);
CREATE TABLE IF NOT EXISTS ai_usage_reservations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  task text NOT NULL CHECK (task IN ('food', 'coach')),
  ip_hash char(64) NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'released')),
  expires_at timestamptz NOT NULL DEFAULT NOW() + INTERVAL '2 minutes',
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_reservations_pending ON ai_usage_reservations (user_id, day, expires_at) WHERE status = 'reserved';

CREATE OR REPLACE FUNCTION charge_ai_attempt(p_day date, p_ip text, p_global_max integer, p_ip_max integer)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('poiem-ai:' || p_day::text, 0));
  IF p_global_max <= 0 OR COALESCE((SELECT attempts FROM ai_scope_daily WHERE day = p_day AND scope_key = 'global'), 0) >= p_global_max THEN
    RETURN 'global_limit';
  END IF;
  IF p_ip_max <= 0 OR COALESCE((SELECT attempts FROM ai_scope_daily WHERE day = p_day AND scope_key = p_ip), 0) >= p_ip_max THEN
    RETURN 'ip_limit';
  END IF;
  INSERT INTO ai_scope_daily (day, scope_key, attempts) VALUES (p_day, 'global', 1), (p_day, p_ip, 1)
  ON CONFLICT (day, scope_key) DO UPDATE SET attempts = ai_scope_daily.attempts + 1;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION reserve_ai_usage(p_id uuid, p_user uuid, p_task text, p_limit integer, p_ip text, p_global_max integer, p_ip_max integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  today date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
  charge text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('poiem-ai:' || today::text, 0));
  -- A terminated worker cannot permanently consume a user's allowance.
  WITH expired AS (
    UPDATE ai_usage_reservations SET status = 'released'
    WHERE user_id = p_user AND day = today AND status = 'reserved' AND expires_at <= NOW()
    RETURNING task
  ), counts AS (SELECT task, COUNT(*)::integer AS n FROM expired GROUP BY task)
  UPDATE ai_usage_daily u SET reserved = GREATEST(0, u.reserved - counts.n)
  FROM counts WHERE u.user_id = p_user AND u.day = today AND u.task = counts.task;

  IF p_limit <= 0 OR COALESCE((SELECT used + reserved FROM ai_usage_daily WHERE user_id = p_user AND day = today AND task = p_task), 0) >= p_limit THEN
    RETURN 'user_limit';
  END IF;
  charge := charge_ai_attempt(today, p_ip, p_global_max, p_ip_max);
  IF charge <> 'ok' THEN RETURN charge; END IF;
  INSERT INTO ai_usage_daily (user_id, day, task, reserved) VALUES (p_user, today, p_task, 1)
  ON CONFLICT (user_id, day, task) DO UPDATE SET reserved = ai_usage_daily.reserved + 1;
  INSERT INTO ai_usage_reservations (id, user_id, day, task, ip_hash)
  VALUES (p_id, p_user, today, p_task, p_ip);
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION reserve_ai_fallback(p_id uuid, p_global_max integer, p_ip_max integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE r ai_usage_reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM ai_usage_reservations WHERE id = p_id;
  IF NOT FOUND OR r.status <> 'reserved' OR r.expires_at <= NOW() THEN RETURN 'expired'; END IF;
  RETURN charge_ai_attempt((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, r.ip_hash, p_global_max, p_ip_max);
END;
$$;

CREATE OR REPLACE FUNCTION finish_ai_usage(p_id uuid, p_success boolean)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE r ai_usage_reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM ai_usage_reservations WHERE id = p_id;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('poiem-ai:' || r.day::text, 0));
  UPDATE ai_usage_reservations SET status = CASE WHEN p_success THEN 'completed' ELSE 'released' END
  WHERE id = p_id AND status = 'reserved' RETURNING * INTO r;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE ai_usage_daily SET reserved = GREATEST(0, reserved - 1), used = used + CASE WHEN p_success THEN 1 ELSE 0 END
  WHERE user_id = r.user_id AND day = r.day AND task = r.task;
  RETURN true;
END;
$$;
