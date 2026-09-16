import type { AdminAuditEntry, AdminUsageSnapshot, AiPlanConfig } from '../../shared/aiPlans.js'
import { asRows, getDb } from './db.js'
import { dailyGlobalMax, loadPlanConfig, nextReset } from './plan.js'

let ensured = false

export async function ensureAdminOpsSchema(): Promise<void> {
  if (ensured) return
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS admin_audit (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL CHECK (action IN ('plan.update', 'account.update')),
      target text NOT NULL,
      before_state jsonb NOT NULL,
      after_state jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS admin_audit_created ON admin_audit (created_at DESC)`
  try {
    await sql`ALTER TABLE ai_usage_reservations ADD COLUMN IF NOT EXISTS fallback_count integer NOT NULL DEFAULT 0`
  } catch { /* Managed-AI tables are applied by the plans migration. */ }
  ensured = true
}

export function deriveAdminUsage(input: {
  foodUsed: number | null
  coachUsed: number | null
  successes: number | null
  failures: number | null
  attempts: number | null
  fallbackAttempts: number | null
  budgetLimit: number
  day: string
}): AdminUsageSnapshot {
  const attempts = input.attempts ?? 0
  return {
    available: true,
    day: input.day,
    foodUsed: input.foodUsed ?? 0,
    coachUsed: input.coachUsed ?? 0,
    successes: input.successes ?? 0,
    failures: input.failures ?? 0,
    fallbacks: input.fallbackAttempts ?? 0,
    attempts,
    budgetUsed: attempts,
    budgetLimit: input.budgetLimit,
  }
}

export function unavailableUsage(day = nextReset().slice(0, 10)): AdminUsageSnapshot {
  return {
    available: false,
    day,
    foodUsed: null,
    coachUsed: null,
    successes: null,
    failures: null,
    fallbacks: null,
    attempts: null,
    budgetUsed: null,
    budgetLimit: null,
  }
}

export async function loadAdminUsage(): Promise<AdminUsageSnapshot> {
  await ensureAdminOpsSchema()
  const sql = getDb()
  const day = (await asRows<{ day: string }>(await sql`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date::text AS day`))[0]?.day
    ?? new Date().toISOString().slice(0, 10)
  try {
    const rows = asRows<{
      food_used: number
      coach_used: number
      successes: number
      failures: number
      fallbacks: number
      attempts: number | null
    }>(await sql`
      SELECT
        COALESCE((SELECT SUM(used) FROM ai_usage_daily WHERE day = ${day}::date AND task = 'food'), 0)::integer AS food_used,
        COALESCE((SELECT SUM(used) FROM ai_usage_daily WHERE day = ${day}::date AND task = 'coach'), 0)::integer AS coach_used,
        COALESCE((SELECT COUNT(*) FROM ai_usage_reservations WHERE day = ${day}::date AND status = 'completed'), 0)::integer AS successes,
        COALESCE((SELECT COUNT(*) FROM ai_usage_reservations WHERE day = ${day}::date AND status = 'released'), 0)::integer AS failures,
        COALESCE((SELECT SUM(fallback_count) FROM ai_usage_reservations WHERE day = ${day}::date), 0)::integer AS fallbacks,
        (SELECT attempts FROM ai_scope_daily WHERE day = ${day}::date AND scope_key = 'global') AS attempts
    `)
    const row = rows[0]
    if (!row) return unavailableUsage(day)
    return deriveAdminUsage({
      foodUsed: Number(row.food_used),
      coachUsed: Number(row.coach_used),
      successes: Number(row.successes),
      failures: Number(row.failures),
      fallbackAttempts: Number(row.fallbacks),
      attempts: row.attempts == null ? 0 : Number(row.attempts),
      budgetLimit: dailyGlobalMax(),
      day,
    })
  } catch {
    return unavailableUsage(day)
  }
}

export async function recordAdminAudit(
  actorId: string,
  action: AdminAuditEntry['action'],
  target: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await ensureAdminOpsSchema()
  const sql = getDb()
  await sql`
    INSERT INTO admin_audit (actor_id, action, target, before_state, after_state)
    VALUES (${actorId}::uuid, ${action}, ${target}, ${JSON.stringify(before)}::jsonb, ${JSON.stringify(after)}::jsonb)
  `
}

export async function listAdminAudit(limit = 40): Promise<AdminAuditEntry[]> {
  await ensureAdminOpsSchema()
  const sql = getDb()
  const rows = asRows<{
    id: string
    actor_email: string | null
    action: AdminAuditEntry['action']
    target: string
    before_state: unknown
    after_state: unknown
    created_at: string | Date
  }>(await sql`
    SELECT a.id, u.email AS actor_email, a.action, a.target, a.before_state, a.after_state, a.created_at
    FROM admin_audit a
    LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.created_at DESC
    LIMIT ${Math.min(100, Math.max(1, limit))}
  `)
  return rows.map(row => ({
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    target: row.target,
    before: (row.before_state && typeof row.before_state === 'object' ? row.before_state : {}) as Record<string, unknown>,
    after: (row.after_state && typeof row.after_state === 'object' ? row.after_state : {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function snapshotPlan(plan: AiPlanConfig['plan']): Promise<AiPlanConfig> {
  return loadPlanConfig(plan)
}
