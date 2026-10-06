import type { FoodAnalysis } from '../types'
import type { ReviewNumericField } from './logDrafts'
import { isSafeFoodAnalysis } from './logDrafts'

export interface ManualFoodInput {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  servings: number
}

export type ValidatedManualFood = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type FoodField = 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'servings'
export type FoodFieldErrors = Partial<Record<FoodField, string>>

const NUTRITION_LIMITS = [
  ['calories', 'Calories', 100_000],
  ['protein', 'Protein', 10_000],
  ['carbs', 'Carbs', 10_000],
  ['fat', 'Fat', 10_000],
] as const

export function manualFoodFieldErrors(input: ManualFoodInput): FoodFieldErrors {
  const errors: FoodFieldErrors = {}
  if (!input.name.trim() || input.name.trim().length > 500) errors.name = 'Enter a food name of 500 characters or fewer.'
  if (!Number.isFinite(input.servings) || input.servings < 0.25 || input.servings > 1_000) {
    errors.servings = 'Servings must be between 0.25 and 1,000.'
  }
  for (const [field, label, max] of NUTRITION_LIMITS) {
    const parsed = parseNumber(input[field], label, field === 'calories', max)
    if (!parsed.ok) errors[field] = parsed.error
    else if (!errors.servings && (field === 'calories'
      ? Math.round(parsed.value * input.servings)
      : Math.round(parsed.value * input.servings * 10) / 10) > max) {
      errors[field] = `Total ${label.toLowerCase()} must be ${max.toLocaleString()}${field === 'calories' ? ' kcal' : ' g'} or fewer. Reduce the value or servings.`
    }
  }
  return errors
}

export function reviewFoodFieldErrors(
  analysis: FoodAnalysis,
  emptyNumericFields: ReadonlySet<ReviewNumericField>,
): FoodFieldErrors {
  const errors: FoodFieldErrors = {}
  if (!analysis.name.trim() || analysis.name.length > 500) errors.name = 'Enter a food name of 500 characters or fewer.'
  for (const [field, label, max] of NUTRITION_LIMITS) {
    if (emptyNumericFields.has(field)) errors[field] = `Enter a numeric value for ${label.toLowerCase()}.`
    else if (!Number.isFinite(analysis[field]) || analysis[field] < 0 || analysis[field] > max) {
      errors[field] = `${label} must be between 0 and ${max.toLocaleString()}.`
    }
  }
  if (!Object.keys(errors).length && !isSafeFoodAnalysis(analysis)) {
    errors.servings = 'This portion exceeds the estimate limits. Reduce the portion or enter the meal manually.'
  }
  return errors
}

function parseNumber(raw: string, label: string, required: boolean, max: number):
  | { ok: true; value: number }
  | { ok: false; error: string } {
  if (!raw.trim()) {
    return required ? { ok: false, error: `${label} is required.` } : { ok: true, value: 0 }
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > max) {
    return { ok: false, error: `${label} must be between 0 and ${max.toLocaleString()}.` }
  }
  return { ok: true, value }
}

export function validateManualFood(input: ManualFoodInput):
  | { ok: true; value: ValidatedManualFood }
  | { ok: false; error: string } {
  const name = input.name.trim()
  if (!name || name.length > 500) return { ok: false, error: 'Enter a food name of 500 characters or fewer.' }
  if (!Number.isFinite(input.servings) || input.servings < 0.25 || input.servings > 1_000) {
    return { ok: false, error: 'Servings must be between 0.25 and 1,000.' }
  }

  const calories = parseNumber(input.calories, 'Calories', true, 100_000)
  if (!calories.ok) return calories
  const protein = parseNumber(input.protein, 'Protein', false, 10_000)
  if (!protein.ok) return protein
  const carbs = parseNumber(input.carbs, 'Carbs', false, 10_000)
  if (!carbs.ok) return carbs
  const fat = parseNumber(input.fat, 'Fat', false, 10_000)
  if (!fat.ok) return fat

  const value = {
    name,
    calories: Math.round(calories.value * input.servings),
    protein: Math.round(protein.value * input.servings * 10) / 10,
    carbs: Math.round(carbs.value * input.servings * 10) / 10,
    fat: Math.round(fat.value * input.servings * 10) / 10,
  }
  if (value.calories > 100_000) return { ok: false, error: 'Total calories must be 100,000 or fewer.' }
  if (value.protein > 10_000 || value.carbs > 10_000 || value.fat > 10_000) {
    return { ok: false, error: 'Each total macronutrient must be 10,000 g or fewer.' }
  }
  return { ok: true, value }
}

export function reviewFoodIssue(
  analysis: FoodAnalysis,
  emptyNumericFields: ReadonlySet<ReviewNumericField>,
): string | null {
  if (!analysis.name.trim() || analysis.name.length > 500) {
    return 'Enter a food name of 500 characters or fewer.'
  }
  if (emptyNumericFields.size > 0) return 'Calories and all macronutrients need a numeric value.'
  if (!isSafeFoodAnalysis(analysis)) {
    return 'Use finite, non-negative values within the displayed nutrition limits.'
  }
  return null
}
