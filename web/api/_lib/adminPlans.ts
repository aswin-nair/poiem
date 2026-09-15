import type { AiPlanConfig } from '../../shared/aiPlans.js'
import { asRows, getDb } from './db.js'
import { AiInputError } from './aiProvider.js'
import { isCanonicalUuid } from './identifiers.js'

export async function savePlanConfig(config: AiPlanConfig, admin: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE ai_plan_config SET provider = ${config.provider}, model = ${config.model},
    fallback_models = ${config.fallback_models}::text[], daily_food = ${config.daily_food}, daily_coach = ${config.daily_coach},
    updated_at = NOW(), updated_by = ${admin}::uuid WHERE plan = ${config.plan}`
}
export async function lookupPlanUser(query: string) {
  const sql = getDb()
  const users = asRows<Record<string, unknown>>(await sql`
    SELECT id, email, name, plan, subscription_status, subscription_expires_at, payment_provider FROM users
    WHERE lower(email) = ${query.trim().toLowerCase()} OR id::text = ${query.trim()} LIMIT 1
  `)
  return users[0] ?? null
}
/** Shared with a future verified payment webhook. Never accepts or updates is_admin. */
export async function setUserPlan(raw: unknown): Promise<void> {
  if (!raw || typeof raw !== 'object') throw new AiInputError('Invalid user update')
  const input = raw as Record<string, unknown>
  if (!isCanonicalUuid(input.userId) || !['free', 'premium'].includes(String(input.plan))
    || !['active', 'expired', 'cancelled', 'past_due'].includes(String(input.status))) throw new AiInputError('Invalid user, plan or status')
  const expires = input.expiresAt == null || input.expiresAt === '' ? null : new Date(String(input.expiresAt))
  if (expires && !Number.isFinite(expires.getTime())) throw new AiInputError('Invalid expiry')
  const provider = input.paymentProvider == null || input.paymentProvider === '' ? null : String(input.paymentProvider)
  if (provider && (!/^[a-zA-Z0-9_-]+$/.test(provider) || provider.length > 64)) throw new AiInputError('Invalid payment provider')
  const sql = getDb()
  const rows = asRows<{ id: string }>(await sql`UPDATE users SET plan = ${input.plan as string}, subscription_status = ${input.status as string},
    subscription_expires_at = ${expires?.toISOString() ?? null}::timestamptz, payment_provider = ${provider}
    WHERE id = ${input.userId as string}::uuid RETURNING id`)
  if (!rows.length) throw new AiInputError('User not found')
}
