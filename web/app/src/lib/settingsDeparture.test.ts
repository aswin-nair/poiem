import { createMemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { defaultAISettings } from './aiConfig'
import { aiIssueControl, profileIssueControl, shouldProtectSettingsDeparture } from './settingsDeparture'

describe('Settings departure protection', () => {
  it('only protects dirty departure from Settings, including trailing slashes', () => {
    expect(shouldProtectSettingsDeparture(true, '/settings', '/coach')).toBe(true)
    expect(shouldProtectSettingsDeparture(true, '/settings/', '/')).toBe(true)
    expect(shouldProtectSettingsDeparture(true, '/settings', '/settings')).toBe(false)
    expect(shouldProtectSettingsDeparture(true, '/settings', '/settings/')).toBe(false)
    expect(shouldProtectSettingsDeparture(false, '/settings', '/coach')).toBe(false)
    expect(shouldProtectSettingsDeparture(true, '/log', '/')).toBe(false)
  })

  it('resumes the original replace navigation and state, without adding a history step', async () => {
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/', '/settings?panel=profile'] })
    const shouldBlock = ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => shouldProtectSettingsDeparture(true, currentLocation.pathname, nextLocation.pathname)
    router.getBlocker('settings', shouldBlock)
    const state = { journalDay: '2026-10-09', source: 'settings' }
    await router.navigate('/progress?period=month#day', { replace: true, state })
    const blocker = router.getBlocker('settings', shouldBlock)
    expect(blocker.state).toBe('blocked')
    if (blocker.state === 'blocked') blocker.proceed()
    await Promise.resolve()
    expect(router.state.location).toMatchObject({ pathname: '/progress', search: '?period=month', hash: '#day', state })
    expect(router.state.historyAction).toBe('REPLACE')
    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/')
    router.dispose()
  })

  it('Stay cancels Back and proceeding then Forward retains the original history', async () => {
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/coach', '/settings', '/progress'], initialIndex: 1 })
    const shouldBlock = ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => shouldProtectSettingsDeparture(true, currentLocation.pathname, nextLocation.pathname)
    router.getBlocker('settings', shouldBlock)
    await router.navigate(-1)
    let blocker = router.getBlocker('settings', shouldBlock)
    if (blocker.state === 'blocked') blocker.reset()
    expect(router.state.location.pathname).toBe('/settings')
    await router.navigate(1)
    blocker = router.getBlocker('settings', shouldBlock)
    expect(blocker.state).toBe('blocked')
    if (blocker.state === 'blocked') blocker.proceed()
    await expect.poll(() => router.state.location.pathname).toBe('/progress')
    expect(router.state.historyAction).toBe('POP')
    router.dispose()
  })

  it('allows panel/search/hash transitions without creating a pending departure', async () => {
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/settings?panel=profile'] })
    const shouldBlock = ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => shouldProtectSettingsDeparture(true, currentLocation.pathname, nextLocation.pathname)
    router.getBlocker('settings', shouldBlock)
    await router.navigate('/settings?panel=ai#ai-model')
    expect(router.state.location.hash).toBe('#ai-model')
    expect(router.getBlocker('settings', shouldBlock).state).toBe('unblocked')
    router.dispose()
  })

  it('maps profile validation to the actual editable field or the focused error', () => {
    expect(profileIssueControl('Enter a valid height greater than zero.')).toBe('setting-height')
    expect(profileIssueControl('Enter a valid weight greater than zero.')).toBe('setting-weight')
    expect(profileIssueControl('Enter a weekly change of zero or more.')).toBe('setting-weekly-change')
    expect(profileIssueControl('Enter a valid goal weight greater than zero.')).toBe('setting-goal-weight')
    expect(profileIssueControl('A goal of 10 kg sits below a healthy weight for your height. Enter 57 kg or more to continue.')).toBe('setting-goal-weight')
    expect(profileIssueControl('Enter a valid date of birth.')).toBe('you-profile-error')
  })

  it('points connection failures into the auth disclosure or its exact field', () => {
    const connection = { ...defaultAISettings(), provider: 'custom' as const, accessMode: 'byok' as const, endpointUrl: 'https://example.test/v1/chat/completions', model: 'test-vision', apiKey: 'dummy-key' }
    expect(aiIssueControl({ ...connection, endpointUrl: '' }, 'Add the full API endpoint URL.')).toBe('ai-endpoint')
    expect(aiIssueControl({ ...connection, model: '' }, 'Add the model ID from your API provider.')).toBe('ai-model')
    expect(aiIssueControl({ ...connection, authType: 'api-key', authHeader: 'content-type' }, 'Use the header your provider expects for API keys.')).toBe('ai-auth-header')
    expect(aiIssueControl({ ...connection, apiKey: '' }, 'Add your API key in You → AI settings.')).toBe('setting-api-key')
  })
})
