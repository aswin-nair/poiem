import { describe, expect, it } from 'vitest'
import type { FoodEntry } from '../types'
import { insightDays, insightPeriod, insightSummary } from './insights'

const ref = new Date(2026, 8, 19, 20)
const meal = (over: Partial<FoodEntry> = {}): FoodEntry => ({
  id: 'meal', name: 'Oats', calories: 320, protein: 8, carbs: 60, fat: 5,
  timestamp: new Date(2026, 8, 19, 8).toISOString(), source: 'manual', mealType: 'breakfast', ...over,
})

describe('Insights journal days', () => {
  it('keeps an unlogged day unknown and a real zero entry logged in the average denominator', () => {
    const days = insightDays([
      meal({ localDate: '2026-09-19' }),
      meal({ id: 'zero', calories: 0, protein: 0, carbs: 0, fat: 0, localDate: '2026-09-18' }),
    ], 7, ref)
    expect(days).toHaveLength(7)
    expect(days[0].dayKey).toBe('2026-09-13')
    expect(days[4]).toMatchObject({ dayKey: '2026-09-17', value: 0, logged: false, mealCount: 0 })
    expect(days[5]).toMatchObject({ dayKey: '2026-09-18', value: 0, logged: true, mealCount: 1 })
    expect(insightSummary(days)).toEqual({ loggedDays: 2, meals: 2, averageCalories: 160 })
  })

  it('uses saved localDate boundaries like the journal and preserves the actual totals', () => {
    const days = insightDays([
      meal({ id: 'travel', localDate: '2026-09-18', calories: 320.5, protein: 8.5 }),
      meal({ id: 'dinner', localDate: '2026-09-18', calories: 180.25, protein: 6.25 }),
      meal({ id: 'today', calories: 200 }),
      meal({ id: 'older', localDate: '2026-09-12', calories: 999 }),
      meal({ id: 'future', localDate: '2026-09-20', calories: 999 }),
    ], 7, ref)
    expect(days[5]).toMatchObject({ mealCount: 2, value: 500.75, protein: 14.75, carbs: 120, fat: 10 })
    expect(days[6]).toMatchObject({ mealCount: 1, value: 200 })
    expect(insightSummary(days)).toEqual({ loggedDays: 2, meals: 3, averageCalories: 350 })
  })

  it('retains every month calendar day and gives an empty range no observed average', () => {
    const days = insightDays([], 30, new Date(2026, 0, 3, 11))
    expect(days).toHaveLength(30)
    expect(days[0].dayKey).toBe('2025-12-05')
    expect(days.at(-1)?.dayKey).toBe('2026-01-03')
    expect(insightSummary(days)).toEqual({ loggedDays: 0, meals: 0, averageCalories: null })
    expect(insightPeriod(days)).toContain('2025')
    expect(insightPeriod(days)).toContain('2026')
  })
})
