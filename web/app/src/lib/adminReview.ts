import type { AiPlan, AiPlanConfig } from '../../../shared/aiPlans'

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'

export interface AccountAccessSnapshot {
  plan: AiPlan
  status: SubscriptionStatus
  expiresAt: string | null
}

export function describeChange(label: string, before: string, after: string): string | null {
  if (before === after) return null
  return `${label}: ${before} → ${after}`
}

export function describePlanDiff(before: AiPlanConfig, after: AiPlanConfig): string[] {
  return [
    describeChange('Primary model', before.model, after.model),
    describeChange('Food logs / day', String(before.daily_food), String(after.daily_food)),
    describeChange('Coach messages / day', String(before.daily_coach), String(after.daily_coach)),
    describeChange(
      'Fallback models',
      before.fallback_models.join(', ') || 'none',
      after.fallback_models.join(', ') || 'none',
    ),
  ].filter((line): line is string => Boolean(line))
}

export function describeAccountDiff(before: AccountAccessSnapshot, after: AccountAccessSnapshot): string[] {
  return [
    describeChange('Plan', before.plan, after.plan),
    describeChange('Status', before.status, after.status),
    describeChange('Premium expires', before.expiresAt ?? 'none', after.expiresAt ?? 'none'),
  ].filter((line): line is string => Boolean(line))
}

export function formatMetric(value: number | null | undefined, available: boolean): string {
  if (!available || value == null) return 'Unavailable'
  return String(value)
}
