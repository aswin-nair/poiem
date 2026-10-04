import { describe, expect, it } from 'vitest'
import { plannedNotifications } from './schedule'
import { freshState } from '@/state/defaults'
import type { FoodEntry } from '@/state/types'

describe('notification plan', () => {
  it('stays quiet while tracking is paused', () => {
    const state = freshState()
    state.profile.trackingPaused = true
    expect(plannedNotifications(state, new Date('2026-08-30T20:30:00'))).toEqual([])
  })

  it('plans only the routine nudge in the evening', () => {
    const state = freshState()
    expect(plannedNotifications(state, new Date('2026-08-30T20:30:00'))).toEqual(['routine'])
  })

  it('plans nothing once a meal is logged today', () => {
    const state = freshState()
    const entry: FoodEntry = {
      id: 'logged-today',
      name: 'Toast',
      calories: 200,
      protein: 6,
      carbs: 30,
      fat: 5,
      timestamp: '2026-08-30T08:15:00',
      localDate: '2026-08-30',
      source: 'manual',
      mealType: 'breakfast',
    }
    state.foodEntries.push(entry)
    expect(plannedNotifications(state, new Date('2026-08-30T20:30:00'))).toEqual([])
  })

  it('never mentions calories in the adapter source', async () => {
    const source = await import('node:fs').then(fs => (
      fs.readFileSync(new URL('./schedule.ts', import.meta.url), 'utf8')
    ))
    expect(source).not.toMatch(/\b(calorie|kcal|weight)\b/i)
  })
})
