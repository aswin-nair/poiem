import { describe, expect, it } from 'vitest'
import { MOMO_POKES, todayGreeting } from './todayGreeting'

const base = { hour: 9, mealsToday: 0, over: false, isToday: true }

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

  it('celebrates showing up and never judges a big day', () => {
    expect(todayGreeting({ ...base, mealsToday: 2 }).line).toBe('You showed up. That’s the part worth celebrating.')
    const big = todayGreeting({ ...base, hour: 20, mealsToday: 4, over: true }).line
    expect(big).toMatch(/fresh plate/)
    expect(big).not.toMatch(/too much|bad|over|exceed/i)
  })

  it('keeps past days as a gentle look back', () => {
    expect(todayGreeting({ ...base, mealsToday: 3, isToday: false }).line).toBe('A page from your food story. No grades attached.')
  })

  it('has several playful lines for a poke', () => {
    expect(MOMO_POKES.length).toBeGreaterThanOrEqual(3)
    expect(new Set(MOMO_POKES.map(poke => poke.line)).size).toBe(MOMO_POKES.length)
  })
})
