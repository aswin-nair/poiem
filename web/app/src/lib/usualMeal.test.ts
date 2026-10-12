import { describe, expect, it } from 'vitest'
import type { FoodEntry, MealType } from '../types'
import { usualMeal } from './usualMeal'

const NOW = new Date('2026-10-13T08:00:00.000Z')

let counter = 0
function entry(name: string, mealType: MealType, daysAgo: number, overrides: Partial<FoodEntry> = {}): FoodEntry {
  counter += 1
  const day = new Date(NOW.getTime() - daysAgo * 86_400_000)
  return {
    id: `e${counter}`,
    name,
    calories: 300,
    protein: 10,
    carbs: 40,
    fat: 8,
    emoji: '🍽',
    source: 'manual',
    mealType,
    timestamp: day.toISOString(),
    localDate: day.toISOString().slice(0, 10),
    ...overrides,
  }
}

describe('usualMeal', () => {
  it('needs the same meal on at least two different days', () => {
    expect(usualMeal([entry('Oats', 'breakfast', 1)], 'breakfast', NOW)).toBeNull()
    expect(usualMeal([entry('Oats', 'breakfast', 1), entry('Oats', 'breakfast', 1)], 'breakfast', NOW)).toBeNull()
    expect(usualMeal([entry('Oats', 'breakfast', 1), entry('Oats', 'breakfast', 3)], 'breakfast', NOW)?.name).toBe('Oats')
  })

  it('picks the meal logged on the most days for that slot', () => {
    const entries = [
      entry('Toast', 'breakfast', 1), entry('Toast', 'breakfast', 2),
      entry('Oats', 'breakfast', 3), entry('Oats', 'breakfast', 4), entry('Oats', 'breakfast', 5),
      entry('Salad', 'lunch', 1), entry('Salad', 'lunch', 2), entry('Salad', 'lunch', 3), entry('Salad', 'lunch', 4),
    ]
    expect(usualMeal(entries, 'breakfast', NOW)?.name).toBe('Oats')
    expect(usualMeal(entries, 'lunch', NOW)?.name).toBe('Salad')
    expect(usualMeal(entries, 'dinner', NOW)).toBeNull()
  })

  it('breaks a tie with the most recent one', () => {
    const entries = [
      entry('Toast', 'breakfast', 2), entry('Toast', 'breakfast', 6),
      entry('Oats', 'breakfast', 3), entry('Oats', 'breakfast', 9),
    ]
    expect(usualMeal(entries, 'breakfast', NOW)?.name).toBe('Toast')
  })

  it('matches names without regard to case and returns the latest log, with its portion', () => {
    const entries = [
      entry('overnight oats', 'breakfast', 6, { calories: 280 }),
      entry('Overnight Oats', 'breakfast', 2, { calories: 340 }),
    ]
    const usual = usualMeal(entries, 'breakfast', NOW)
    expect(usual?.name).toBe('Overnight Oats')
    expect(usual?.calories).toBe(340)
  })

  it('looks back 30 days and no further', () => {
    const old = [entry('Oats', 'breakfast', 31), entry('Oats', 'breakfast', 40)]
    expect(usualMeal(old, 'breakfast', NOW)).toBeNull()
    const edge = [entry('Oats', 'breakfast', 29), entry('Oats', 'breakfast', 40)]
    expect(usualMeal(edge, 'breakfast', NOW)).toBeNull()
    const inside = [entry('Oats', 'breakfast', 29), entry('Oats', 'breakfast', 12)]
    expect(usualMeal(inside, 'breakfast', NOW)?.name).toBe('Oats')
  })

  it('has no usual for Other, and ignores meals logged in a different slot', () => {
    const entries = [entry('Bar', 'other', 1), entry('Bar', 'other', 2), entry('Oats', 'lunch', 1), entry('Oats', 'lunch', 2)]
    expect(usualMeal(entries, 'other', NOW)).toBeNull()
    expect(usualMeal(entries, 'breakfast', NOW)).toBeNull()
  })

  it('counts a day once however many times it was logged that day', () => {
    const entries = [entry('Oats', 'breakfast', 2), entry('Oats', 'breakfast', 2), entry('Oats', 'breakfast', 2)]
    expect(usualMeal(entries, 'breakfast', NOW)).toBeNull()
  })

  it('ignores meals with a timestamp in the future and nameless entries', () => {
    const entries = [entry('Oats', 'breakfast', -1), entry('Oats', 'breakfast', -2), entry('  ', 'breakfast', 1), entry('  ', 'breakfast', 2)]
    expect(usualMeal(entries, 'breakfast', NOW)).toBeNull()
  })
})
