import { describe, expect, it } from 'vitest'
import type { FoodEntry, XpEvent } from '../types'
import { shouldCelebrateLog } from './logFeedback'

const now = new Date(2026, 8, 12, 13, 0, 0)
const at = (hours: number, dayOffset = 0) => new Date(2026, 8, 12 + dayOffset, hours, 0, 0).toISOString()
const meal = (id: string, timestamp: string): FoodEntry => ({ id, name: id, calories: 100, protein: 0, carbs: 0, fat: 0, mealType: 'lunch', source: 'manual', timestamp })
const award = (key: string): XpEvent => ({ id: key, key, xp: 10, label: key, timestamp: now.toISOString() }) as XpEvent

describe('log feedback', () => {
  it('celebrates the first meal of the day', () => {
    const entries = [meal('yesterday', at(20, -1)), meal('new', at(12))]
    expect(shouldCelebrateLog({ entries, entryId: 'new', awards: [award('meal-new')], now })).toBe(true)
  })

  it('confirms later meals quietly', () => {
    const entries = [meal('breakfast', at(8)), meal('new', at(12))]
    expect(shouldCelebrateLog({ entries, entryId: 'new', awards: [award('meal-new')], now })).toBe(false)
  })

  it('always celebrates a streak milestone', () => {
    const entries = [meal('breakfast', at(8)), meal('new', at(12))]
    expect(shouldCelebrateLog({ entries, entryId: 'new', awards: [award('meal-new'), award('streak-7')], now })).toBe(true)
  })
})
