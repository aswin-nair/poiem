import { describe, expect, it } from 'vitest'

import { OPENROUTER_MODELS, defaultAISettings, defaultModelFor, normalizeAISettings } from './aiConfig'

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
  })

  it('offers only models the photo flow can actually use', () => {
    // Photo logging sends an image, so a text-only preset would break that flow on selection.
    expect(OPENROUTER_MODELS).not.toContain('meta-llama/llama-3.3-70b-instruct')
    expect(OPENROUTER_MODELS).toContain(defaultAISettings().model)
  })
})
