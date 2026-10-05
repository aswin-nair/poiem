import { describe, expect, it } from 'vitest'
import type { FoodEntry } from '../types'
import { dayRingEntries } from './dayRingEntries'

const sources = ['textInput', 'manual', 'snapFood', 'quickAdd', 'recent'] as const satisfies readonly FoodEntry['source'][]
function entry(source: FoodEntry['source'], detailAdded?: boolean): FoodEntry {
  return {
    id: source, name: 'Lunch', calories: 400, protein: 20, carbs: 50, fat: 10,
    timestamp: '2026-10-05T12:00:00.000Z', mealType: 'lunch', source, detailAdded,
  }
}

describe('day ring entries', () => {
  it.each(sources)('maps each food source to its ring source', source => {
    expect(dayRingEntries([entry(source)])).toEqual([{ mealType: 'lunch', source, detailAdded: undefined }])
  })

  it('carries detailAdded', () => {
    const entries = [entry('manual', true), entry('recent', false)] as const
    expect(dayRingEntries(entries)).toEqual([
      { mealType: 'lunch', source: 'manual', detailAdded: true },
      { mealType: 'lunch', source: 'recent', detailAdded: false },
    ])
  })
})
