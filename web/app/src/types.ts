export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive' | 'extraActive'
export type WeightGoal = 'lose' | 'maintain' | 'gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
export type FoodSource = 'textInput' | 'manual' | 'snapFood' | 'quickAdd' | 'recent'
export type LoggingCommitment = 'light' | 'regular' | 'detailed'

import type { AISettings } from './lib/aiConfig'

export type { AIProvider, AISettings } from './lib/aiConfig'

export interface UserProfile {
  name?: string
  gender: Gender
  birthday: string
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal: WeightGoal
  bodyFatPercentage?: number
  weeklyChangeKg?: number
  goalWeightKg?: number
  customCalories?: number
  customProtein?: number
  customFat?: number
  customCarbs?: number
  soundEnabled?: boolean
  hapticsEnabled?: boolean
  /** Silence Momo's speech bubbles while keeping the companion available. */
  mascotMuted?: boolean
  /** Disable Momo's roaming and decorative gestures independently of OS settings. */
  mascotReducedMotion?: boolean
  /** Explicit opt-in to reviewed jokes about app interactions, never health data. */
  mascotRoasts?: boolean
  trackingPaused?: boolean
  loggingCommitment?: LoggingCommitment
}

export interface FoodIngredientLine {
  item: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  timestamp: string
  emoji?: string
  source: FoodSource
  mealType: MealType
  servingSizeGrams?: number
  ingredients?: FoodIngredientLine[]
  /** True when the user reviewed or enriched the entry before saving. */
  detailAdded?: boolean
  /** Calendar day YYYY-MM-DD written at log time. */
  localDate?: string
}

export interface SavedMeal {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  emoji?: string
  mealType: MealType
  servingSizeGrams?: number
  ingredients?: FoodIngredientLine[]
}

export interface WeightEntry {
  id: string
  date: string
  weightKg: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface FoodAnalysis {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSizeGrams: number
  emoji?: string
  ingredients?: FoodIngredientLine[]
}

export interface XpEvent {
  id: string
  key: string     // dedup key — prevents double-awarding
  xp: number
  label: string
  timestamp: string
}

export interface GemEvent {
  id: string
  amount: number
  reason: string
  timestamp: string
  refId?: string
}

export type MascotActivity = 'lively' | 'calm' | 'off'

export type EnamelQuestKey =
  | 'breakfast'
  | 'photo_log'
  | 'three_mains'
  | 'water'
  | 'note'
  | 'new_food'
  | 'homemade'
  | 'log_within_30m'
  | 'week_log_days'
  | 'week_log_meals'
  | 'week_photos'

export interface EnamelQuestProgress {
  key: EnamelQuestKey
  period: 'daily' | 'weekly'
  label: string
  target: number
  progress: number
  xpReward: number
  gemReward: number
  completedAt: string | null
  claimedAt: string | null
}

export interface EnamelQuestState {
  date: string
  weekStart: string
  daily: EnamelQuestProgress[]
  weekly: EnamelQuestProgress
}

/** Momo's outfit: one wardrobe piece id per slot (see @fud-ai/product/wardrobe). */
export type MomoOutfit = Partial<Record<'head' | 'face' | 'neck' | 'body' | 'hand', string>>

export interface GamificationState {
  xp: number
  level: number
  streakFreezes: number        // available freezes (resets to 1 each month)
  freezeUsedDates: string[]    // YYYY-MM-DD days covered by a freeze
  freezeEarnedMonth: string    // YYYY-MM of last freeze grant
  pauseStartedDate: string | null // local YYYY-MM-DD where the active pause began
  pauseProtectedDates: string[] // paused local days that bridge, but never add to, a streak
  xpEvents: XpEvent[]          // last 50 XP events (for feed display)
  awardedKeys: string[]        // untruncated idempotency ledger; never use the feed as dedup state
  pendingLevelUp: number | null // new level pending celebration
  seenBadgeIds: string[]       // badge IDs already toasted
  quest?: {
    date: string
    type: 'log_n_meals' | 'log_before' | 'log_streak'
    target: number
    progress: number
    completedAt: string | null
    beforeHour?: number
  }
  gems: number
  gemEvents: GemEvent[]
  waterByDate: Record<string, number>
  notesByDate: Record<string, number>
  ownedCosmeticIds: string[]   // wardrobe pieces already revealed or worn; never taken back
  equippedCosmeticId: string | null // legacy single worn piece, read once to seed `outfit`
  outfit: MomoOutfit
  repairsUsedMonth: string
  mascotActivity: MascotActivity
  enamelQuests?: EnamelQuestState
  brokenOn: string | null
  brokenFrom: number
  startedAt: string
}

export interface ExerciseEntry {
  id: string
  name: string
  emoji: string
  caloriesBurned: number
  durationMinutes: number
  timestamp: string
}

export interface AppState {
  onboarded: boolean
  profile: UserProfile
  foodEntries: FoodEntry[]
  weightEntries: WeightEntry[]
  exerciseEntries: ExerciseEntry[]
  favoriteMeals: SavedMeal[]
  chatMessages: ChatMessage[]
  aiSettings: AISettings
  gamification: GamificationState
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  other: 'Other',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  veryActive: 'Very Active',
  extraActive: 'Extra Active',
}

export const GOAL_LABELS: Record<WeightGoal, string> = {
  lose: 'Lose Weight',
  maintain: 'Maintain',
  gain: 'Gain Weight',
}
