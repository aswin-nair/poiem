import { describe, expect, it } from 'vitest'
import { calorieAxis } from './chartScale'

describe('calorieAxis', () => {
  it('fits a 2,000 goal with days under it instead of a fixed 4,000 ceiling', () => {
    expect(calorieAxis(1700, 2000)).toEqual({ max: 3000, ticks: [0, 1500, 3000] })
  })

  it('stays tight for a smaller goal so the bars stay tall', () => {
    expect(calorieAxis(1100, 1200)).toEqual({ max: 2000, ticks: [0, 1000, 2000] })
    expect(calorieAxis(1380, 1500)).toEqual({ max: 2000, ticks: [0, 1000, 2000] })
  })

  it('grows with the data when a day goes over the goal', () => {
    expect(calorieAxis(3200, 2500)).toEqual({ max: 4000, ticks: [0, 2000, 4000] })
  })

  it('keeps the goal line on the chart even when no day reaches it', () => {
    expect(calorieAxis(300, 2000).max).toBeGreaterThan(2000)
  })

  it('does not collapse below a thousand with no data and no goal', () => {
    expect(calorieAxis(0, undefined)).toEqual({ max: 1000, ticks: [0, 500, 1000] })
  })

  it('always returns three increasing ticks that end at the maximum and are whole hundreds', () => {
    for (const [value, goal] of [[0, 1800], [950, undefined], [1999, 2000], [2000, 2000], [4800, 2200]] as const) {
      const { max, ticks } = calorieAxis(value, goal)
      expect(ticks).toHaveLength(3)
      expect(ticks[0]).toBe(0)
      expect(ticks[1]).toBeGreaterThan(0)
      expect(ticks[1]).toBeLessThan(max)
      expect(ticks[2]).toBe(max)
      for (const tick of ticks) expect(tick % 100).toBe(0)
    }
  })
})
