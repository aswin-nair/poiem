import { describe, expect, it } from 'vitest'
import type { FoodEntry, SavedMeal } from '../types'
import { mealKey } from './meals'
import { filterMealLibrary, getMealLibraryUsage, sortMealLibrary } from './mealLibrary'

const saved = (id: string, name: string, calories = 320): SavedMeal => ({ id, name, calories, protein: 10, carbs: 21.4, fat: 7.6, mealType: 'breakfast' })
const logged = (meal: SavedMeal, id: string, timestamp: string): FoodEntry => ({ ...meal, id, timestamp, source: 'manual' })

describe('Saved journal usage and sorting', () => {
  const oats = saved('oats', 'Overnight oats')
  const bowl = saved('bowl', 'Rice bowl', 540)
  const apple = saved('apple', 'Apple', 100)
  const meals = [oats, bowl, apple]
  const entries = [
    logged(oats, 'oats-older', '2026-09-16T08:00:00Z'),
    logged({ ...oats, name: ' OVERNIGHT OATS ', mealType: 'snack' }, 'oats-again', '2026-09-18T15:00:00Z'),
    logged(bowl, 'bowl-recent', '2026-09-19T12:00:00Z'),
    logged({ ...apple, calories: 125 }, 'changed-apple', '2026-09-19T19:00:00Z'),
  ]

  it('counts actual matching journal meals across destinations and ignores a changed nutrition template', () => {
    const usage = getMealLibraryUsage(entries)
    expect(usage.get(mealKey(oats))).toEqual({ count: 2, lastUsed: Date.parse(entries[1].timestamp) })
    expect(usage.get(mealKey(bowl))?.count).toBe(1)
    expect(usage.has(mealKey(apple))).toBe(false)
    expect(sortMealLibrary(meals, 'recent', usage).map(meal => meal.id)).toEqual(['bowl', 'oats', 'apple'])
    expect(sortMealLibrary(meals, 'most-used', usage).map(meal => meal.id)).toEqual(['oats', 'bowl', 'apple'])
    expect(sortMealLibrary(meals, 'name', usage).map(meal => meal.id)).toEqual(['apple', 'oats', 'bowl'])
  })

  it('filters and sorts fresh arrays without changing Saved templates or journal data', () => {
    const originalMeals = structuredClone(meals)
    const originalEntries = structuredClone(entries)
    const usage = getMealLibraryUsage(entries)
    expect(sortMealLibrary(filterMealLibrary(meals, ' OATS ', 'breakfast'), 'most-used', usage)).toEqual([oats])
    expect(meals).toEqual(originalMeals)
    expect(entries).toEqual(originalEntries)
    expect(sortMealLibrary(meals, 'name', usage)[1]).toBe(oats)
  })

  it('uses recent usage then name to break frequency ties and leaves unlogged meals last', () => {
    const usage = getMealLibraryUsage([logged(oats, 'oats', '2026-09-17T08:00:00Z'), logged(bowl, 'bowl', '2026-09-18T08:00:00Z')])
    expect(sortMealLibrary(meals, 'most-used', usage).map(meal => meal.id)).toEqual(['bowl', 'oats', 'apple'])
    expect(sortMealLibrary(meals, 'recent', new Map()).map(meal => meal.id)).toEqual(['apple', 'oats', 'bowl'])
  })

  it('recomputes usage after a journal entry is edited or deleted without altering Saved', () => {
    const edited = entries.map(entry => entry.id === 'bowl-recent' ? { ...entry, calories: 600 } : entry)
    expect(getMealLibraryUsage(edited).has(mealKey(bowl))).toBe(false)
    const deleted = edited.filter(entry => !entry.id.startsWith('oats-'))
    expect(getMealLibraryUsage(deleted).has(mealKey(oats))).toBe(false)
    expect(bowl.calories).toBe(540)
    expect(oats.calories).toBe(320)
  })
})
