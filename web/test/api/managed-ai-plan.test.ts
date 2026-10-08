import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectivePlan, managedAiEnabled } from '../../api/_lib/plan.js'
import { AiInputError, AiProviderError, callManagedProvider, validateManagedPayload, validatePlanConfig } from '../../api/_lib/aiProvider.js'
import type { AiModel, AiPlanConfig } from '../../shared/aiPlans.js'

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

const previous: AiPlanConfig = {
  plan: 'free',
  provider: 'openrouter',
  model: 'google/gemma-4-31b-it',
  fallback_models: ['google/gemini-2.5-flash'],
  daily_food: 20,
  daily_coach: 0,
}
const catalogue: AiModel[] = [
  { id: 'google/gemma-4-31b-it', name: 'Gemma', image: true, promptPrice: '', completionPrice: '' },
  { id: 'google/gemini-2.5-flash', name: 'Flash', image: true, promptPrice: '', completionPrice: '' },
  { id: 'google/gemini-3.5-flash-lite', name: 'Flash-Lite', image: true, promptPrice: '0.0000003', completionPrice: '0.0000025' },
  { id: 'openai/gpt-4o-mini', name: 'Text', image: false, promptPrice: '', completionPrice: '' },
]

describe('plan configuration validation', () => {
  it('accepts the stronger image-capable default with the previous model as fallback', async () => {
    const config = { ...previous, model: 'google/gemini-3.5-flash-lite', fallback_models: ['google/gemma-4-31b-it'] }
    await expect(validatePlanConfig(config, { catalogue, previous })).resolves.toEqual(config)
  })

  it('rejects empty, text-only, or unknown model IDs when the catalogue is live', async () => {
    await expect(validatePlanConfig({ ...previous, model: '' }, { catalogue, previous })).rejects.toBeInstanceOf(AiInputError)
    await expect(validatePlanConfig({ ...previous, model: 'openai/gpt-4o-mini' }, { catalogue, previous })).rejects.toBeInstanceOf(AiInputError)
    await expect(validatePlanConfig({ ...previous, model: 'missing/model' }, { catalogue, previous })).rejects.toBeInstanceOf(AiInputError)
  })

  it('allows quota-only edits when the catalogue is down, and keeps the last validated models', async () => {
    const saved = await validatePlanConfig({ ...previous, daily_food: 25 }, { catalogue: null, previous })
    expect(saved).toEqual({ ...previous, daily_food: 25 })
    await expect(validatePlanConfig({ ...previous, model: 'google/other-vision', fallback_models: [] }, { catalogue: [], previous }))
      .rejects.toThrow(/catalogue is unavailable/)
    await expect(validatePlanConfig({ ...previous, daily_food: 25 }, { catalogue: null, previous: null }))
      .rejects.toThrow(/catalogue is unavailable/)
  })
})

describe('managed default rollout', () => {
  it('upgrades only untouched legacy Free configurations and retains their allowances', () => {
    const migration = readFileSync(new URL('../../db/migrations/20261007_free_ai_model.sql', import.meta.url), 'utf8')
    expect(migration).toContain("SET model = 'google/gemini-3.5-flash-lite'")
    expect(migration).toContain("fallback_models = ARRAY['google/gemma-4-31b-it']::text[]")
    expect(migration).toContain("WHERE plan = 'free'")
    expect(migration).toContain("AND provider = 'openrouter'")
    expect(migration).toContain("AND model IN ('google/gemma-4-31b-it', 'google/gemini-2.5-flash-lite')")
    expect(migration).toContain('AND updated_by IS NULL')
    expect(migration).toContain('AND cardinality(fallback_models) = 0')
    expect(migration).not.toMatch(/daily_(food|coach)\s*=/)
    const runner = readFileSync(new URL('../../scripts/migrate.mjs', import.meta.url), 'utf8')
    expect(runner).toContain("[target, '../db/migrations/20261007_free_ai_model.sql']")
    const seed = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8')
    expect(seed).toContain("('free', 'google/gemini-3.5-flash-lite', ARRAY['google/gemma-4-31b-it']::text[], 20, 0)")
  })
})

describe('managed credential boundary', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('uses the protected credential only upstream and returns nutrition text', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'operator-test-secret')
    const text = '{"name":"Oats","calories":250,"protein":10,"carbs":40,"fat":5}'
    const upstream = vi.fn(async (_url: string | URL | Request, _options?: RequestInit) =>
      Response.json({ choices: [{ message: { content: text } }] }))
    vi.stubGlobal('fetch', upstream)
    const config = { ...previous, model: 'google/gemini-3.5-flash-lite', fallback_models: [] }
    const result = await callManagedProvider(config, 'food_text', { messages: [{ role: 'user', content: 'oats' }] }, 'unused')
    expect(result).toBe(text)
    expect(result).not.toContain('operator-test-secret')
    const options = upstream.mock.calls[0][1] as RequestInit
    expect(options.headers).toMatchObject({ Authorization: 'Bearer operator-test-secret' })
    expect(options.body).not.toContain('operator-test-secret')
    expect(JSON.parse(String(options.body))).toMatchObject({ model: config.model, max_tokens: 1600, stream: false })
  })

  it('refuses a provider reply that echoes the operator credential', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'operator-test-secret')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content:
      '{"name":"operator-test-secret","calories":250,"protein":10,"carbs":40,"fat":5}',
    } }] })))
    await expect(callManagedProvider({ ...previous, fallback_models: [] }, 'food_text',
      { messages: [{ role: 'user', content: 'oats' }] }, 'unused')).rejects.toBeInstanceOf(AiProviderError)
  })
})
