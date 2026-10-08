import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState } from '../types'
import { defaultModelFor } from './aiConfig'
import {
  clearUserState,
  clearPrivateAIKey,
  exportData,
  freshState,
  importData,
  loadPrivateAIKey,
  loadState,
  savePrivateAIKey,
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

  it('keeps API keys out of the persisted application-state blob', async () => {
    await saveState('user-1', stateWithKey())

    expect(await loadPrivateAIKey('user-1', stateWithKey().aiSettings)).toBe('sk-private-test-value')
    expect(localStorage.getItem('fud-ai-web-state-user-1')).not.toContain('sk-private-test-value')
    expect(localStorage.getItem('fud-ai-private-ai-key-user-1')).not.toContain('sk-private-test-value')
  })

  it('keeps API keys out of exports', () => {
    expect(exportData(stateWithKey())).not.toContain('sk-private-test-value')
    const state = stateWithKey()
    state.aiSettings = { ...state.aiSettings, provider: 'custom', endpointUrl: 'https://my-api.example/v1/chat/completions', authType: 'api-key', authHeader: 'X-API-Key' }
    const safeExport = exportData(state)
    expect(safeExport).toContain('https://my-api.example/v1/chat/completions')
    expect(safeExport).not.toContain(state.aiSettings.apiKey)
    state.aiSettings.endpointUrl += '?key=sk-private-test-value'
    expect(exportData(state)).not.toContain('sk-private-test-value')
  })

  it('does not accept an API key from an imported backup', () => {
    const existing = stateWithKey().aiSettings
    const imported = importData(JSON.stringify(stateWithKey()), 'device-only-key', existing)
    expect(imported.aiSettings.apiKey).toBe('device-only-key')
    expect(importData(JSON.stringify(stateWithKey())).aiSettings.apiKey).toBe('')
    expect(importData(JSON.stringify(stateWithKey()), 'device-only-key').aiSettings.apiKey).toBe('')
    const changed = stateWithKey()
    changed.aiSettings = { ...changed.aiSettings, provider: 'custom', endpointUrl: 'https://other.example/v1/chat/completions' }
    expect(importData(JSON.stringify(changed), 'device-only-key', existing).aiSettings.apiKey).toBe('')
  })

  it('binds encrypted keys to the endpoint, API format and authentication identity', async () => {
    const settings = { ...stateWithKey().aiSettings, provider: 'custom' as const, endpointUrl: 'https://MY-API.example:443/v1/messages', apiFormat: 'anthropic' as const, authType: 'api-key' as const, authHeader: 'X-API-Key' }
    await savePrivateAIKey('user-1', settings.apiKey, settings)

    expect(localStorage.getItem('fud-ai-private-ai-key-user-1')).toMatch(/^v2:/)
    expect(await loadPrivateAIKey('user-1', { ...settings, endpointUrl: 'https://my-api.example/v1/messages', authHeader: 'x-api-key', model: 'another-model' })).toBe(settings.apiKey)
    for (const changed of [
      { ...settings, endpointUrl: 'https://other.example/v1/messages' },
      { ...settings, endpointUrl: 'https://my-api.example/v1/other' },
      { ...settings, apiFormat: 'openai' as const },
      { ...settings, authType: 'bearer' as const },
      { ...settings, authHeader: 'API-Key' },
      { ...settings, authType: 'none' as const },
    ]) expect(await loadPrivateAIKey('user-1', changed)).toBe('')

    const chosen = { ...settings, endpointUrl: 'https://other.example/v1/messages' }
    await savePrivateAIKey('user-1', settings.apiKey, chosen)
    expect(await loadPrivateAIKey('user-1', chosen)).toBe(settings.apiKey)
    expect(await loadPrivateAIKey('user-1', settings)).toBe('')
  })

  it('migrates legacy keys only on their original default service connection', async () => {
    for (const [provider, legacyFixture] of [['openrouter', 'sk-or-legacy-fixture'], ['gemini', 'AIzaLegacyFixtureValue']] as const) {
      const settings = { ...freshState().aiSettings, provider, apiKey: legacyFixture }
      localStorage.setItem('fud-ai-private-ai-key-user-1', legacyFixture)
      expect(await loadPrivateAIKey('user-1', { ...settings, provider: 'custom', endpointUrl: 'https://other.example/v1/chat/completions' })).toBe('')
      expect(await loadPrivateAIKey('user-1', { ...settings, endpointUrl: 'https://other.example/v1/chat/completions' })).toBe('')
      expect(await loadPrivateAIKey('user-1', { ...settings, provider: provider === 'gemini' ? 'openrouter' : 'gemini' })).toBe('')
      expect(await loadPrivateAIKey('user-1', settings)).toBe(legacyFixture)
      expect(localStorage.getItem('fud-ai-private-ai-key-user-1')).toMatch(/^v2:/)
    }
  })

  it('does not attach plaintext legacy credentials to an overridden cached endpoint', () => {
    const state = stateWithKey()
    state.aiSettings.endpointUrl = 'https://other.example/v1/chat/completions'
    localStorage.setItem('fud-ai-web-state-user-1', JSON.stringify(state))
    localStorage.setItem('fud-ai-private-ai-key-user-1', 'sk-or-legacy-fixture')
    expect(loadState('user-1').aiSettings.apiKey).toBe('')
  })

  it('upgrades an encrypted v1 key without moving it to a custom endpoint', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    localStorage.setItem('fud-ai-private-ai-crypto-key-v1', JSON.stringify(await crypto.subtle.exportKey('jwk', key)))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const legacyKey = 'legacy-encrypted-fixture'
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(legacyKey)))
    const packed = new Uint8Array(iv.length + cipher.length)
    packed.set(iv)
    packed.set(cipher, iv.length)
    localStorage.setItem('fud-ai-private-ai-key-user-1', `v1:${btoa(Array.from(packed, byte => String.fromCharCode(byte)).join(''))}`)
    vi.resetModules()
    const reloadedStorage = await import('./storage')
    const settings = freshState().aiSettings

    expect(await reloadedStorage.loadPrivateAIKey('user-1', { ...settings, provider: 'custom', endpointUrl: 'https://other.example/v1/chat/completions' })).toBe('')
    expect(await reloadedStorage.loadPrivateAIKey('user-1', settings)).toBe(legacyKey)
    expect(localStorage.getItem('fud-ai-private-ai-key-user-1')).toMatch(/^v2:/)
    expect(await reloadedStorage.loadPrivateAIKey('user-1', settings)).toBe(legacyKey)
  })

  it('keeps keyless connections keyless and prevents an in-flight save from restoring a cleared key', async () => {
    const state = stateWithKey()
    const pending = savePrivateAIKey('user-1', state.aiSettings.apiKey, state.aiSettings)
    clearPrivateAIKey('user-1')
    await pending
    expect(await loadPrivateAIKey('user-1', state.aiSettings)).toBe('')
    await savePrivateAIKey('user-1', state.aiSettings.apiKey, { ...state.aiSettings, authType: 'none' })
    expect(localStorage.getItem('fud-ai-private-ai-key-user-1')).toBeNull()
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
