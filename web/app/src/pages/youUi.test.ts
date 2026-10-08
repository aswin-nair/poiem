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
const renderPage = (url = '/settings') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(SettingsPage)))
beforeEach(() => { state = freshState() })

describe('You page UI', () => {
  it('offers an opt-in roast preview without an AI key, honoring mute and hide', () => {
    expect(renderPage('/settings?panel=momo')).toContain('Roast mode')
    expect(renderPage('/settings?panel=momo')).not.toContain('Roast me')
    state.profile.mascotRoasts = true
    expect(renderPage('/settings?panel=momo')).toContain('Roast me')
    state.profile.mascotMuted = true
    expect(renderPage('/settings?panel=momo')).not.toContain('Roast me')
    state.profile.mascotMuted = false
    state.gamification.mascotActivity = 'off'
    expect(renderPage('/settings?panel=momo')).not.toContain('Roast me')
  })
  /* The header carries the page's own words now, with no decorative Momo to
     hide, so nothing here depends on the Hide Momo setting. */
  it('keeps the header free of mascot decoration', () => {
    expect(renderPage()).not.toContain('class="momo-sticker"')
  })

  it('keeps the hub short and opens each destination as its own view', () => {
    const hub = renderPage()
    expect(hub).toContain('id="you-appearance"')
    expect(hub).toContain('Quick preferences')
    expect(hub).not.toContain('id="you-profile"')
    expect(hub).not.toContain('id="you-momo"')
    expect(hub).not.toContain('id="you-account"')
    const sections = ['profile', 'preferences', 'momo', 'ai', 'account', 'data']
    for (const id of sections) {
      expect(hub).toContain(`href="/settings?panel=${id}"`)
      const html = renderPage(`/settings?panel=${id}`)
      expect(html).toContain(`id="you-${id}"`)
      expect(html).toContain(`aria-labelledby="you-${id}-title" tabindex="-1"`)
      expect(html).toContain(`<h2 id="you-${id}-title">`)
      expect(html).toContain('aria-current="page"')
    }
  })

  it('offers a labeled category picker near the header without a redundant save action', () => {
    const html = renderPage()
    expect(html).toContain('<label class="you-category-picker"><span>Category</span><select')
    expect(html).toContain('<option value="overview" selected="">Overview</option>')
    for (const id of ['profile', 'preferences', 'momo', 'ai', 'account', 'data']) {
      expect(html).toContain(`<option value="${id}">`)
    }
    expect(html).toContain('Preferences save immediately.')
    expect(html).not.toContain('>Save settings<')
    expect(html).not.toContain('All saved')
    expect(html).not.toContain('you-destinations')
    expect(html).toContain('>Overview</a>')
    expect(html).toContain('aria-current="page"')
    expect(html.indexOf('you-category-picker')).toBeLessThan(html.indexOf('poiem-settings-finder'))
    expect(renderPage('/settings?panel=ai')).toContain('<option value="ai" selected="">AI setup</option>')
  })

  it('keeps wardrobe and Momo live AI in native, initially closed disclosures', () => {
    const momo = renderPage('/settings?panel=momo')
    expect(momo.match(/<details class="you-disclosure">/g)).toHaveLength(1)
    expect(momo).toContain('role="switch"')
    expect(momo).not.toContain('<details class="you-disclosure" open=')
    const ai = renderPage('/settings?panel=ai')
    expect(ai.match(/<details class="you-disclosure">/g)).toHaveLength(1)
    expect(ai).toContain('Use my own API')
    expect(ai).toContain('Poiem AI is the default')
    expect(ai).not.toContain('OpenRouter')
    expect(ai).not.toContain('google/gemma-4-31b-it')
    expect(ai).not.toContain('<details class="you-disclosure" open=')
  })

  it('does not imply that an untested key is connected', () => {
    state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: 'test-placeholder' }
    expect(renderPage('/settings?panel=ai')).toContain('aria-label="API key"')
    expect(renderPage('/settings?panel=ai')).toContain('Uses your connection when saved')
  })

  it('explains immediate mascot changes and points streaks to Insights', () => {
    const html = renderPage('/settings?panel=momo')
    expect(html).toContain('Streaks and badges now live in Insights.')
    expect(html).toContain('Keep your companion around the app · saves immediately')
    expect(html).toContain('Silence speech bubbles · saves immediately')
    expect(html).toContain('Changes save right away.')
    expect(html).toContain('role="group" aria-label="Wardrobe slot"')
    const preferences = renderPage('/settings?panel=preferences')
    expect(preferences).toContain('href="/support"')
    expect(preferences).toContain('href="/coach"')
  })

  it('supports fractional body measurements without an integer-only input step', () => {
    const html = renderPage('/settings?panel=profile')
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
    expect(html).not.toContain('>Save settings<')
    expect(html).not.toContain('class="settings-goals-grid"')
  })
})
