import type { MealType } from '../types'
import { firstMealFromNavState } from './firstMeal'

const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack', 'other'])

export function mealTypeFromNavState(state: unknown): MealType | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined
  const mealType = (state as { mealType?: unknown }).mealType
  return typeof mealType === 'string' && MEAL_TYPES.has(mealType as MealType)
    ? mealType as MealType
    : undefined
}

export function logContextFromNavState(state: unknown): { firstMeal: boolean; mealType?: MealType } {
  const mealType = mealTypeFromNavState(state)
  return { firstMeal: firstMealFromNavState(state), ...(mealType ? { mealType } : {}) }
}
