import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { SettingsPage } from './SettingsPage'

let state = freshState()
vi.mock('../store/AppContext', () => ({
  useApp: () => ({ state, updateProfile: vi.fn(), updateAISettings: vi.fn(), replaceState: vi.fn(), clearAllData: vi.fn(), patchGamification: vi.fn() }),
}))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}))
vi.mock('../components/Momo', () => ({ Momo: () => null }))
const renderPage = () => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/settings'] }, createElement(SettingsPage)))
beforeEach(() => { state = freshState() })

describe('You page UI', () => {
  it('offers an opt-in roast preview without an AI key, honoring mute and hide', () => {
    expect(renderPage()).toContain('Roast mode')
    expect(renderPage()).not.toContain('Roast me')
    state.profile.mascotRoasts = true
    expect(renderPage()).toContain('Roast me')
    state.profile.mascotMuted = true
    expect(renderPage()).not.toContain('Roast me')
    state.profile.mascotMuted = false
    state.gamification.mascotActivity = 'off'
    expect(renderPage()).not.toContain('Roast me')
  })
  it('respects Hide Momo for the decorative profile sticker', () => {
    expect(renderPage()).toContain('class="momo-sticker" aria-hidden="true"')
    state.gamification.mascotActivity = 'off'
    expect(renderPage()).not.toContain('class="momo-sticker"')
  })

  it('puts profile and preferences before Momo and account actions', () => {
    const html = renderPage()
    const sections = ['you-profile', 'you-preferences', 'you-momo', 'you-ai', 'you-account', 'you-data']
    let previous = -1
    for (const id of sections) {
      const index = html.indexOf(`id="${id}"`)
      expect(index).toBeGreaterThan(previous)
      expect(html).toContain(`href="#${id}"`)
      expect(html).toContain(`aria-labelledby="${id}-title" tabindex="-1"`)
      expect(html).toContain(`<h2 id="${id}-title">`)
      previous = index
    }
  })

  it('offers one save action with a persistent live status before the settings', () => {
    const html = renderPage()
    expect(html.match(/>Save settings</g)).toHaveLength(1)
    expect(html).toMatch(/role="status" aria-live="polite">[\s\S]*?All saved<\/div>/)
    expect(html).toContain('aria-current="location">Profile &amp; goals</a>')
    expect(html.indexOf('>Save settings<')).toBeLessThan(html.indexOf('id="you-profile"'))
    expect(html).toMatch(/<button type="button" disabled="" class="pressable/)
  })

  it('keeps advanced AI and wardrobe content in native, initially closed disclosures', () => {
    const html = renderPage()
    expect(html.match(/<details class="you-disclosure">/g)).toHaveLength(2)
    expect(html).toContain('Connection &amp; AI preferences')
    expect(html).toContain('No key added')
    expect(html).toContain('aria-label="Show API key" aria-pressed="false"')
    expect(html).not.toContain('<details class="you-disclosure" open=')
  })

  it('does not imply that an untested key is connected', () => {
    state.aiSettings.apiKey = 'test-placeholder'
    expect(renderPage()).toContain('Key added · not verified')
  })

  it('explains immediate mascot changes and provides an achievements empty state', () => {
    const html = renderPage()
    expect(html).toContain('Your first badge starts with your first log.')
    expect(html).toContain('Keep your companion around the app · saves immediately')
    expect(html).toContain('Silence speech bubbles · apply with Save settings')
    expect(html).toContain('Changes save right away.')
    expect(html).toContain('role="group" aria-label="Wardrobe slot"')
    expect(html).toContain('href="/support"')
    expect(html).toContain('href="/coach"')
  })

  it('supports fractional body measurements without an integer-only input step', () => {
    const html = renderPage()
    expect(html.match(/inputMode="decimal" step="0.1"/g)).toHaveLength(2)
    expect(html).toContain('autoComplete="given-name"')
  })

  it('hides target summaries when paused or profile inputs are invalid', () => {
    state.profile.trackingPaused = true
    let html = renderPage()
    expect(html).toContain('Your daily target numbers are hidden.')
    expect(html).not.toContain('class="settings-goals-grid"')
    state.profile.trackingPaused = false
    state.profile.heightCm = 0
    html = renderPage()
    expect(html).toContain('Check your profile details to preview daily targets.')
    expect(html).toContain('Check your profile to save')
    expect(html).not.toContain('class="settings-goals-grid"')
  })
})
