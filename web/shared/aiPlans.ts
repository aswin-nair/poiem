export type AiPlan = 'free' | 'premium'
export type ManagedTask = 'food_text' | 'food_photo' | 'coach'
export type UsageTask = 'food' | 'coach'
export interface AiQuota { used: number; reserved: number; limit: number; remaining: number }
export interface AiStatus {
  plan: AiPlan
  subscriptionStatus: string
  expiresAt: string | null
  isAdmin: boolean
  enabled: boolean
  resetAt: string
  food: AiQuota
  coach: AiQuota
}
export interface AiPlanConfig {
  plan: AiPlan
  provider: 'openrouter'
  model: string
  fallback_models: string[]
  daily_food: number
  daily_coach: number
}
export interface AiModel {
  id: string
  name: string
  image: boolean
  promptPrice: string
  completionPrice: string
}
export interface AdminUsageSnapshot {
  available: boolean
  sample?: boolean
  day: string
  foodUsed: number | null
  coachUsed: number | null
  successes: number | null
  failures: number | null
  fallbacks: number | null
  attempts: number | null
  budgetUsed: number | null
  budgetLimit: number | null
}
export interface AdminAuditEntry {
  id: string
  actorEmail: string | null
  action: 'plan.update' | 'account.update'
  target: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  createdAt: string
}
