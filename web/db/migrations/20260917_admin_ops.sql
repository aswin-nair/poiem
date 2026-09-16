-- Operator audit trail for plan and account edits. Safe to apply repeatedly.
CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('plan.update', 'account.update')),
  target text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_created ON admin_audit (created_at DESC);

-- Record actual fallback attempts instead of inferring them from reservation totals.
ALTER TABLE ai_usage_reservations ADD COLUMN IF NOT EXISTS fallback_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION reserve_ai_fallback(p_id uuid, p_global_max integer, p_ip_max integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE r ai_usage_reservations%ROWTYPE;
  charge text;
BEGIN
  SELECT * INTO r FROM ai_usage_reservations WHERE id = p_id;
  IF NOT FOUND OR r.status <> 'reserved' OR r.expires_at <= NOW() THEN RETURN 'expired'; END IF;
  charge := charge_ai_attempt((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, r.ip_hash, p_global_max, p_ip_max);
  IF charge <> 'ok' THEN RETURN charge; END IF;
  UPDATE ai_usage_reservations SET fallback_count = fallback_count + 1 WHERE id = p_id;
  RETURN 'ok';
END;
$$;
