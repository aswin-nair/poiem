import { describe, expect, it } from 'vitest'

import type { FoodEntry, GamificationState } from '../types'
import { defaultGamification } from './storage'
import {
  ENAMEL_CAPS,
  ENAMEL_XP,
  applyEnamelLogAwards,
  applyNote,
  applyWaterChange,
  grantFreeFreezeAtStreak,
} from './enamelEconomy'

function meal(over: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: over.id ?? 'meal-1', name: over.name ?? 'Oats', calories: 300, protein: 12, carbs: 40, fat: 6,
    timestamp: over.timestamp ?? '2026-08-22T08:00:00', source: over.source ?? 'manual',
    mealType: over.mealType ?? 'breakfast',
  }
}

function g(over: Partial<GamificationState> = {}): GamificationState {
  return { ...defaultGamification(), ...over }
}

describe('logging XP caps', () => {
  it('pays photo 15 and manual 10, then first-of-day once', () => {
    const first = applyEnamelLogAwards(g(), meal({ id: 'a', source: 'manual' }), [])
    expect(first.xp).toBe(ENAMEL_XP.MANUAL + ENAMEL_XP.FIRST_OF_DAY)
    const photo = applyEnamelLogAwards(first, meal({ id: 'b', source: 'snapFood', mealType: 'lunch', timestamp: '2026-08-22T12:00:00' }), [meal({ id: 'a' })])
    expect(photo.xp - first.xp).toBe(ENAMEL_XP.PHOTO)
    expect(applyEnamelLogAwards(first, meal({ id: 'a' }), [])).toEqual(first)
  })

  it('caps water at 8 glasses and notes at 3', () => {
    let state = g()
    for (let i = 1; i <= 10; i++) state = applyWaterChange(state, '2026-08-22', i)
    expect(state.waterByDate['2026-08-22']).toBe(ENAMEL_CAPS.WATER)
    for (let i = 0; i < 5; i++) state = applyNote(state, '2026-08-22')
    expect(state.notesByDate['2026-08-22']).toBe(ENAMEL_CAPS.NOTES)
  })

  it('awards three mains once', () => {
    const breakfast = meal({ id: 'b', mealType: 'breakfast' })
    const lunch = meal({ id: 'l', mealType: 'lunch', timestamp: '2026-08-22T12:00:00' })
    const dinner = meal({ id: 'd', mealType: 'dinner', timestamp: '2026-08-22T19:00:00' })
    const afterTwo = applyEnamelLogAwards(applyEnamelLogAwards(g(), breakfast, []), lunch, [breakfast])
    const afterThree = applyEnamelLogAwards(afterTwo, dinner, [breakfast, lunch])
    expect(afterThree.xp - afterTwo.xp).toBe(ENAMEL_XP.MANUAL + ENAMEL_XP.THREE_MAINS)
  })
})

describe('streak rewards without currency', () => {
  it('grants one protective freeze at day seven', () => {
    const next = grantFreeFreezeAtStreak(g({ streakFreezes: 0 }), 7)
    expect(next.streakFreezes).toBe(1)
    expect(grantFreeFreezeAtStreak(next, 8)).toEqual(next)
  })
})
