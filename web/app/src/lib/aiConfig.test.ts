import { describe, expect, it } from 'vitest'

import { OPENROUTER_MODELS, apiFormatFor, authTypeFor, connectionIssue, defaultAISettings, defaultEndpointFor, defaultModelFor, normalizeAISettings, type AISettings } from './aiConfig'

describe('AI model settings', () => {
  it('moves a saved reader off a retired OpenRouter slug', () => {
    // Stored by every install that predates the model list refresh: left alone it 404s forever.
    const settings = normalizeAISettings({
      provider: 'openrouter',
      apiKey: 'sk-or-device-only',
      model: 'google/gemini-2.0-flash-001',
    })

    expect(settings.model).toBe(defaultModelFor('openrouter'))
  })

  it('keeps a model the reader chose themselves', () => {
    const settings = normalizeAISettings({
      provider: 'openrouter',
      apiKey: 'sk-or-device-only',
      model: 'anthropic/claude-sonnet-4',
    })

    expect(settings.model).toBe('anthropic/claude-sonnet-4')
    const custom = normalizeAISettings({ provider: 'custom', accessMode: 'byok', apiFormat: 'anthropic', endpointUrl: 'https://gateway.example/v1/messages', model: 'my-model', authType: 'api-key', authHeader: 'X-Workspace-Key', apiKey: 'local-key' })
    expect(custom).toMatchObject({ provider: 'custom', apiFormat: 'anthropic', endpointUrl: 'https://gateway.example/v1/messages', model: 'my-model', authType: 'api-key', authHeader: 'X-Workspace-Key' })
    expect(connectionIssue(custom)).toBeNull()
    expect(connectionIssue({ ...custom, authHeader: 'sk-or-v1-example' })).toBeTruthy()
    expect(normalizeAISettings({ provider: 'custom', model: 'gemini-2.0-flash', endpointUrl: 'https://gateway.example/v1/chat/completions' }).model).toBe('gemini-2.0-flash')
  })

  it('starts a new account on managed Poiem AI, not a personal key', () => {
    expect(defaultAISettings().accessMode).toBe('managed')
    expect(OPENROUTER_MODELS).toContain('google/gemma-4-31b-it')
  })

  it('offers only models the photo flow can actually use', () => {
    // Photo logging sends an image, so a text-only preset would break that flow on selection.
    expect(OPENROUTER_MODELS).not.toContain('meta-llama/llama-3.3-70b-instruct')
    expect(OPENROUTER_MODELS).toContain(defaultAISettings().model)
  })

  it('derives the old connection without changing a stored key or model', () => {
    const settings = normalizeAISettings({ provider: 'gemini', apiKey: 'device-only-key', model: 'chosen-gemini' })
    expect(apiFormatFor(settings)).toBe('gemini')
    expect(authTypeFor(settings)).toBe('api-key')
    expect(defaultEndpointFor(settings.provider)).toContain('/models/{model}:generateContent')
    expect(settings.apiKey).toBe('device-only-key')
    expect(settings.model).toBe('chosen-gemini')
    expect(normalizeAISettings({ provider: 'gemini', model: 'gemini-2.0-flash' }).model).toBe('gemini-3.5-flash-lite')
    expect(normalizeAISettings({ provider: 'gemini', model: 'gemini-2.0-flash', endpointUrl: 'https://gateway.example/models/{model}:generateContent' }).model).toBe('gemini-2.0-flash')
  })

  it('allows an explicit keyless local service and a safe Azure version', () => {
    const custom: AISettings = { provider: 'custom', accessMode: 'byok', apiKey: '', model: 'local-model', endpointUrl: 'http://localhost:11434/v1/chat/completions', authType: 'none' }
    expect(connectionIssue(custom)).toBeNull()
    expect(connectionIssue({ ...custom, endpointUrl: 'https://workspace.openai.azure.com/openai/deployments/my-deployment/chat/completions?api-version=2024-10-21', authType: 'api-key', authHeader: 'api-key', apiKey: 'device-key' })).toBeNull()
  })

  it.each([
    'https://user:secret@api.example/v1/chat/completions',
    'https://api.example/v1/chat/completions?key=secret',
    'https://api.example/v1/chat/completions?api-version=2024-10-21&api-version=2024-10-21',
    'https://api.example/v1/chat/completions?api-version=secret',
    'https://api.example/v1/chat/completions#secret',
    'http://api.example/v1/chat/completions',
    'https://{model}.example/v1/chat/completions',
  ])('rejects unsafe endpoint configuration without echoing it: %s', endpointUrl => {
    const issue = connectionIssue({ provider: 'custom', accessMode: 'byok', apiKey: 'device-key', model: 'my-model', endpointUrl })
    expect(issue).toBeTruthy()
    expect(issue).not.toContain('secret')
    expect(issue).not.toContain(endpointUrl)
  })
})
