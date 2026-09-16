import { describe, expect, it } from 'vitest'

import { defaultMealType, parseQuickAdd, quickAddEntry, recentMeals } from './meals'
import type { FoodEntry } from '../types'

function entry(over: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: crypto.randomUUID(),
    name: 'Meal',
    calories: 400,
    protein: 20,
    carbs: 40,
    fat: 10,
    timestamp: new Date().toISOString(),
    source: 'manual',
    mealType: 'lunch',
    ...over,
  }
}

describe('meal slot by time of day', () => {
  it('follows the §9.1 boundaries, with mid-afternoon filed as a snack', () => {
    expect(defaultMealType(7)).toBe('breakfast')
    expect(defaultMealType(10)).toBe('breakfast')
    expect(defaultMealType(11)).toBe('lunch')
    expect(defaultMealType(14)).toBe('lunch')
    expect(defaultMealType(15)).toBe('snack')
    expect(defaultMealType(16)).toBe('snack')
    expect(defaultMealType(17)).toBe('dinner')
    expect(defaultMealType(20)).toBe('dinner')
    expect(defaultMealType(21)).toBe('snack')
    expect(defaultMealType(23)).toBe('snack')
  })
})

describe('quick add parsing', () => {
  it('reads a bare calorie number', () => {
    expect(parseQuickAdd('400')).toBe(400)
    expect(parseQuickAdd('  350 ')).toBe(350)
  })

  it('ignores anything that is not a plain number', () => {
    expect(parseQuickAdd('')).toBeNull()
    expect(parseQuickAdd('chicken')).toBeNull()
    expect(parseQuickAdd('400 kcal')).toBeNull()
    expect(parseQuickAdd('-200')).toBeNull()
    expect(parseQuickAdd('12.5')).toBeNull()
  })

  it('refuses implausible values', () => {
    expect(parseQuickAdd('0')).toBeNull()
    expect(parseQuickAdd('99999')).toBeNull()
  })
})

describe('quick add entry', () => {
  it('carries calories only, with no macros claimed', () => {
    const e = quickAddEntry(350)

    expect(e.calories).toBe(350)
    expect(e.protein).toBe(0)
    expect(e.carbs).toBe(0)
    expect(e.fat).toBe(0)
    expect(e.source).toBe('quickAdd')
  })

  it('lands in the slot implied by the time of day', () => {
    expect(quickAddEntry(100).mealType).toBe(defaultMealType())
  })

  it('names itself without moralising', () => {
    const banned = /\b(bad|cheat|guilty|earned|naughty|sinful|damage)\b/i

    expect(quickAddEntry(100).name).not.toMatch(banned)
  })
})

describe('recents', () => {
  it('collapses repeats of the same food', () => {
    const meals = [
      entry({ name: 'Apple', calories: 95, timestamp: '2025-06-10T12:00:00.000Z' }),
      entry({ name: 'Apple', calories: 95, timestamp: '2025-06-09T12:00:00.000Z' }),
      entry({ name: 'Rice', calories: 200, timestamp: '2025-06-08T12:00:00.000Z' }),
    ]

    expect(recentMeals(meals).map(m => m.name)).toEqual(['Apple', 'Rice'])
  })

  it('puts the most recent first', () => {
    const meals = [
      entry({ name: 'Old', timestamp: '2025-06-01T12:00:00.000Z' }),
      entry({ name: 'New', timestamp: '2025-06-09T12:00:00.000Z' }),
    ]

    expect(recentMeals(meals)[0]!.name).toBe('New')
  })
})
