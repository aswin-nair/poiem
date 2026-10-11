import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { LoginPage } from './LoginPage'

let state = freshState()
let returnLabel: string | null = null
vi.mock('../store/AppContext', () => ({ useApp: () => ({ state }) }))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn() }) }))
vi.mock('../lib/auth', () => ({ isGoogleAuthConfigured: () => false }))
vi.mock('../lib/dataBackend', () => ({ isCloudBackend: () => true }))
vi.mock('../lib/sessionNavigation', () => ({ getSessionReturnLabel: () => returnLabel }))
const render = (url = '/login') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(LoginPage)))
beforeEach(() => { state = freshState(); returnLabel = null })

describe('character-led login', () => {
  it('keeps sign-in focused, named, and password-masked initially', () => {
    const html = render()
    expect(html).toContain('<main class="k-screen k-account is-signin">')
    expect(html).not.toContain('food-club-frame')
    expect(html).toContain('Welcome back!')
    expect(html).toContain('role="group" aria-label="Account access"')
    expect(html).toContain('<fieldset class="auth-fields">')
    expect(html).toContain('autoComplete="current-password"')
    expect(html).toContain('type="password"')
    expect(html).toContain('aria-pressed="false">Show password')
    expect(html).toContain('href="/forgot-password"')
    expect(html).toContain('aria-busy="false"')
  })

  it('shows signup-specific requirements and retains the claim explanation', () => {
    const html = render('/login?mode=signup&claim=1')
    expect(html).toContain('Join Poiem.')
    expect(html).toContain('Create an account to keep the first meal you logged on this device.')
    expect(html).toContain('Your device progress is kept until the handoff finishes.')
    expect(html).toContain('aria-describedby="auth-password-hint auth-password-strength"')
    expect(html).toContain('auth-password-strength')
    expect(html).toContain('minLength="8"')
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('for="confirm"')
  })

  it('keeps setup context and a specific path back without forwarding private query data', () => {
    const html = render('/login?setup=1&claim=1&token=do-not-forward&email=private')
    expect(html).toContain('Your setup is kept on this device.')
    expect(html).toContain('An existing journal and any account setup keep their own progress.')
    expect(html).toContain('href="/onboarding"')
    expect(html).toContain('>Back to setup</a>')
    expect(html).toContain('href="/forgot-password?claim=1&amp;setup=1"')
    expect(html).not.toContain('do-not-forward')
  })

  it('explains same-account task resumption and password reset completion', () => {
    returnLabel = 'your meal review'
    const html = render('/login?passwordUpdated=1')
    expect(html).toContain('Sign in to the same account to continue your meal review.')
    expect(html).toContain('Password updated. Sign in with your new password.')
    expect(html).toContain('href="/welcome"')
  })

  it('honours hidden and muted mascot preferences', () => {
    expect(render()).toContain('data-expression="proud"')
    expect(render()).toContain('Your plate called. It missed you.')
    state.profile.mascotMuted = true
    expect(render()).not.toContain('food-club-bubble-wrap')
    expect(render()).toContain('data-expression="proud"')
    state.profile.mascotMuted = false
    state.gamification.mascotActivity = 'off'
    expect(render()).not.toContain('data-expression=')
    expect(render()).not.toContain('food-club-bubble-wrap')
    expect(render()).toContain('food-club-fallback')
  })
})
