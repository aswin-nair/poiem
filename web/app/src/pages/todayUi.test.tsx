import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import type { FoodEntry } from '../types'
import { HomePage } from './HomePage'

let state = freshState()
vi.mock('../store/AppContext', () => ({ useApp: () => ({
  state, ackLevelUp: vi.fn(), patchGamification: vi.fn(), deleteEntry: vi.fn(),
  restoreEntry: vi.fn(), refresh: vi.fn(),
}) }))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ user: { sub: 'test' } }) }))
vi.mock('../mascot/MascotOverlay', () => ({ mascotEvent: vi.fn() }))
vi.mock('../mascot/anchors', () => ({ useAnchor: () => () => {} }))

const render = (guest = false) => renderToStaticMarkup(<MemoryRouter><HomePage guest={guest} /></MemoryRouter>)
const meal = (over: Partial<FoodEntry> = {}): FoodEntry => ({
  id: 'oats', name: 'Oats', calories: 250, protein: 8, carbs: 40, fat: 5,
  timestamp: new Date().toISOString(), source: 'manual', mealType: 'breakfast', ...over,
})
beforeEach(() => { state = freshState() })

describe('Today', () => {
  it('only offers the direct roast action after consent', () => {
    expect(render()).not.toContain('Roast me')
    state.profile.mascotRoasts = true
    expect(render()).toContain('Roast me')
    state.profile.trackingPaused = true
    expect(render()).not.toContain('Roast me')
  })

  it('leads with what is left, then macros, then meals, without streaks, levels or decoration', () => {
    const html = render()
    expect(html).toContain('Today’s snapshot')
    expect(html).toContain('kcal left')
    expect(html).toContain('aria-label="Choose date"')
    expect(html.indexOf('kcal left')).toBeLessThan(html.indexOf('aria-label="Macros"'))
    expect(html.indexOf('aria-label="Macros"')).toBeLessThan(html.indexOf('id="meals-title"'))
    expect(html).toContain('Your table is ready')
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
      expect(html).toContain(`Add ${slot}</button>`)
    }
    expect(html).toContain('aria-label="Water glasses"')
    expect(html).not.toMatch(/day streak|Level \d/)
    expect(html).not.toContain('Logging milestones')
    expect(html).not.toContain('poster-')
    expect(html).not.toContain('🔥')
    expect(html.match(/aria-label="Log a meal"/g)).toHaveLength(1)
  })

  it('groups meals by meal type, each with its time, macros and a food icon', () => {
    state.foodEntries = [
      meal(),
      meal({ id: 'soup', name: 'Tomato soup', calories: 180, protein: 4, carbs: 20, fat: 9, mealType: 'dinner' }),
    ]
    const html = render()
    expect(html.indexOf('id="meal-breakfast"')).toBeLessThan(html.indexOf('>Oats'))
    expect(html.indexOf('>Oats')).toBeLessThan(html.indexOf('id="meal-dinner"'))
    expect(html.indexOf('id="meal-dinner"')).toBeLessThan(html.indexOf('>Tomato soup'))
    expect(html).toContain('250 kcal')
    expect(html).toContain('P 8 · C 40 · F 5')
    expect(html).toContain('lucide-soup')
    expect(html).toContain('2 meals · 430 kcal')
    expect(html).toContain('You showed up.')
  })

  it('says plainly how far over the guide the day went', () => {
    state.foodEntries = [meal({ calories: 9_000 })]
    const html = render()
    expect(html).toContain('kcal over the guide')
    expect(html).not.toContain('kcal left')
  })

  it('hides nutrition during tracking pause', () => {
    state.profile.trackingPaused = true
    const html = render()
    expect(html).toContain('Tracking is paused')
    expect(html).toContain('Manage pause')
    expect(html).not.toContain('kcal left')
    expect(html).not.toContain('aria-label="Macros"')
  })

  it('respects mute and hide-Momo preferences', () => {
    state.profile.mascotMuted = true
    expect(render()).not.toContain('A note from Momo')
    state.profile.mascotMuted = false
    state.gamification.mascotActivity = 'off'
    expect(render()).not.toContain('A note from Momo')
  })

  it('keeps the guest account-claim path without log shortcuts or navigation', () => {
    const html = render(true)
    expect(html).toContain('Save your progress')
    expect(html).not.toContain('Add breakfast')
    expect(html).not.toContain('aria-label="Main"')
  })
})
