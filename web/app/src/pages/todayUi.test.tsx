import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wardrobeProgress } from '@fud-ai/product/wardrobe'
import { progressNote } from '../lib/progressNote'
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
afterEach(() => { vi.useRealTimers() })

describe('Today', () => {
  it('only offers the direct roast action after consent', () => {
    expect(render()).not.toContain('Roast me')
    state.profile.mascotRoasts = true
    expect(render()).toContain('Roast me')
    state.profile.trackingPaused = true
    expect(render()).not.toContain('Roast me')
  })

  it('opens with Momo, then what is left, then macros, then meals, without streaks, levels or poster decoration', () => {
    const html = render()
    expect(html.indexOf('aria-label="A note from Momo"')).toBeLessThan(html.indexOf('kcal left'))
    expect(html).toContain('Today’s snapshot')
    expect(html).toContain('kcal left')
    expect(html).toContain('aria-label="Choose date"')
    expect(html.indexOf('kcal left')).toBeLessThan(html.indexOf('aria-label="Macros"'))
    expect(html.indexOf('aria-label="Macros"')).toBeLessThan(html.indexOf('id="meals-title"'))
    expect(html.indexOf('id="meals-title"')).toBeLessThan(html.indexOf('aria-label="Water and notes"'))
    expect(html).toContain('Your table is ready')
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
      expect(html).toContain(`Add ${slot}</button>`)
    }
    expect(html).toContain('aria-label="Water glasses"')
    expect(html.match(/class="k-glass( is-full)?"/g)).toHaveLength(8)
    expect(html).not.toMatch(/day streak|Level \d/)
    expect(html).not.toContain('Logging milestones')
    expect(html).not.toContain('poster-')
    expect(html).not.toContain('🔥')
    expect(html.match(/aria-label="Log a meal"/g)).toHaveLength(1)
  })

  it('greets by first name and gives Momo a button to poke', () => {
    state.profile.name = 'Sam Rivera'
    const html = render()
    expect(html).toMatch(/(Morning|Afternoon|Evening|Hey there), Sam!/)
    expect(html).toContain('aria-label="Say something, Momo"')
  })

  it('groups meals by meal type, each with its time, macros and a tinted food icon', () => {
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
    expect(html).toContain('k-food-tile is-tone-mint')
    expect(html).toContain('2 meals · 430 kcal')
    expect(html).toContain('You showed up.')
  })

  it('says plainly how far over the guide the day went, and Momo says nothing different', () => {
    // Freeze the clock so no render can straddle an hour (Momo’s opener is part-of-day aware).
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30))
    const loggedAt = new Date(2026, 9, 5, 8, 15).toISOString()
    const momoNote = (markup: string) => markup.match(/<aside class="k-momo"[\s\S]*?<\/aside>/)?.[0] ?? ''
    // One breakfast at the same time every render: the entry count, meal type and timestamp
    // (Momo’s interaction context) never change. Only calories, macros and targets do.
    const day = (entry: Partial<FoodEntry>, targets: Partial<typeof state.profile> = {}) => {
      state = freshState()
      Object.assign(state.profile, targets)
      state.foodEntries = [meal({ timestamp: loggedAt, ...entry })]
      return render()
    }

    const under = day({ calories: 100 })
    const over = day({ calories: 9_000 })
    expect(over).toContain('kcal over the guide')
    expect(over).not.toContain('kcal left')
    expect(over).not.toContain('fresh plate')
    expect(under).toContain('kcal left')

    const variants = [
      under,
      over,
      // Macro-heavy and macro-empty days at the same calories and the same single entry.
      day({ calories: 250, protein: 400, carbs: 900, fat: 300 }),
      day({ calories: 250, protein: 0, carbs: 0, fat: 0 }),
      // Different targets, calories and macros held at the baseline day.
      day({ calories: 100 }, { customCalories: 1_200, customProtein: 40, customCarbs: 80, customFat: 20 }),
      day({ calories: 100 }, { customCalories: 4_000, customProtein: 300, customCarbs: 500, customFat: 150 }),
      // Everything at once: over the calories, over every macro, under tiny targets.
      day({ calories: 9_000, protein: 400, carbs: 900, fat: 300 }, { customCalories: 1_200, customProtein: 40, customCarbs: 80, customFat: 20 }),
      day({ calories: 9_000, protein: 400, carbs: 900, fat: 300 }, { customCalories: 4_000, customProtein: 300, customCarbs: 500, customFat: 150 }),
    ]

    // The pages themselves do change, so the equality below is not vacuous.
    expect(new Set(variants).size).toBe(variants.length)
    const baseline = momoNote(variants[0]!)
    expect(baseline).toContain('A note from Momo')
    for (const html of variants) expect(momoNote(html)).toBe(baseline)
  })

  it('counts the progress note’s logged days the way wardrobe unlocks do', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30))
    // Logged just after midnight while travelling: the stored local day is the 4th, the timestamp says the 5th.
    state.foodEntries = [
      meal({ id: 'late', timestamp: new Date(2026, 9, 5, 0, 20).toISOString(), localDate: '2026-10-04' }),
      meal({ id: 'oats', timestamp: new Date(2026, 9, 5, 8, 15).toISOString() }),
    ]
    const days = wardrobeProgress(state).loggedDays
    expect(days).toBe(2)
    const note = render().match(/<p class="k-ring-note">([^<]*)<\/p>/)?.[1]
    expect(note).toBe(progressNote({ loggedDays: days, ownedPieceIds: state.gamification.ownedCosmeticIds }).text)
    expect(note).toMatch(/^2 logged days/)
  })

  it('hides nutrition during tracking pause', () => {
    state.profile.trackingPaused = true
    const html = render()
    expect(html).toContain('Tracking is paused')
    expect(html).toContain('Manage pause')
    expect(html).not.toContain('kcal left')
    expect(html).not.toContain('aria-label="Macros"')
  })

  it('opens an archived local day with its meals and a way back to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 10, 30))
    state.foodEntries = [
      meal({ id: 'past', name: 'Archived oats', timestamp: new Date(2026, 9, 5, 8, 15).toISOString() }),
      meal({ id: 'current', name: 'Today soup', timestamp: new Date(2026, 9, 6, 8, 15).toISOString() }),
    ]
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={[{ pathname: '/', state: { journalDay: '2026-10-05' } }]}><HomePage /></MemoryRouter>)
    expect(html).toContain('Yesterday’s snapshot')
    expect(html).toContain('Archived oats')
    expect(html).not.toContain('Today soup')
    expect(html).toContain('Back to today')
    expect(html).not.toContain('Add breakfast')
    expect(html).not.toContain('aria-label="Water and notes"')
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
