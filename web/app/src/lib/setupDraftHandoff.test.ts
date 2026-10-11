import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from './onboarding'
import { defaultProfile } from './profile'
import { handoffGuestSetupDraft } from './setupDraftHandoff'

describe('explicit guest setup handoff', () => {
  const stored = new Map<string, string>()
  const profile = defaultProfile()
  beforeEach(() => {
    stored.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('copies setup choices into an empty unconfigured account and retains the guest source', () => {
    const draft = { ...createOnboardingDraft(profile), welcomeIndex: 3, step: 3, birthdayInput: '2000-01-01' }
    draft.profile.name = 'Guest choices'
    saveOnboardingDraft('guest-one', draft)
    expect(handoffGuestSetupDraft('guest-one', 'account-one', false, profile)).toBe(true)
    expect(loadOnboardingDraft('account-one', profile)).toEqual(loadOnboardingDraft('guest-one', profile))
    expect(stored.get('fud-onboarding-draft-guest-one')).toBe(JSON.stringify(draft))
  })

  it('does not overwrite any target setup draft', () => {
    saveOnboardingDraft('guest-one', createOnboardingDraft(profile))
    stored.set('fud-onboarding-draft-account-one', '{needs recovery')
    expect(handoffGuestSetupDraft('guest-one', 'account-one', false, profile)).toBe(false)
    expect(stored.get('fud-onboarding-draft-account-one')).toBe('{needs recovery')
  })

  it('does not copy into an already completed journal', () => {
    saveOnboardingDraft('guest-one', createOnboardingDraft(profile))
    expect(handoffGuestSetupDraft('guest-one', 'account-one', true, profile)).toBe(false)
    expect(stored.has('fud-onboarding-draft-account-one')).toBe(false)
  })

  it.each(['{broken', JSON.stringify({ version: 2, profile: {}, firstMeal: {} })])('keeps malformed guest work isolated', raw => {
    stored.set('fud-onboarding-draft-guest-one', raw)
    expect(handoffGuestSetupDraft('guest-one', 'account-one', false, profile)).toBe(false)
    expect(stored.get('fud-onboarding-draft-guest-one')).toBe(raw)
  })

  it('retains a blocked draft without removing its age gate', () => {
    const draft = { ...createOnboardingDraft(profile), step: 1, blocked: true, birthdayInput: '2020-01-01' }
    saveOnboardingDraft('guest-one', draft)
    expect(handoffGuestSetupDraft('guest-one', 'account-one', false, profile)).toBe(true)
    expect(loadOnboardingDraft('account-one', profile).blocked).toBe(true)
    expect(stored.has('fud-onboarding-draft-guest-one')).toBe(true)
  })
})
