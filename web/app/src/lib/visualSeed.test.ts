import { describe, expect, it } from 'vitest'
import { validateAppState } from '../../../shared/appStateContract'
import { VISUAL_NOW, visualSeedState } from './visualSeed'

describe('visual seed', () => {
  it('is a valid onboarded account with three meals and a weigh-in', () => {
    const state = visualSeedState()
    const result = validateAppState(state, new Date(VISUAL_NOW))
    expect(result).toEqual({ ok: true })
    expect(state.foodEntries).toHaveLength(3)
    expect(state.weightEntries).toHaveLength(1)
    expect(state.onboarded).toBe(true)
  })
})
