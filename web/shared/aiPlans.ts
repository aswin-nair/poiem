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
