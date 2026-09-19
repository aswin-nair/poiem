import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { LoginPage } from './LoginPage'

let state = freshState()
vi.mock('../store/AppContext', () => ({ useApp: () => ({ state }) }))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn() }) }))
vi.mock('../lib/auth', () => ({ isGoogleAuthConfigured: () => false }))
vi.mock('../lib/dataBackend', () => ({ isCloudBackend: () => true }))
const render = (url = '/login') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(LoginPage)))
beforeEach(() => { state = freshState() })

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
    expect(html).toContain('Save your first little win. Your journal comes with you.')
    expect(html).toContain('aria-describedby="auth-password-hint auth-password-strength"')
    expect(html).toContain('auth-password-strength')
    expect(html).toContain('minLength="8"')
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('for="confirm"')
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
