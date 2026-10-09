import type { FoodEntry, SavedMeal } from '../types'
import { mealKey } from './meals'

export type MealLibrarySort = 'recent' | 'name' | 'most-used'
export interface MealLibraryUsage { count: number; lastUsed: number }

/** Apply the same search and meal-type choice to saved and recent meals. */
export function filterMealLibrary<T extends { name: string; mealType: string }>(
  meals: T[], query: string, mealType: string,
): T[] {
  const needle = query.trim().toLowerCase()
  return meals.filter(meal => (
    (!needle || meal.name.toLowerCase().includes(needle))
    && (mealType === 'all' || meal.mealType === mealType)
  ))
}

/** Usage belongs to the journal; Saved templates keep their original values. */
export function getMealLibraryUsage(entries: FoodEntry[]): Map<string, MealLibraryUsage> {
  const usage = new Map<string, MealLibraryUsage>()
  for (const entry of entries) {
    const key = mealKey(entry)
    const previous = usage.get(key)
    const timestamp = Date.parse(entry.timestamp)
    usage.set(key, {
      count: (previous?.count ?? 0) + 1,
      lastUsed: Math.max(previous?.lastUsed ?? 0, Number.isFinite(timestamp) ? timestamp : 0),
    })
  }
  return usage
}

/** Sort a fresh array, with deterministic ties and meals without logs last. */
export function sortMealLibrary<T extends SavedMeal | FoodEntry>(
  meals: T[], sort: MealLibrarySort, usage: ReadonlyMap<string, MealLibraryUsage>,
): T[] {
  return [...meals].sort((a, b) => {
    const aUsage = usage.get(mealKey(a))
    const bUsage = usage.get(mealKey(b))
    const byRecent = (bUsage?.lastUsed ?? 0) - (aUsage?.lastUsed ?? 0)
    const byName = a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base', numeric: true })
      || a.id.localeCompare(b.id)
    if (sort === 'name') return byName
    if (sort === 'most-used') return (bUsage?.count ?? 0) - (aUsage?.count ?? 0) || byRecent || byName
    return byRecent || byName
  })
}
