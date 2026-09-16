import { describe, expect, it } from 'vitest'

import { canUseAi } from './aiAccess'
import type { AISettings } from './aiConfig'
import type { AiStatus } from '../../../shared/aiPlans'

const managedSettings: AISettings = { accessMode: 'managed', provider: 'openrouter', apiKey: '', model: '' }
const byokSettings: AISettings = { accessMode: 'byok', provider: 'openrouter', apiKey: 'sk-or-device-only', model: 'openai/gpt-4o-mini' }

function status(overrides: Partial<AiStatus> = {}): AiStatus {
  return {
    plan: 'free',
    subscriptionStatus: 'active',
    expiresAt: null,
    isAdmin: false,
    enabled: true,
    resetAt: '2026-09-17T00:00:00.000Z',
    food: { used: 0, reserved: 0, limit: 5, remaining: 5 },
    coach: { used: 0, reserved: 0, limit: 0, remaining: 0 },
    ...overrides,
  }
}

describe('AI availability', () => {
  it('withholds AI until the reader has an account, even with their own key', () => {
    expect(canUseAi(false, status(), managedSettings, 'food_photo')).toBe(false)
    expect(canUseAi(false, null, byokSettings, 'food_photo')).toBe(false)
  })

  it('gives a signed-in reader managed scans without any key of their own', () => {
    expect(canUseAi(true, status(), managedSettings, 'food_photo')).toBe(true)
    expect(canUseAi(true, status(), managedSettings, 'food_text')).toBe(true)
  })

  it('keeps a signed-in reader on their own key when they chose BYOK', () => {
    expect(canUseAi(true, null, byokSettings, 'food_photo')).toBe(true)
    expect(canUseAi(true, null, { ...byokSettings, apiKey: '  ' }, 'food_photo')).toBe(false)
  })

  it('stops managed use when the operator disabled it or the allowance is spent', () => {
    expect(canUseAi(true, status({ enabled: false }), managedSettings, 'food_text')).toBe(false)
    expect(canUseAi(true, status({ food: { used: 5, reserved: 0, limit: 5, remaining: 0 } }), managedSettings, 'food_text')).toBe(false)
  })

  it('reserves managed Coach for Premium while BYOK Coach stays open', () => {
    expect(canUseAi(true, status(), managedSettings, 'coach')).toBe(false)
    expect(canUseAi(true, status({ plan: 'premium', coach: { used: 0, reserved: 0, limit: 50, remaining: 50 } }), managedSettings, 'coach')).toBe(true)
    expect(canUseAi(true, null, byokSettings, 'coach')).toBe(true)
  })
})
