import type { FoodAnalysis } from '../types'

type NutritionField = 'calories' | 'protein' | 'carbs' | 'fat'

export function normalizeServings(value: number, fallback = 1): number {
  return Number.isFinite(value) ? Math.min(1000, Math.max(0.25, Math.round(value * 4) / 4)) : fallback
}

/** Scale from the original portion, never from an already-rounded result. */
export function scaleFoodAnalysis(base: FoodAnalysis, servings: number, current: FoodAnalysis = base): FoodAnalysis {
  return {
    ...current,
    calories: Math.round(base.calories * servings),
    protein: Math.round(base.protein * servings * 10) / 10,
    carbs: Math.round(base.carbs * servings * 10) / 10,
    fat: Math.round(base.fat * servings * 10) / 10,
    servingSizeGrams: Math.round(base.servingSizeGrams * servings),
    ingredients: base.ingredients?.map(ingredient => ({
      ...ingredient,
      grams: Math.round(ingredient.grams * servings),
      calories: Math.round(ingredient.calories * servings),
      protein: Math.round(ingredient.protein * servings * 10) / 10,
      carbs: Math.round(ingredient.carbs * servings * 10) / 10,
      fat: Math.round(ingredient.fat * servings * 10) / 10,
    })),
  }
}

/** Reset one correction, preserving the stable bases of the other fields. */
export function resetFoodAnalysisField(
  original: FoodAnalysis,
  base: FoodAnalysis,
  current: FoodAnalysis,
  servings: number,
  field: NutritionField,
): { base: FoodAnalysis; analysis: FoodAnalysis } {
  return {
    base: { ...base, [field]: original[field], ingredients: undefined },
    analysis: { ...current, [field]: scaleFoodAnalysis(original, servings)[field], ingredients: undefined },
  }
}
