import { birthdayToIso, loadOnboardingDraft, saveOnboardingDraft } from './onboarding'
import type { UserProfile } from '../types'

const PREFIX = 'fud-onboarding-draft-'
const PROFILE_FIELDS = new Set([
  'name', 'gender', 'birthday', 'heightCm', 'weightKg', 'activityLevel', 'goal',
  'bodyFatPercentage', 'weeklyChangeKg', 'goalWeightKg', 'customCalories', 'customProtein', 'customFat', 'customCarbs',
  'soundEnabled', 'hapticsEnabled', 'mascotMuted', 'mascotReducedMotion', 'mascotRoasts', 'trackingPaused', 'loggingCommitment',
])
const BOOLEAN_FIELDS = new Set(['soundEnabled', 'hapticsEnabled', 'mascotMuted', 'mascotReducedMotion', 'mascotRoasts', 'trackingPaused'])
const ENUM_FIELDS: Record<string, Set<string>> = {
  gender: new Set(['male', 'female', 'other']),
  activityLevel: new Set(['sedentary', 'light', 'moderate', 'active', 'veryActive', 'extraActive']),
  goal: new Set(['lose', 'maintain', 'gain']),
  loggingCommitment: new Set(['light', 'regular', 'detailed']),
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validGuestDraft(value: unknown): boolean {
  if (!record(value) || ![1, 2].includes(value.version as number) || !Number.isInteger(value.step)
    || (value.step as number) < 0 || (value.step as number) > 7 || !Number.isInteger(value.welcomeIndex)
    || (value.welcomeIndex as number) < 0 || (value.welcomeIndex as number) > 3 || typeof value.blocked !== 'boolean'
    || typeof value.birthdayInput !== 'string' || value.birthdayInput.length > 10
    || !record(value.profile) || !record(value.firstMeal)) return false
  if (value.birthdayInput && !birthdayToIso(value.birthdayInput)) return false
  const rawProfile = value.profile
  if (!['gender', 'birthday', 'heightCm', 'weightKg', 'activityLevel', 'goal'].every(key => key in rawProfile)) return false
  for (const [key, field] of Object.entries(rawProfile)) {
    if (!PROFILE_FIELDS.has(key)) return false
    if (ENUM_FIELDS[key]) {
      if (typeof field !== 'string' || !ENUM_FIELDS[key].has(field)) return false
    } else if (BOOLEAN_FIELDS.has(key)) {
      if (typeof field !== 'boolean') return false
    } else if (key === 'name' || key === 'birthday') {
      if (typeof field !== 'string' || field.length > 200) return false
    } else if (typeof field !== 'number' || !Number.isFinite(field) || Math.abs(field) > 100_000) return false
  }
  const meal = value.firstMeal
  return ['breakfast', 'lunch', 'dinner', 'snack', 'other'].includes(meal.mealType as string)
    && ['name', 'calories', 'protein', 'carbs', 'fat'].every(key => typeof meal[key] === 'string'
      && (meal[key] as string).length <= (key === 'name' ? 500 : 40))
    && Object.keys(meal).every(key => ['name', 'calories', 'protein', 'carbs', 'fat', 'mealType'].includes(key))
}

/** Copies setup choices only. The account's completed journal and both source/target drafts remain authoritative. */
export function handoffGuestSetupDraft(sourceId: string, accountId: string, accountOnboarded: boolean, profile: UserProfile): boolean {
  if (!sourceId || !accountId || sourceId === accountId || accountOnboarded) return false
  try {
    // Any existing target draft wins, including one that needs its own recovery.
    if (localStorage.getItem(`${PREFIX}${accountId}`) !== null) return false
    const raw = localStorage.getItem(`${PREFIX}${sourceId}`)
    if (!raw || raw.length > 20_000 || !validGuestDraft(JSON.parse(raw))) return false
    const draft = loadOnboardingDraft(sourceId, profile)
    saveOnboardingDraft(accountId, draft)
    // Do not delete the source: a failed sign-in or interrupted setup can return to it.
    return localStorage.getItem(`${PREFIX}${accountId}`) !== null
  } catch {
    return false
  }
}
