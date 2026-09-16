import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectivePlan, managedAiEnabled } from '../../api/_lib/plan.js'
import { AiInputError, validateManagedPayload } from '../../api/_lib/aiProvider.js'

describe('managed AI entitlement rules', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('requires premium, active and a future (or absent) expiry', () => {
    expect(effectivePlan({ plan: 'premium', subscription_status: 'active', subscription_expires_at: null })).toBe('premium')
    expect(effectivePlan({ plan: 'premium', subscription_status: 'active', subscription_expires_at: '2030-01-01T00:00:00Z' }, Date.parse('2029-01-01T00:00:00Z'))).toBe('premium')
    expect(effectivePlan({ plan: 'premium', subscription_status: 'active', subscription_expires_at: '2020-01-01T00:00:00Z' }, Date.parse('2021-01-01T00:00:00Z'))).toBe('free')
    expect(effectivePlan({ plan: 'premium', subscription_status: 'past_due', subscription_expires_at: null })).toBe('free')
    expect(effectivePlan({ plan: 'free', subscription_status: 'active', subscription_expires_at: null })).toBe('free')
  })

  it('turns on when the operator OpenRouter key is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'operator-secret')
    vi.stubEnv('ENABLE_MANAGED_AI', '')
    vi.stubEnv('MANAGED_AI_GLOBAL_DAILY_MAX', '')
    expect(managedAiEnabled()).toBe(true)
  })

  it('stays off without a key, and when the operator turns it off', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'operator-secret')
    vi.stubEnv('ENABLE_MANAGED_AI', 'false')
    vi.stubEnv('MANAGED_AI_GLOBAL_DAILY_MAX', '100')
    expect(managedAiEnabled()).toBe(false)
    vi.stubEnv('ENABLE_MANAGED_AI', 'true')
    vi.stubEnv('OPENROUTER_API_KEY', '')
    expect(managedAiEnabled()).toBe(false)
  })
})

describe('managed AI request envelope', () => {
  // The browser posts { task, payload: { messages } }. Accepting a flat body instead would
  // have let the client and the API disagree while both looked individually correct.
  it('accepts the nested payload the browser sends', () => {
    expect(validateManagedPayload('food_text', { messages: [{ role: 'user', content: 'oats' }] }))
      .toEqual({ messages: [{ role: 'user', content: 'oats' }] })
  })

  it('refuses a body that omits the payload envelope', () => {
    expect(() => validateManagedPayload('food_text', undefined)).toThrow(AiInputError)
    expect(() => validateManagedPayload('food_text', { task: 'food_text' })).toThrow(AiInputError)
  })

  it('requires exactly one image for a photo scan and none for text', () => {
    const photo = [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } },
      { type: 'text', text: 'lunch' },
    ] }]
    expect(validateManagedPayload('food_photo', { messages: photo }).messages).toHaveLength(1)
    expect(() => validateManagedPayload('food_text', { messages: photo })).toThrow(AiInputError)
  })
})
