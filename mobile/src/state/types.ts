export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive' | 'extraActive'
export type WeightGoal = 'lose' | 'maintain' | 'gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
export type FoodSource = 'textInput' | 'manual' | 'snapFood' | 'quickAdd' | 'recent'
export type LoggingCommitment = 'light' | 'regular' | 'detailed'
export type MascotActivity = 'lively' | 'calm' | 'off'

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
  mascotMuted?: boolean
  mascotReducedMotion?: boolean
  trackingPaused?: boolean
  loggingCommitment?: LoggingCommitment
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
  detailAdded?: boolean
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

export interface XpEvent {
  id: string
  key: string
  xp: number
  label: string
  timestamp: string
}

export interface GamificationState {
  xp: number
  level: number
  streakFreezes: number
  freezeUsedDates: string[]
  freezeEarnedMonth: string
  pauseStartedDate: string | null
  pauseProtectedDates: string[]
  xpEvents: XpEvent[]
  awardedKeys: string[]
  pendingLevelUp: number | null
  seenBadgeIds: string[]
  gems: number
  gemEvents: unknown[]
  waterByDate: Record<string, number>
  notesByDate: Record<string, number>
  ownedCosmeticIds: string[]
  equippedCosmeticId: string | null
  outfit: Partial<Record<'head' | 'face' | 'neck' | 'body' | 'hand', string>>
  repairsUsedMonth: string
  mascotActivity: MascotActivity
  brokenOn: string | null
  brokenFrom: number
  startedAt: string
}

export interface AISettings {
  provider: 'openrouter' | 'gemini'
  apiKey: string
  model: string
  customInstructions?: string
}

export interface AppState {
  onboarded: boolean
  profile: UserProfile
  foodEntries: FoodEntry[]
  weightEntries: WeightEntry[]
  exerciseEntries: unknown[]
  favoriteMeals: SavedMeal[]
  chatMessages: ChatMessage[]
  aiSettings: AISettings
  gamification: GamificationState
}

export interface DurableMutation {
  mutationId: string
  userId: string
  baseVersion: number
  state: AppState
  createdAt: string
}

export interface DurableAccount {
  userId: string
  state: AppState
  serverVersion: number
  outbox: DurableMutation[]
  updatedAt: string
}
