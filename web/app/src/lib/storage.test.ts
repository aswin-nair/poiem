import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState } from '../types'
import { defaultModelFor } from './aiConfig'
import {
  clearUserState,
  exportData,
  freshState,
  importData,
  loadPrivateAIKey,
  loadState,
  saveState,
} from './storage'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

function stateWithKey(): AppState {
  return {
    ...freshState(),
    aiSettings: {
      ...freshState().aiSettings,
      apiKey: 'sk-private-test-value',
    },
  }
}

describe('private BYOK storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps API keys out of the persisted application-state blob', () => {
    saveState('user-1', stateWithKey())

    expect(loadPrivateAIKey('user-1')).toBe('sk-private-test-value')
    expect(localStorage.getItem('fud-ai-web-state-user-1')).not.toContain('sk-private-test-value')
  })

  it('keeps API keys out of exports', () => {
    expect(exportData(stateWithKey())).not.toContain('sk-private-test-value')
  })

  it('does not accept an API key from an imported backup', () => {
    const imported = importData(JSON.stringify(stateWithKey()), 'device-only-key')
    expect(imported.aiSettings.apiKey).toBe('device-only-key')
  })

  it('refuses an imported goal weight below BMI 18.5', () => {
    const state = freshState()
    state.profile = { ...state.profile, heightCm: 180, goalWeightKg: 55 }

    expect(() => importData(JSON.stringify(state))).toThrow(/healthy weight/i)
  })

  it('does not hydrate malformed collection members from local storage', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
    const malformed = { ...freshState(), foodEntries: [null] }
    localStorage.setItem('fud-ai-web-state-user-1', JSON.stringify(malformed))

    expect(loadState('user-1')).toEqual(freshState())
    expect(localStorage.getItem('fud-ai-web-state-user-1-quarantine')).toBe(JSON.stringify(malformed))
  })

  it.each([
    'profile',
    'aiSettings',
    'gamification',
    'foodEntries',
    'weightEntries',
    'exerciseEntries',
    'favoriteMeals',
    'chatMessages',
  ])('quarantines an explicitly null %s container', (field) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
    const malformed = { ...freshState(), [field]: null }
    const raw = JSON.stringify(malformed)
    localStorage.setItem('fud-ai-web-state-user-1', raw)

    expect(loadState('user-1')).toEqual(freshState())
    expect(localStorage.getItem('fud-ai-web-state-user-1-quarantine')).toBe(raw)
  })

  it('keeps an unparsable local blob for recovery', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
    localStorage.setItem('fud-ai-web-state-user-1', '{not-json')

    expect(loadState('user-1')).toEqual(freshState())
    expect(localStorage.getItem('fud-ai-web-state-user-1-quarantine')).toBe('{not-json')
  })

  it('removes quarantined recovery data during explicit deletion', () => {
    localStorage.setItem('fud-ai-web-state-user-1', JSON.stringify(freshState()))
    localStorage.setItem('fud-ai-web-state-user-1-quarantine', '{old-private-data')
    localStorage.setItem('fud-ai-web-state', JSON.stringify(freshState()))
    localStorage.setItem('fud-seen-badges', JSON.stringify(['legacy-badge']))
    localStorage.setItem('fud-log-drafts-v1-user-1', JSON.stringify({ version: 1 }))
    localStorage.setItem('fud-log-drafts-recovery-v1-user-1', '{old-draft')

    clearUserState('user-1')

    expect(localStorage.getItem('fud-ai-web-state-user-1')).toBeNull()
    expect(localStorage.getItem('fud-ai-web-state-user-1-quarantine')).toBeNull()
    expect(localStorage.getItem('fud-ai-web-state')).toBeNull()
    expect(localStorage.getItem('fud-seen-badges')).toBeNull()
    expect(localStorage.getItem('fud-log-drafts-v1-user-1')).toBeNull()
    expect(localStorage.getItem('fud-log-drafts-recovery-v1-user-1')).toBeNull()
  })
})

describe('stored AI model', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  function savedWithModel(model: string): void {
    const saved: AppState = {
      ...freshState(),
      aiSettings: { ...freshState().aiSettings, model },
    }
    localStorage.setItem('fud-ai-web-state-user-1', JSON.stringify(saved))
  }

  it('repairs a retired model slug when reopening a saved account', () => {
    // Normalization otherwise lets stored values win, which would pin every install saved
    // before the catalogue change to a model OpenRouter answers 404 for.
    savedWithModel('google/gemini-2.0-flash-001')

    expect(loadState('user-1').aiSettings.model).toBe(defaultModelFor('openrouter'))
  })

  it('leaves a model the reader picked for themselves alone', () => {
    savedWithModel('openai/gpt-4o-mini')

    expect(loadState('user-1').aiSettings.model).toBe('openai/gpt-4o-mini')
  })
})
