import { describe, expect, it } from 'vitest'
import { MOMO_POKES, todayGreeting } from './todayGreeting'

const base = { hour: 9, mealsToday: 0, isToday: true }

const NUTRITION_WORDS = /(big food day|fresh plate|over|under|deficit|calorie|kcal|budget|goal|target|macro|protein)/i

describe('Momo’s greeting on Today', () => {
  it('says hello by first name and time of day', () => {
    expect(todayGreeting({ ...base, hour: 8, name: 'Sam Rivera' }).hello).toBe('Morning, Sam!')
    expect(todayGreeting({ ...base, hour: 14 }).hello).toBe('Afternoon!')
    expect(todayGreeting({ ...base, hour: 19, name: '  ' }).hello).toBe('Evening!')
    expect(todayGreeting({ ...base, hour: 23, name: 'Sam' }).hello).toBe('Hey there, Sam!')
    expect(todayGreeting({ ...base, hour: 3 }).hello).toBe('Hey there!')
  })

  it('invites the next meal on an empty day, by time of day', () => {
    expect(todayGreeting({ ...base, hour: 8 }).line).toMatch(/Breakfast/)
    expect(todayGreeting({ ...base, hour: 19 }).line).toMatch(/Dinner/)
  })

  it('celebrates showing up', () => {
    expect(todayGreeting({ ...base, mealsToday: 2 }).line).toBe('You showed up. That’s the part worth celebrating.')
  })

  it('gives the same response whatever the day’s numbers were', () => {
    const ctx = { hour: 20, name: 'Sam', mealsToday: 4, isToday: true }
    const plain = todayGreeting(ctx)
    // A caller that still passes the retired field must not change Momo.
    expect(todayGreeting({ ...ctx, over: true } as typeof ctx)).toEqual(plain)
    expect(todayGreeting({ ...ctx, over: false } as typeof ctx)).toEqual(plain)
  })

  it('never says anything about the numbers, in any state', () => {
    for (const hour of [3, 8, 14, 19, 23]) {
      for (const mealsToday of [0, 1, 4, 9]) {
        for (const isToday of [true, false]) {
          const { line } = todayGreeting({ hour, mealsToday, isToday })
          expect(line).not.toMatch(NUTRITION_WORDS)
        }
      }
    }
    for (const poke of MOMO_POKES) expect(poke.line).not.toMatch(NUTRITION_WORDS)
  })

  it('keeps past days as a gentle look back', () => {
    expect(todayGreeting({ ...base, mealsToday: 3, isToday: false }).line).toBe('A page from your food story. No grades attached.')
  })

  it('has several playful lines for a poke', () => {
    expect(MOMO_POKES.length).toBeGreaterThanOrEqual(3)
    expect(new Set(MOMO_POKES.map(poke => poke.line)).size).toBe(MOMO_POKES.length)
  })
})
