import type { AiPlanConfig } from '../../shared/aiPlans.js'
import { asRows, getDb } from './db.js'
import { AiInputError } from './aiProvider.js'
import { ensureAdminOpsSchema } from './adminOps.js'
import { isCanonicalUuid } from './identifiers.js'

export interface UserPlanUpdate {
  userId: string
  plan: string
  status: string
  expires: Date | null
  provider: string | null
}

export function parseUserPlanUpdate(raw: unknown): UserPlanUpdate {
  if (!raw || typeof raw !== 'object') throw new AiInputError('Invalid user update')
  const input = raw as Record<string, unknown>
  if (!isCanonicalUuid(input.userId) || !['free', 'premium'].includes(String(input.plan))
    || !['active', 'expired', 'cancelled', 'past_due'].includes(String(input.status))) throw new AiInputError('Invalid user, plan or status')
  const expires = input.expiresAt == null || input.expiresAt === '' ? null : new Date(String(input.expiresAt))
  if (expires && !Number.isFinite(expires.getTime())) throw new AiInputError('Invalid expiry')
  const provider = input.paymentProvider == null || input.paymentProvider === '' ? null : String(input.paymentProvider)
  if (provider && (!/^[a-zA-Z0-9_-]+$/.test(provider) || provider.length > 64)) throw new AiInputError('Invalid payment provider')
  return { userId: String(input.userId), plan: String(input.plan), status: String(input.status), expires, provider }
}

export async function lookupPlanUser(query: string) {
  const sql = getDb()
  const users = asRows<Record<string, unknown>>(await sql`
    SELECT id, email, name, plan, subscription_status, subscription_expires_at, payment_provider FROM users
    WHERE lower(email) = ${query.trim().toLowerCase()} OR id::text = ${query.trim()} LIMIT 1
  `)
  return users[0] ?? null
}

/** Capture previous state, write the plan, and audit in one statement. */
export async function commitPlanConfig(config: AiPlanConfig, admin: string): Promise<void> {
  await ensureAdminOpsSchema()
  const sql = getDb()
  const rows = asRows<{ id: string }>(await sql`
    WITH locked AS (
      SELECT plan, provider, model, fallback_models, daily_food, daily_coach
      FROM ai_plan_config WHERE plan = ${config.plan} FOR UPDATE
    ),
    updated AS (
      UPDATE ai_plan_config SET provider = ${config.provider}, model = ${config.model},
        fallback_models = ${config.fallback_models}::text[], daily_food = ${config.daily_food}, daily_coach = ${config.daily_coach},
        updated_at = NOW(), updated_by = ${admin}::uuid
      WHERE plan = ${config.plan} AND EXISTS (SELECT 1 FROM locked)
      RETURNING plan, provider, model, fallback_models, daily_food, daily_coach
    )
    INSERT INTO admin_audit (actor_id, action, target, before_state, after_state)
    SELECT ${admin}::uuid, 'plan.update', ${config.plan}, to_jsonb(locked), to_jsonb(updated)
    FROM locked CROSS JOIN updated
    RETURNING id
  `)
  if (!rows[0]) throw new AiInputError('Plan not found')
}

/** Capture previous entitlement, write access, and audit in one statement. */
export async function commitUserPlan(raw: unknown, admin: string): Promise<void> {
  const input = parseUserPlanUpdate(raw)
  await ensureAdminOpsSchema()
  const sql = getDb()
  const rows = asRows<{ id: string }>(await sql`
    WITH locked AS (
      SELECT id, email, name, plan, subscription_status, subscription_expires_at, payment_provider
      FROM users WHERE id = ${input.userId}::uuid FOR UPDATE
    ),
    updated AS (
      UPDATE users SET plan = ${input.plan}, subscription_status = ${input.status},
        subscription_expires_at = ${input.expires?.toISOString() ?? null}::timestamptz, payment_provider = ${input.provider}
      WHERE id = ${input.userId}::uuid AND EXISTS (SELECT 1 FROM locked)
      RETURNING id, email, name, plan, subscription_status, subscription_expires_at, payment_provider
    )
    INSERT INTO admin_audit (actor_id, action, target, before_state, after_state)
    SELECT ${admin}::uuid, 'account.update', ${input.userId}, to_jsonb(locked), to_jsonb(updated)
    FROM locked CROSS JOIN updated
    RETURNING id
  `)
  if (!rows[0]) throw new AiInputError('User not found')
}

/** Shared with a future verified payment webhook. Never accepts or updates is_admin. */
export async function setUserPlan(raw: unknown): Promise<void> {
  const input = parseUserPlanUpdate(raw)
  const sql = getDb()
  const rows = asRows<{ id: string }>(await sql`UPDATE users SET plan = ${input.plan}, subscription_status = ${input.status},
    subscription_expires_at = ${input.expires?.toISOString() ?? null}::timestamptz, payment_provider = ${input.provider}
    WHERE id = ${input.userId}::uuid RETURNING id`)
  if (!rows.length) throw new AiInputError('User not found')
}
