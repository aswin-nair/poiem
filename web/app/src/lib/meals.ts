import { defaultMealSlot } from '@fud-ai/domain/meals'
import { stampLocalDate } from '@fud-ai/product/localDate'
import type { FoodEntry, MealType, SavedMeal } from '../types'
import { localDayKey } from './dates'

export function mealKey(entry: Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'carbs' | 'fat'>): string {
  return [entry.name.toLowerCase().trim(), entry.calories, entry.protein, entry.carbs, entry.fat].join('|')
}

export function entryToSaved(entry: FoodEntry): SavedMeal {
  return {
    id: crypto.randomUUID(),
    name: entry.name,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    emoji: entry.emoji,
    mealType: entry.mealType,
    servingSizeGrams: entry.servingSizeGrams,
    ingredients: entry.ingredients,
  }
}

export function savedToEntry(saved: SavedMeal, source: FoodEntry['source'] = 'manual'): FoodEntry {
  return {
    id: crypto.randomUUID(),
    name: saved.name,
    calories: saved.calories,
    protein: saved.protein,
    carbs: saved.carbs,
    fat: saved.fat,
    emoji: saved.emoji,
    mealType: saved.mealType,
    servingSizeGrams: saved.servingSizeGrams,
    ingredients: saved.ingredients,
    source,
    timestamp: new Date().toISOString(),
    localDate: stampLocalDate(new Date().toISOString()),
  }
}

/**
 * The meal slot implied by the time of day, per §9.1. Pre-selecting this is
 * one of the taps the twenty-second target cannot afford to spend.
 */
export function defaultMealType(hour = new Date().getHours()): MealType {
  return defaultMealSlot(hour)
}

/**
 * A raw calorie entry with no food attached, per §9.1. Some days people will
 * not log properly, and a quick add that keeps the streak alive beats a
 * skipped day.
 */
export function quickAddEntry(calories: number): FoodEntry {
  return {
    id: crypto.randomUUID(),
    name: 'Quick add',
    calories: Math.round(calories),
    protein: 0,
    carbs: 0,
    fat: 0,
    emoji: '⚡',
    source: 'quickAdd',
    mealType: defaultMealType(),
    timestamp: new Date().toISOString(),
    localDate: stampLocalDate(new Date().toISOString()),
  }
}

/** Parses a search box that is really just a calorie number. */
export function parseQuickAdd(query: string): number | null {
  const trimmed = query.trim()
  if (!/^\d{1,5}$/.test(trimmed)) return null

  const value = Number(trimmed)
  return value > 0 && value <= 10000 ? value : null
}

export function recentMeals(entries: FoodEntry[], limit = 20): FoodEntry[] {
  const seen = new Set<string>()
  const result: FoodEntry[] = []
  for (const e of [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
    const key = mealKey(e)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(e)
    if (result.length >= limit) break
  }
  return result
}

export function dailyCalorieSeries(entries: FoodEntry[], days: number): { label: string; calories: number }[] {
  const result: { label: string; calories: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDayKey(d)
    const dayEntries = entries.filter(e => localDayKey(e.timestamp) === key)
    const calories = dayEntries.reduce((s, e) => s + e.calories, 0)
    result.push({
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      calories,
    })
  }
  return result
}

/**
 * Scale a saved meal by a portion multiplier.
 *
 * Pure and separately tested because it writes real numbers into the log: a
 * silent rounding or a missed macro here shows up as a wrong calorie total,
 * not as a visual glitch.
 */
export function scaleMeal(meal: SavedMeal, multiplier: number): SavedMeal {
  if (multiplier === 1) return meal
  return {
    ...meal,
    calories: Math.round(meal.calories * multiplier),
    protein: Math.round(meal.protein * multiplier),
    carbs: Math.round(meal.carbs * multiplier),
    fat: Math.round(meal.fat * multiplier),
    ...(meal.servingSizeGrams != null ? { servingSizeGrams: Math.round(meal.servingSizeGrams * multiplier * 10) / 10 } : {}),
    ...(meal.ingredients ? { ingredients: meal.ingredients.map(line => ({
      ...line,
      grams: Math.round(line.grams * multiplier * 10) / 10,
      calories: Math.round(line.calories * multiplier),
      protein: Math.round(line.protein * multiplier * 10) / 10,
      carbs: Math.round(line.carbs * multiplier * 10) / 10,
      fat: Math.round(line.fat * multiplier * 10) / 10,
    })) } : {}),
  }
}
