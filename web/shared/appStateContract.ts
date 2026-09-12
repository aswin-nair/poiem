export type StateValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export interface StateValidationOptions {
  /** Import-only compatibility for older quest and pause-protection fields. */
  allowLegacyGamification?: boolean
  /** Device-local imports may contain a key that is discarded after validation. */
  allowApiKey?: boolean
}

type Row = Record<string, unknown>

const MAX_COLLECTION = 20_000
const TOP_LEVEL_FIELDS = new Set([
  'onboarded',
  'profile',
  'foodEntries',
  'weightEntries',
  'exerciseEntries',
  'favoriteMeals',
  'chatMessages',
  'aiSettings',
  'gamification',
])
const PROFILE_FIELDS = new Set([
  'name',
  'gender',
  'birthday',
  'heightCm',
  'weightKg',
  'activityLevel',
  'goal',
  'bodyFatPercentage',
  'weeklyChangeKg',
  'goalWeightKg',
  'customCalories',
  'customProtein',
  'customCarbs',
  'customFat',
  'soundEnabled',
  'hapticsEnabled',
  'mascotMuted',
  'mascotReducedMotion',
  'mascotRoasts',
  'trackingPaused',
  'loggingCommitment',
])
const INGREDIENT_FIELDS = new Set(['item', 'grams', 'calories', 'protein', 'carbs', 'fat'])
const MEAL_FIELDS = new Set([
  'id',
  'name',
  'calories',
  'protein',
  'carbs',
  'fat',
  'mealType',
  'emoji',
  'servingSizeGrams',
  'ingredients',
])
const FOOD_ENTRY_FIELDS = new Set([...MEAL_FIELDS, 'timestamp', 'source', 'detailAdded', 'localDate'])
const WEIGHT_ENTRY_FIELDS = new Set(['id', 'date', 'weightKg'])
const EXERCISE_ENTRY_FIELDS = new Set([
  'id',
  'name',
  'emoji',
  'caloriesBurned',
  'durationMinutes',
  'timestamp',
])
const CHAT_MESSAGE_FIELDS = new Set(['id', 'role', 'content', 'timestamp'])
const XP_EVENT_FIELDS = new Set(['id', 'key', 'xp', 'label', 'timestamp'])
const QUEST_FIELDS = new Set(['date', 'type', 'target', 'progress', 'completedAt', 'beforeHour'])
const GEM_EVENT_FIELDS = new Set(['id', 'amount', 'reason', 'timestamp', 'refId'])
const ENAMEL_QUEST_FIELDS = new Set([
  'key', 'period', 'label', 'target', 'progress', 'xpReward', 'gemReward', 'completedAt', 'claimedAt',
])
const ENAMEL_QUEST_STATE_FIELDS = new Set(['date', 'weekStart', 'daily', 'weekly'])
const GAMIFICATION_FIELDS = new Set([
  'xp',
  'level',
  'streakFreezes',
  'freezeUsedDates',
  'freezeEarnedMonth',
  'pauseStartedDate',
  'pauseProtectedDates',
  'xpEvents',
  'awardedKeys',
  'pendingLevelUp',
  'seenBadgeIds',
  'quest',
  'gems',
  'gemEvents',
  'waterByDate',
  'notesByDate',
  'ownedCosmeticIds',
  'equippedCosmeticId',
  'outfit',
  'repairsUsedMonth',
  'mascotActivity',
  'enamelQuests',
  'brokenOn',
  'brokenFrom',
  'startedAt',
])
const AI_SETTINGS_FIELDS = new Set([
  'provider',
  'apiKey',
  'model',
  'customInstructions',
  'mascotEnabled',
  'mascotPersonality',
])

function row(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyFields(value: Row, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every(key => allowed.has(key))
}

function text(value: unknown, max = 500, allowEmpty = true): value is string {
  return typeof value === 'string'
    && value.length <= max
    && (allowEmpty || value.trim().length > 0)
}

function numberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function integerIn(value: unknown, min: number, max: number): value is number {
  return numberIn(value, min, max) && Number.isInteger(value)
}

function optionalNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || numberIn(value, min, max)
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function oneOf(value: unknown, values: readonly string[]): value is string {
  return typeof value === 'string' && values.includes(value)
}

function timestamp(value: unknown): value is string {
  return text(value, 100, false) && Number.isFinite(Date.parse(value))
}

function calendarDay(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

function birthdayParts(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?=$|T)/.exec(value)
  if (!match) return null
  if (value.length > 10 && !timestamp(value)) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return null
  return { year, month, day }
}

function isAdultBirthday(value: unknown, now: Date): boolean {
  const birth = birthdayParts(value)
  if (!birth || Number.isNaN(now.getTime())) return false
  const adultOn = Date.UTC(birth.year + 18, birth.month - 1, birth.day)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return today >= adultOn
}

function validProfile(value: unknown, onboarded: boolean, now: Date): string | null {
  if (!row(value)) return 'profile must be an object'
  if (!hasOnlyFields(value, PROFILE_FIELDS)) return 'profile contains unknown fields'
  if (!oneOf(value.gender, ['male', 'female', 'other'])) return 'profile.gender is invalid'
  if (!birthdayParts(value.birthday)) return 'profile.birthday is invalid'
  if (onboarded && !isAdultBirthday(value.birthday, now)) return 'onboarded profile must be adult'
  if (!numberIn(value.heightCm, 1, 300)) return 'profile.heightCm is invalid'
  if (!numberIn(value.weightKg, 1, 1_000)) return 'profile.weightKg is invalid'
  if (!oneOf(value.activityLevel, ['sedentary', 'light', 'moderate', 'active', 'veryActive', 'extraActive'])) {
    return 'profile.activityLevel is invalid'
  }
  if (!oneOf(value.goal, ['lose', 'maintain', 'gain'])) return 'profile.goal is invalid'
  if (value.name !== undefined && !text(value.name, 200)) return 'profile.name is invalid'
  if (!optionalNumber(value.bodyFatPercentage, 0, 1)) return 'profile.bodyFatPercentage is invalid'
  if (!optionalNumber(value.weeklyChangeKg, 0, 100)) return 'profile.weeklyChangeKg is invalid'
  if (!optionalNumber(value.goalWeightKg, 1, 1_000)) return 'profile.goalWeightKg is invalid'
  if (!optionalNumber(value.customCalories, 0, 100_000)) return 'profile.customCalories is invalid'
  if (!optionalNumber(value.customProtein, 0, 10_000)) return 'profile.customProtein is invalid'
  if (!optionalNumber(value.customCarbs, 0, 10_000)) return 'profile.customCarbs is invalid'
  if (!optionalNumber(value.customFat, 0, 10_000)) return 'profile.customFat is invalid'
  if (
    !optionalBoolean(value.soundEnabled)
    || !optionalBoolean(value.hapticsEnabled)
    || !optionalBoolean(value.mascotMuted)
    || !optionalBoolean(value.mascotReducedMotion)
    || !optionalBoolean(value.mascotRoasts)
    || !optionalBoolean(value.trackingPaused)
  ) {
    return 'profile preference flag is invalid'
  }
  if (value.loggingCommitment !== undefined && !oneOf(value.loggingCommitment, ['light', 'regular', 'detailed'])) {
    return 'profile.loggingCommitment is invalid'
  }

  if (typeof value.goalWeightKg === 'number') {
    const metres = (value.heightCm as number) / 100
    if (value.goalWeightKg / (metres * metres) < 18.5) {
      return 'profile.goalWeightKg is below the minimum healthy weight (BMI 18.5)'
    }
  }
  return null
}

function validIngredient(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, INGREDIENT_FIELDS)
    && text(value.item, 500, false)
    && numberIn(value.grams, 0, 100_000)
    && numberIn(value.calories, 0, 100_000)
    && numberIn(value.protein, 0, 10_000)
    && numberIn(value.carbs, 0, 10_000)
    && numberIn(value.fat, 0, 10_000)
}

function validMealBase(value: unknown, allowedFields = MEAL_FIELDS): value is Row {
  if (!row(value)) return false
  if (!hasOnlyFields(value, allowedFields)) return false
  if (!text(value.id, 200, false) || !text(value.name, 500, false)) return false
  if (!numberIn(value.calories, 0, 100_000)) return false
  if (!numberIn(value.protein, 0, 10_000) || !numberIn(value.carbs, 0, 10_000) || !numberIn(value.fat, 0, 10_000)) return false
  if (!oneOf(value.mealType, ['breakfast', 'lunch', 'dinner', 'snack', 'other'])) return false
  if (value.emoji !== undefined && !text(value.emoji, 32)) return false
  if (!optionalNumber(value.servingSizeGrams, 0, 100_000)) return false
  return value.ingredients === undefined
    || (Array.isArray(value.ingredients)
      && value.ingredients.length <= 200
      && value.ingredients.every(validIngredient))
}

function validFoodEntry(value: unknown): boolean {
  return validMealBase(value, FOOD_ENTRY_FIELDS)
    && timestamp(value.timestamp)
    && oneOf(value.source, ['textInput', 'manual', 'snapFood', 'quickAdd', 'recent'])
    && optionalBoolean(value.detailAdded)
    && (value.localDate === undefined || calendarDay(value.localDate))
}

function validWeightEntry(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, WEIGHT_ENTRY_FIELDS)
    && text(value.id, 200, false)
    && timestamp(value.date)
    && numberIn(value.weightKg, 1, 1_000)
}

function validExerciseEntry(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, EXERCISE_ENTRY_FIELDS)
    && text(value.id, 200, false)
    && text(value.name, 500, false)
    && text(value.emoji, 32)
    && numberIn(value.caloriesBurned, 0, 100_000)
    && numberIn(value.durationMinutes, 0, 100_000)
    && timestamp(value.timestamp)
}

function validChatMessage(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, CHAT_MESSAGE_FIELDS)
    && text(value.id, 200, false)
    && oneOf(value.role, ['user', 'assistant'])
    && text(value.content, 20_000)
    && timestamp(value.timestamp)
}

function validXpEvent(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, XP_EVENT_FIELDS)
    && text(value.id, 200, false)
    && text(value.key, 500, false)
    && integerIn(value.xp, 0, 100_000)
    && text(value.label, 500, false)
    && timestamp(value.timestamp)
}

function validQuest(value: unknown, allowLegacyGamification: boolean): boolean {
  if (value === undefined) return true
  return row(value)
    && hasOnlyFields(value, QUEST_FIELDS)
    && text(value.date, 10, false)
    && oneOf(value.type, allowLegacyGamification
      ? ['log_n_meals', 'log_before', 'log_streak', 'hit_protein']
      : ['log_n_meals', 'log_before', 'log_streak'])
    && integerIn(value.target, 1, 100)
    && integerIn(value.progress, 0, 100)
    && (value.completedAt === null || timestamp(value.completedAt))
    && (value.beforeHour === undefined || integerIn(value.beforeHour, 0, 23))
}

function stringArray(value: unknown, max = MAX_COLLECTION): value is string[] {
  return Array.isArray(value)
    && value.length <= max
    && value.every(item => text(item, 500, false))
}

/** Momo's outfit: at most one wardrobe piece id per slot. */
function validOutfit(value: unknown): boolean {
  return row(value)
    && Object.keys(value).length <= 8
    && Object.entries(value).every(([slot, id]) => text(slot, 20, false) && text(id, 80, false))
}

function validGamification(value: unknown, allowLegacyGamification: boolean): string | null {
  if (!row(value)) return 'gamification must be an object'
  if (!hasOnlyFields(value, GAMIFICATION_FIELDS)) return 'gamification contains unknown fields'
  if (!integerIn(value.xp, 0, 1_000_000_000)) return 'gamification.xp is invalid'
  if (!integerIn(value.level, 1, 1_000_000)) return 'gamification.level is invalid'
  if (!integerIn(value.streakFreezes, 0, 100)) return 'gamification.streakFreezes is invalid'
  if (!stringArray(value.freezeUsedDates)) return 'gamification.freezeUsedDates is invalid'
  if (!text(value.freezeEarnedMonth, 20)) return 'gamification.freezeEarnedMonth is invalid'
  if (!Array.isArray(value.xpEvents) || value.xpEvents.length > 200 || !value.xpEvents.every(validXpEvent)) {
    return 'gamification.xpEvents is invalid'
  }
  if (value.awardedKeys !== undefined && !stringArray(value.awardedKeys, 200_000)) {
    return 'gamification.awardedKeys is invalid'
  }
  // Legacy gamification compatibility is used only by import/migration. State
  // written before pause protection existed can omit these fields there; all
  // newly-saved and cloud-synced state must include them.
  if (value.pauseStartedDate === undefined) {
    if (!allowLegacyGamification) return 'gamification.pauseStartedDate is invalid'
  } else if (value.pauseStartedDate !== null && !calendarDay(value.pauseStartedDate)) {
    return 'gamification.pauseStartedDate is invalid'
  }
  if (value.pauseProtectedDates === undefined) {
    if (!allowLegacyGamification) return 'gamification.pauseProtectedDates is invalid'
  } else if (
    !Array.isArray(value.pauseProtectedDates)
    || value.pauseProtectedDates.length > MAX_COLLECTION
    || !value.pauseProtectedDates.every(calendarDay)
  ) {
    return 'gamification.pauseProtectedDates is invalid'
  }
  if (value.pendingLevelUp !== null && !integerIn(value.pendingLevelUp, 1, 1_000_000)) {
    return 'gamification.pendingLevelUp is invalid'
  }
  if (!stringArray(value.seenBadgeIds)) return 'gamification.seenBadgeIds is invalid'
  if (!validQuest(value.quest, allowLegacyGamification)) return 'gamification.quest is invalid'
  if (value.gems !== undefined && !integerIn(value.gems, 0, 1_000_000_000)) return 'gamification.gems is invalid'
  if (value.gemEvents !== undefined && (!Array.isArray(value.gemEvents) || value.gemEvents.length > 200 || !value.gemEvents.every(validGemEvent))) {
    return 'gamification.gemEvents is invalid'
  }
  if (value.waterByDate !== undefined && !validCountByDate(value.waterByDate, 8)) return 'gamification.waterByDate is invalid'
  if (value.notesByDate !== undefined && !validCountByDate(value.notesByDate, 3)) return 'gamification.notesByDate is invalid'
  if (value.ownedCosmeticIds !== undefined && !stringArray(value.ownedCosmeticIds, 200)) return 'gamification.ownedCosmeticIds is invalid'
  if (value.equippedCosmeticId !== undefined && value.equippedCosmeticId !== null && !text(value.equippedCosmeticId, 80, false)) {
    return 'gamification.equippedCosmeticId is invalid'
  }
  if (value.outfit !== undefined && !validOutfit(value.outfit)) return 'gamification.outfit is invalid'
  if (value.repairsUsedMonth !== undefined && !text(value.repairsUsedMonth, 20)) return 'gamification.repairsUsedMonth is invalid'
  if (value.mascotActivity !== undefined && !oneOf(value.mascotActivity, ['lively', 'calm', 'off'])) {
    return 'gamification.mascotActivity is invalid'
  }
  if (value.enamelQuests !== undefined && !validEnamelQuestState(value.enamelQuests)) return 'gamification.enamelQuests is invalid'
  if (value.brokenOn !== undefined && value.brokenOn !== null && !calendarDay(value.brokenOn)) return 'gamification.brokenOn is invalid'
  if (value.brokenFrom !== undefined && !integerIn(value.brokenFrom, 0, 100_000)) return 'gamification.brokenFrom is invalid'
  if (value.startedAt !== undefined && !timestamp(value.startedAt)) return 'gamification.startedAt is invalid'
  return null
}

function validGemEvent(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, GEM_EVENT_FIELDS)
    && text(value.id, 200, false)
    && integerIn(value.amount, -1_000_000, 1_000_000)
    && text(value.reason, 200, false)
    && timestamp(value.timestamp)
    && (value.refId === undefined || text(value.refId, 200, false))
}

function validCountByDate(value: unknown, max: number): boolean {
  if (!row(value)) return false
  return Object.entries(value).every(([key, count]) => calendarDay(key) && integerIn(count, 0, max))
}

function validEnamelQuest(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, ENAMEL_QUEST_FIELDS)
    && text(value.key, 40, false)
    && oneOf(value.period, ['daily', 'weekly'])
    && text(value.label, 200, false)
    && integerIn(value.target, 1, 100)
    && integerIn(value.progress, 0, 100)
    && integerIn(value.xpReward, 0, 10_000)
    && integerIn(value.gemReward, 0, 10_000)
    && (value.completedAt === null || timestamp(value.completedAt))
    && (value.claimedAt === null || timestamp(value.claimedAt))
}

function validEnamelQuestState(value: unknown): boolean {
  return row(value)
    && hasOnlyFields(value, ENAMEL_QUEST_STATE_FIELDS)
    && calendarDay(value.date)
    && calendarDay(value.weekStart)
    && Array.isArray(value.daily)
    && value.daily.length <= 8
    && value.daily.every(validEnamelQuest)
    && validEnamelQuest(value.weekly)
}

function validAISettings(value: unknown, allowApiKey: boolean): string | null {
  if (!row(value)) return 'aiSettings must be an object'
  if (!hasOnlyFields(value, AI_SETTINGS_FIELDS)) return 'aiSettings contains unknown fields'
  if (!oneOf(value.provider, ['openrouter', 'gemini'])) return 'aiSettings.provider is invalid'
  if (value.apiKey !== undefined && !text(value.apiKey, 10_000)) return 'aiSettings.apiKey is invalid'
  if (!allowApiKey && typeof value.apiKey === 'string' && value.apiKey.length > 0) {
    return 'private API keys cannot be synced'
  }
  if (!text(value.model, 500, false)) return 'aiSettings.model is invalid'
  if (value.customInstructions !== undefined && !text(value.customInstructions, 20_000)) {
    return 'aiSettings.customInstructions is invalid'
  }
  if (value.mascotEnabled !== undefined && typeof value.mascotEnabled !== 'boolean') {
    return 'aiSettings.mascotEnabled is invalid'
  }
  if (value.mascotPersonality !== undefined && !oneOf(value.mascotPersonality, ['warm', 'witty', 'sassy'])) {
    return 'aiSettings.mascotPersonality is invalid'
  }
  return null
}

function collection(value: unknown, check: (item: unknown) => boolean): boolean {
  // Array.every also passes the index. Do not leak it into validators whose
  // second parameter is an optional schema (for example validMealBase).
  return Array.isArray(value) && value.length <= MAX_COLLECTION && value.every(item => check(item))
}

export function validateAppState(
  value: unknown,
  now = new Date(),
  options: StateValidationOptions = {},
): StateValidationResult {
  if (!row(value)) return { ok: false, error: 'state must be an object' }
  if (!hasOnlyFields(value, TOP_LEVEL_FIELDS)) {
    return { ok: false, error: 'state contains unknown top-level fields' }
  }
  if (typeof value.onboarded !== 'boolean') return { ok: false, error: 'onboarded must be boolean' }

  const profileError = validProfile(value.profile, value.onboarded, now)
  if (profileError) return { ok: false, error: profileError }
  if (!collection(value.foodEntries, validFoodEntry)) return { ok: false, error: 'foodEntries is invalid' }
  if (!collection(value.weightEntries, validWeightEntry)) return { ok: false, error: 'weightEntries is invalid' }
  if (!collection(value.exerciseEntries, validExerciseEntry)) return { ok: false, error: 'exerciseEntries is invalid' }
  if (!collection(value.favoriteMeals, validMealBase)) return { ok: false, error: 'favoriteMeals is invalid' }
  if (!collection(value.chatMessages, validChatMessage)) return { ok: false, error: 'chatMessages is invalid' }

  const aiError = validAISettings(value.aiSettings, options.allowApiKey !== false)
  if (aiError) return { ok: false, error: aiError }
  const gamificationError = validGamification(
    value.gamification,
    options.allowLegacyGamification === true,
  )
  if (gamificationError) return { ok: false, error: gamificationError }
  return { ok: true }
}
