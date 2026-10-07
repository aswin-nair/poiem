import { afterEach, describe, expect, it, vi } from 'vitest'
import { logContextFromNavState, mealTypeFromNavState } from './logContext'

afterEach(() => { vi.unstubAllGlobals() })

describe('meal logging navigation context', () => {
  it.each(['breakfast', 'lunch', 'dinner', 'snack', 'other'])('keeps the requested %s slot', mealType => {
    expect(mealTypeFromNavState({ mealType })).toBe(mealType)
    expect(logContextFromNavState({ mealType, firstMeal: true })).toEqual({ mealType, firstMeal: true })
  })

  it.each([null, undefined, 'snack', [], { mealType: 'dessert' }, { mealType: 1 }])('ignores invalid navigation input %#', state => {
    expect(mealTypeFromNavState(state)).toBeUndefined()
    expect(logContextFromNavState(state)).toEqual({ firstMeal: false })
  })

  it('keeps the active first-meal journey when changing logging methods', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => '1' })
    expect(logContextFromNavState({ mealType: 'snack' })).toEqual({ firstMeal: true, mealType: 'snack' })
  })
})
