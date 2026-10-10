import { describe, expect, it } from 'vitest'
import { freshState, importData } from './storage'
import { backupAIChoice, backupCredentialNotice, backupDateRange, backupPreferenceLabel, backupSummary } from './backupPreview'

describe('validated backup presentation', () => {
  it('counts records and distinct stored journal days without relying on order', () => {
    const state = freshState()
    const meal = { id: 'meal', name: 'Rice', calories: 200, protein: 4, fat: 1, carbs: 44, source: 'manual' as const, mealType: 'lunch' as const }
    state.foodEntries = [
      { ...meal, id: 'latest', timestamp: '2026-09-20T23:30:00.000Z', localDate: '2026-09-21' },
      { ...meal, id: 'first', timestamp: '2026-09-01T12:00:00.000Z', localDate: '2026-09-01' },
      { ...meal, id: 'same', timestamp: '2026-09-21T12:00:00.000Z', localDate: '2026-09-21' },
    ]
    state.favoriteMeals = [{ ...meal, id: 'saved' }]
    state.chatMessages = [{ id: 'chat', role: 'assistant', content: 'Synthetic reply', timestamp: meal.id }]
    expect(backupSummary(state)).toEqual({ meals: 3, savedMeals: 1, weights: 0, activities: 0, messages: 1, loggedDays: 2, firstDay: '2026-09-01', lastDay: '2026-09-21' })
    expect(backupDateRange(backupSummary(state))).toBe('1 Sept 2026 – 21 Sept 2026')
  })

  it('does not invent a date range for an empty journal', () => {
    expect(backupDateRange(backupSummary(freshState()))).toBe('No logged meals')
  })

  it('presents a single day once', () => {
    expect(backupDateRange({ ...backupSummary(freshState()), firstDay: '2026-09-01', lastDay: '2026-09-01' })).toBe('1 Sept 2026')
  })

  it('hides managed provider and model and every credential from choice labels', () => {
    const state = freshState()
    state.aiSettings.apiKey = 'synthetic-private-key'
    expect(backupAIChoice(state)).toBe('Poiem AI')
    state.aiSettings = { ...state.aiSettings, accessMode: 'byok', provider: 'custom', apiFormat: 'anthropic', authType: 'none' }
    expect(backupAIChoice(state)).toBe('Your API · Anthropic-compatible · no authentication')
    expect(backupAIChoice(state)).not.toContain(state.aiSettings.apiKey)
  })

  it('only promises key retention when the validated import kept the current device key', () => {
    const current = freshState()
    current.aiSettings = { ...current.aiSettings, accessMode: 'byok', provider: 'custom', endpointUrl: 'https://example.test/v1/chat/completions', apiFormat: 'openai', authType: 'bearer', model: 'demo', apiKey: 'synthetic-device-key' }
    const same = importData(JSON.stringify(current), current.aiSettings.apiKey, current.aiSettings)
    expect(backupCredentialNotice(same, current)).toContain('will be kept')
    const changed = { ...current, aiSettings: { ...current.aiSettings, endpointUrl: 'https://other.example.test/v1/chat/completions', apiKey: 'synthetic-file-key' } }
    const different = importData(JSON.stringify(changed), current.aiSettings.apiKey, current.aiSettings)
    expect(different.aiSettings.apiKey).toBe('')
    expect(backupCredentialNotice(different, current)).toContain('Re-enter the key')
    expect(backupCredentialNotice(different, current)).not.toContain('synthetic-')
  })

  it('does not ask a no-authentication connection for a key', () => {
    const state = freshState()
    state.aiSettings = { ...state.aiSettings, accessMode: 'byok', provider: 'custom', authType: 'none' }
    expect(backupCredentialNotice(state, freshState())).toContain('uses no authentication')
    expect(backupCredentialNotice(state, freshState())).not.toContain('Re-enter')
  })

  it('describes absent legacy sound preferences using their applied defaults', () => {
    const state = freshState()
    delete state.profile.soundEnabled
    delete state.profile.hapticsEnabled
    expect(backupPreferenceLabel(state)).toBe('Tracking active · sound on · haptics on')
    state.profile.trackingPaused = true
    state.profile.soundEnabled = false
    expect(backupPreferenceLabel(state)).toBe('Tracking paused · sound off · haptics on')
  })
})
