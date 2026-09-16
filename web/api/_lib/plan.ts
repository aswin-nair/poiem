import { asRows, getDb } from './db.js'
import { InvalidSessionError } from './jwt.js'
import type { AiPlan, AiPlanConfig, AiStatus, UsageTask } from '../../shared/aiPlans.js'

export interface PlanUser {
  id: string
  plan: string
  subscription_status: string
  subscription_expires_at: string | Date | null
  payment_provider: string | null
  is_admin: boolean
}
export function effectivePlan(row: Pick<PlanUser, 'plan' | 'subscription_status' | 'subscription_expires_at'>, now = Date.now()): AiPlan {
  const expires = row.subscription_expires_at
  return row.plan === 'premium' && row.subscription_status === 'active'
    && (expires === null || new Date(expires).getTime() > now) ? 'premium' : 'free'
}
export function managedAiEnabled(): boolean {
  if (process.env.ENABLE_MANAGED_AI === 'false') return false
  return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && dailyGlobalMax() > 0
}
export function dailyGlobalMax(): number {
  const raw = process.env.MANAGED_AI_GLOBAL_DAILY_MAX
  if (raw === undefined || raw.trim() === '') return 2000
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}
export function dailyIpMax(): number {
  const value = Number(process.env.MANAGED_AI_IP_DAILY_MAX ?? 250)
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}
export function nextReset(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}
export async function loadPlanUser(id: string): Promise<PlanUser> {
  const sql = getDb()
  const rows = asRows<PlanUser>(await sql`SELECT id, plan, subscription_status, subscription_expires_at, payment_provider, is_admin FROM users WHERE id = ${id}::uuid`)
  if (!rows[0]) throw new InvalidSessionError()
  return rows[0]
}
export async function loadPlanConfig(plan: AiPlan): Promise<AiPlanConfig> {
  const sql = getDb()
  const rows = asRows<AiPlanConfig>(await sql`SELECT plan, provider, model, fallback_models, daily_food, daily_coach FROM ai_plan_config WHERE plan = ${plan}`)
  const config = rows[0]
  if (!config || config.provider !== 'openrouter' || !config.model || !Array.isArray(config.fallback_models)) throw new Error('AiConfigurationUnavailable')
  return config
}
export async function getAiStatus(id: string): Promise<AiStatus> {
  const user = await loadPlanUser(id)
  const plan = effectivePlan(user)
  const config = await loadPlanConfig(plan)
  const sql = getDb()
  const usage = asRows<{ task: UsageTask; used: number; reserved: number }>(await sql`
    SELECT u.task, u.used, (SELECT COUNT(*)::integer FROM ai_usage_reservations r
      WHERE r.user_id = u.user_id AND r.day = u.day AND r.task = u.task AND r.status = 'reserved' AND r.expires_at > NOW()) AS reserved
    FROM ai_usage_daily u WHERE u.user_id = ${id}::uuid AND u.day = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
  `)
  const quota = (task: UsageTask, limit: number) => {
    const row = usage.find(value => value.task === task)
    const used = Number(row?.used ?? 0), reserved = Number(row?.reserved ?? 0)
    return { used, reserved, limit, remaining: Math.max(0, limit - used - reserved) }
  }
  return {
    plan, subscriptionStatus: user.subscription_status,
    expiresAt: user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString() : null,
    isAdmin: user.is_admin === true, enabled: managedAiEnabled(), resetAt: nextReset(),
    food: quota('food', config.daily_food), coach: quota('coach', plan === 'premium' ? config.daily_coach : 0),
  }
}
