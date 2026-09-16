-- Fud AI Web — Neon Postgres schema
-- Run once in Neon SQL Editor or: npm run db:migrate (from web/)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google')),
  password_hash TEXT,
  password_salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_states (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  refresh_token_hash TEXT,
  previous_refresh_token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS state_mutations (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mutation_id UUID NOT NULL,
  request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  resulting_version BIGINT NOT NULL CHECK (resulting_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mutation_id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

-- Token-bucket keys are HMACs. Raw IP addresses and account identifiers are
-- never persisted in the limiter table.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_hash CHAR(64) PRIMARY KEY CHECK (bucket_hash ~ '^[0-9a-f]{64}$'),
  tokens DOUBLE PRECISION NOT NULL CHECK (tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_states ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- BYOK credentials are device-local. Remove any keys written by releases that
-- embedded them in AppState before cloud sync enforced the secret boundary.
UPDATE user_states
SET state = state #- '{aiSettings,apiKey}'::text[],
    version = version + 1,
    updated_at = NOW()
WHERE state #> '{aiSettings,apiKey}'::text[] IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS family_id UUID;
UPDATE auth_sessions SET family_id = id WHERE family_id IS NULL;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family
  ON auth_sessions (family_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_hash
  ON auth_sessions (refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_state_mutations_created_at ON state_mutations (created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated ON rate_limit_buckets (updated_at);

-- Serialize writes for one user, then either replay the recorded result or
-- atomically advance state and record the mutation. A mutation UUID may never
-- be reused with a different base version or payload hash.
CREATE OR REPLACE FUNCTION save_user_state_idempotent(
  p_user_id UUID,
  p_state JSONB,
  p_base_version BIGINT,
  p_mutation_id UUID,
  p_request_hash TEXT
)
RETURNS TABLE (outcome TEXT, resulting_version BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_hash TEXT;
  existing_version BIGINT;
  next_version BIGINT;
BEGIN
  IF p_base_version < 0 OR p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT 'version_conflict'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  SELECT request_hash, state_mutations.resulting_version
  INTO existing_hash, existing_version
  FROM state_mutations
  WHERE user_id = p_user_id AND mutation_id = p_mutation_id;

  IF FOUND THEN
    IF existing_hash = p_request_hash THEN
      RETURN QUERY SELECT 'replayed'::TEXT, existing_version;
    ELSE
      RETURN QUERY SELECT 'mutation_conflict'::TEXT, existing_version;
    END IF;
    RETURN;
  END IF;

  UPDATE user_states
  SET state = p_state,
      version = version + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND version = p_base_version
  RETURNING version INTO next_version;

  IF next_version IS NULL AND p_base_version = 0 THEN
    INSERT INTO user_states (user_id, state, version, updated_at)
    VALUES (p_user_id, p_state, 1, NOW())
    ON CONFLICT (user_id) DO NOTHING
    RETURNING version INTO next_version;
  END IF;

  IF next_version IS NULL THEN
    RETURN QUERY SELECT 'version_conflict'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  INSERT INTO state_mutations (
    user_id,
    mutation_id,
    request_hash,
    resulting_version
  ) VALUES (
    p_user_id,
    p_mutation_id,
    p_request_hash,
    next_version
  );

  RETURN QUERY SELECT 'saved'::TEXT, next_version;
END;
$$;

-- Managed AI plan, quota and operator configuration schema. All day boundaries are UTC.
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
INSERT INTO ai_plan_config (plan, model, daily_food, daily_coach)
VALUES ('free', 'google/gemma-4-31b-it', 20, 0),
       ('premium', 'google/gemini-2.5-flash', 100, 50)
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  task text NOT NULL CHECK (task IN ('food', 'coach')),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  PRIMARY KEY (user_id, day, task)
);
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
  IF p_global_max <= 0 OR COALESCE((SELECT attempts FROM ai_scope_daily WHERE day = p_day AND scope_key = 'global'), 0) >= p_global_max THEN RETURN 'global_limit'; END IF;
  IF p_ip_max <= 0 OR COALESCE((SELECT attempts FROM ai_scope_daily WHERE day = p_day AND scope_key = p_ip), 0) >= p_ip_max THEN RETURN 'ip_limit'; END IF;
  INSERT INTO ai_scope_daily (day, scope_key, attempts) VALUES (p_day, 'global', 1), (p_day, p_ip, 1)
  ON CONFLICT (day, scope_key) DO UPDATE SET attempts = ai_scope_daily.attempts + 1;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION reserve_ai_usage(p_id uuid, p_user uuid, p_task text, p_limit integer, p_ip text, p_global_max integer, p_ip_max integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE today date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date; charge text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('poiem-ai:' || today::text, 0));
  WITH expired AS (
    UPDATE ai_usage_reservations SET status = 'released' WHERE user_id = p_user AND day = today AND status = 'reserved' AND expires_at <= NOW() RETURNING task
  ), counts AS (SELECT task, COUNT(*)::integer AS n FROM expired GROUP BY task)
  UPDATE ai_usage_daily u SET reserved = GREATEST(0, u.reserved - counts.n) FROM counts WHERE u.user_id = p_user AND u.day = today AND u.task = counts.task;
  IF p_limit <= 0 OR COALESCE((SELECT used + reserved FROM ai_usage_daily WHERE user_id = p_user AND day = today AND task = p_task), 0) >= p_limit THEN RETURN 'user_limit'; END IF;
  charge := charge_ai_attempt(today, p_ip, p_global_max, p_ip_max);
  IF charge <> 'ok' THEN RETURN charge; END IF;
  INSERT INTO ai_usage_daily (user_id, day, task, reserved) VALUES (p_user, today, p_task, 1)
  ON CONFLICT (user_id, day, task) DO UPDATE SET reserved = ai_usage_daily.reserved + 1;
  INSERT INTO ai_usage_reservations (id, user_id, day, task, ip_hash) VALUES (p_id, p_user, today, p_task, p_ip);
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
  UPDATE ai_usage_reservations SET status = CASE WHEN p_success THEN 'completed' ELSE 'released' END WHERE id = p_id AND status = 'reserved' RETURNING * INTO r;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE ai_usage_daily SET reserved = GREATEST(0, reserved - 1), used = used + CASE WHEN p_success THEN 1 ELSE 0 END WHERE user_id = r.user_id AND day = r.day AND task = r.task;
  RETURN true;
END;
$$;

-- Phase 4 additive entity store. Snapshot writes remain authoritative until
-- staging parity evidence exists. These tables are empty in the first cloud
-- beta unless entity projection is explicitly enabled.
CREATE TABLE IF NOT EXISTS account_entities (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'profile', 'food_entry', 'weight_entry', 'exercise_entry',
    'favorite_meal', 'chat_message'
  )),
  entity_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  local_date CHAR(10) CHECK (local_date IS NULL OR local_date ~ '^\d{4}-\d{2}-\d{2}$'),
  time_zone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  record_version BIGINT NOT NULL DEFAULT 1 CHECK (record_version > 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, entity_type, entity_id),
  CONSTRAINT account_entities_calendar_required CHECK (
    entity_type IN ('profile', 'favorite_meal') OR local_date IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS entity_tombstones (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  record_version BIGINT NOT NULL CHECK (record_version > 0),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS device_cursors (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  cursor BIGINT NOT NULL DEFAULT 0 CHECK (cursor >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS entity_mutations (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mutation_id UUID NOT NULL,
  request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  resulting_cursor BIGINT NOT NULL CHECK (resulting_cursor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mutation_id)
);

CREATE TABLE IF NOT EXISTS migration_attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('web-state-v0', 'mobile-sqlite-0000')),
  source_version TEXT NOT NULL,
  device_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'detected', 'previewed', 'uploading', 'reconciling',
    'complete', 'confirmed', 'rolled_back', 'failed'
  )),
  discovered_count INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  reconciled_count INTEGER NOT NULL DEFAULT 0 CHECK (reconciled_count >= 0),
  source_checksum CHAR(64) CHECK (source_checksum IS NULL OR source_checksum ~ '^[0-9a-f]{64}$'),
  accepted_checksum CHAR(64) CHECK (accepted_checksum IS NULL OR accepted_checksum ~ '^[0-9a-f]{64}$'),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  rollback_expires_at TIMESTAMPTZ,
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_account_entities_user_date
  ON account_entities (user_id, local_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_mutations_created
  ON entity_mutations (created_at);
CREATE INDEX IF NOT EXISTS idx_migration_attempts_user
  ON migration_attempts (user_id, last_attempt_at);

CREATE OR REPLACE FUNCTION apply_entity_mutation(
  p_user_id UUID,
  p_mutation_id UUID,
  p_request_hash TEXT,
  p_kind TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_device_id TEXT,
  p_local_date CHAR(10),
  p_time_zone TEXT,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_record_version BIGINT,
  p_payload JSONB
)
RETURNS TABLE (outcome TEXT, resulting_cursor BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_hash TEXT;
  existing_cursor BIGINT;
  next_cursor BIGINT;
BEGIN
  IF p_request_hash !~ '^[0-9a-f]{64}$' OR p_kind NOT IN ('upsert', 'delete') THEN
    RETURN QUERY SELECT 'version_conflict'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT || ':entity', 0));

  SELECT request_hash, entity_mutations.resulting_cursor
  INTO existing_hash, existing_cursor
  FROM entity_mutations
  WHERE user_id = p_user_id AND mutation_id = p_mutation_id;

  IF FOUND THEN
    IF existing_hash = p_request_hash THEN
      RETURN QUERY SELECT 'replayed'::TEXT, existing_cursor;
    ELSE
      RETURN QUERY SELECT 'mutation_conflict'::TEXT, existing_cursor;
    END IF;
    RETURN;
  END IF;

  INSERT INTO device_cursors (user_id, device_id, cursor, updated_at)
  VALUES (p_user_id, p_device_id, 1, NOW())
  ON CONFLICT (user_id, device_id) DO UPDATE
  SET cursor = device_cursors.cursor + 1,
      updated_at = NOW()
  RETURNING cursor INTO next_cursor;

  IF p_kind = 'delete' THEN
    UPDATE account_entities
    SET deleted_at = COALESCE(p_deleted_at, NOW()),
        updated_at = COALESCE(p_updated_at, NOW()),
        record_version = GREATEST(account_entities.record_version, p_record_version),
        payload = '{}'::jsonb
    WHERE user_id = p_user_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id;

    INSERT INTO entity_tombstones (
      user_id, entity_type, entity_id, device_id, deleted_at, record_version
    ) VALUES (
      p_user_id, p_entity_type, p_entity_id, p_device_id,
      COALESCE(p_deleted_at, NOW()), p_record_version
    )
    ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE
    SET deleted_at = EXCLUDED.deleted_at,
        device_id = EXCLUDED.device_id,
        record_version = GREATEST(entity_tombstones.record_version, EXCLUDED.record_version);
  ELSE
    INSERT INTO account_entities (
      user_id, entity_type, entity_id, device_id, local_date, time_zone,
      created_at, updated_at, deleted_at, record_version, payload
    ) VALUES (
      p_user_id, p_entity_type, p_entity_id, p_device_id, p_local_date, p_time_zone,
      p_created_at, p_updated_at, p_deleted_at, p_record_version, p_payload
    )
    ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE
    SET device_id = EXCLUDED.device_id,
        local_date = EXCLUDED.local_date,
        time_zone = EXCLUDED.time_zone,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        record_version = EXCLUDED.record_version,
        payload = EXCLUDED.payload;
  END IF;

  INSERT INTO entity_mutations (
    user_id, mutation_id, request_hash, resulting_cursor
  ) VALUES (
    p_user_id, p_mutation_id, p_request_hash, next_cursor
  );

  RETURN QUERY SELECT 'saved'::TEXT, next_cursor;
END;
$$;
