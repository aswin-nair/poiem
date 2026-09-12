import { describe, expect, it } from 'vitest'

import { validateAppState } from '../../../shared/appStateContract'
import { freshState } from './storage'

const NOW = new Date('2026-08-20T12:00:00.000Z')

function validState() {
  const state = freshState()
  return {
    ...state,
    profile: {
      ...state.profile,
      birthday: '1996-04-12',
    },
  }
}

describe('shared AppState runtime contract', () => {
  it('validates populated favourites without treating array indexes as field schemas', () => {
    const state = validState()
    state.favoriteMeals = ['Toast', 'Soup'].map((name, index) => ({
      id: `saved-${index}`, name, calories: 200, protein: 5, carbs: 30, fat: 7, mealType: 'lunch',
    }))
    expect(validateAppState(state, NOW)).toEqual({ ok: true })
    expect(validateAppState(state, NOW, { allowApiKey: false })).toEqual({ ok: true })
    const invalid = structuredClone(state) as unknown as Record<string, unknown>
    ;(invalid.favoriteMeals as Record<string, unknown>[])[1].unexpected = true
    expect(validateAppState(invalid, NOW)).toEqual({ ok: false, error: 'favoriteMeals is invalid' })
  })

  it('accepts a fresh state with every required nested collection', () => {
    expect(validateAppState(validState(), NOW)).toEqual({ ok: true })
  })

  it('accepts commitment and entry-detail metadata but rejects unknown commitment values', () => {
    const state = validState()
    state.profile.loggingCommitment = 'detailed'
    state.foodEntries = [{
      id: 'meal-1', name: 'Oats', calories: 300, protein: 12, carbs: 40, fat: 6,
      timestamp: '2026-08-20T08:00:00.000Z', source: 'manual', mealType: 'breakfast',
      detailAdded: true, localDate: '2026-08-20',
    }]
    expect(validateAppState(state, NOW)).toEqual({ ok: true })

    const badDay: Record<string, unknown> = structuredClone(state)
    ;(badDay.foodEntries as Array<Record<string, unknown>>)[0]!.localDate = '2026-02-30'
    expect(validateAppState(badDay, NOW).ok).toBe(false)

    const invalid: Record<string, unknown> = structuredClone(state)
    ;(invalid.profile as Record<string, unknown>).loggingCommitment = 'maximum'
    expect(validateAppState(invalid, NOW)).toEqual({
      ok: false,
      error: 'profile.loggingCommitment is invalid',
    })
  })

  it('accepts Momo preference flags and rejects malformed values', () => {
    const state = validState()
    state.profile.mascotMuted = true
    state.profile.mascotReducedMotion = true
    state.profile.mascotRoasts = true
    expect(validateAppState(state, NOW)).toEqual({ ok: true })

    const invalid: Record<string, unknown> = structuredClone(state)
    ;(invalid.profile as Record<string, unknown>).mascotMuted = 'yes'
    expect(validateAppState(invalid, NOW)).toEqual({
      ok: false,
      error: 'profile preference flag is invalid',
    })
  })

  it('keeps roast mode opt-in and validates its persisted flag', () => {
    const state = validState()
    expect(state.profile.mascotRoasts).toBe(false)
    delete state.profile.mascotRoasts
    expect(validateAppState(state, NOW)).toEqual({ ok: true })
    const invalid: Record<string, unknown> = structuredClone(state)
    ;(invalid.profile as Record<string, unknown>).mascotRoasts = 'yes'
    expect(validateAppState(invalid, NOW)).toEqual({ ok: false, error: 'profile preference flag is invalid' })
  })

  it('rejects an onboarded user who is not yet 18', () => {
    const state = validState()
    state.onboarded = true
    state.profile.birthday = '2008-08-21'

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'onboarded profile must be adult',
    })
  })

  it('accepts an onboarded user on their exact 18th birthday', () => {
    const state = validState()
    state.onboarded = true
    state.profile.birthday = '2008-08-20'

    expect(validateAppState(state, NOW)).toEqual({ ok: true })
  })

  it('does not accept trailing junk after an otherwise valid birthday', () => {
    const state = validState()
    state.profile.birthday = '2008-08-20-not-a-date'

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'profile.birthday is invalid',
    })
  })

  it('rejects a malformed nested profile value', () => {
    const state: Record<string, unknown> = structuredClone(validState())
    ;(state.profile as Record<string, unknown>).heightCm = '175'

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'profile.heightCm is invalid',
    })
  })

  it('rejects unknown nested fields instead of persisting arbitrary data', () => {
    const state: Record<string, unknown> = structuredClone(validState())
    ;(state.aiSettings as Record<string, unknown>).forwardedAuthorization = 'not-allowed'

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'aiSettings contains unknown fields',
    })
  })

  it('rejects null inside foodEntries instead of trusting the array shape', () => {
    const state: Record<string, unknown> = structuredClone(validState())
    state.foodEntries = [null]

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'foodEntries is invalid',
    })
  })

  it('applies the cloud boundary policy and rejects a non-empty BYOK key', () => {
    const state = validState()
    state.aiSettings.apiKey = 'sk-device-only-secret'

    expect(validateAppState(state, NOW, { allowApiKey: false })).toEqual({
      ok: false,
      error: 'private API keys cannot be synced',
    })
  })

  it('accepts the secret-free representation sent by current clients', () => {
    const state = validState()
    state.aiSettings.apiKey = ''

    expect(validateAppState(state, NOW, { allowApiKey: false })).toEqual({ ok: true })

    const storedState: Record<string, unknown> = structuredClone(state)
    delete (storedState.aiSettings as Record<string, unknown>).apiKey
    expect(validateAppState(storedState, NOW, { allowApiKey: false })).toEqual({ ok: true })
  })

  it('requires exact, real calendar days for pause protection', () => {
    const state = validState()
    state.gamification.pauseStartedDate = '2026-02-30'

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'gamification.pauseStartedDate is invalid',
    })

    state.gamification.pauseStartedDate = null
    state.gamification.pauseProtectedDates = ['2026-08-19T00:00:00.000Z']
    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'gamification.pauseProtectedDates is invalid',
    })
  })

  it('allows missing pause metadata only on the legacy import path', () => {
    const state: Record<string, unknown> = structuredClone(validState())
    const gamification = state.gamification as Record<string, unknown>
    delete gamification.pauseStartedDate
    delete gamification.pauseProtectedDates

    expect(validateAppState(state, NOW)).toEqual({
      ok: false,
      error: 'gamification.pauseStartedDate is invalid',
    })
    expect(validateAppState(state, NOW, { allowLegacyGamification: true })).toEqual({ ok: true })
  })

  it("accepts Momo's per-slot outfit and rejects a malformed one", () => {
    const state = validState()
    const gamification = state.gamification as unknown as Record<string, unknown>
    gamification.outfit = { head: 'beanie', neck: 'scarf' }
    expect(validateAppState(state, NOW)).toEqual({ ok: true })
    gamification.outfit = { head: 42 }
    expect(validateAppState(state, NOW)).toEqual({ ok: false, error: 'gamification.outfit is invalid' })
  })
})
