import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import type { LogDraftEnvelope } from '../lib/logDrafts'
import { LogSheet } from './LogSheet'
import { ManualEntryPage } from './ManualEntryPage'

let state = freshState()
let drafts: LogDraftEnvelope = { version: 1 }

vi.mock('../store/AppContext', () => ({ useApp: () => ({ state, addEntry: vi.fn() }) }))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ user: { sub: 'ui-test' } }) }))
vi.mock('../mascot/MascotOverlay', () => ({ mascotEvent: vi.fn() }))
vi.mock('../lib/logDrafts', () => ({
  loadLogDrafts: () => drafts,
  hydrateLogDrafts: async () => drafts,
  saveManualLogDraft: vi.fn(),
  clearLogDraft: vi.fn(),
}))

const oats = () => ({ id: 'recent', name: 'Oats', calories: 250, protein: 8, carbs: 40,
  fat: 5, timestamp: new Date().toISOString(), source: 'manual' as const, mealType: 'breakfast' as const })

const renderSheet = (routeState: object | null = null) => renderToStaticMarkup(createElement(
  MemoryRouter,
  { initialEntries: [{ pathname: '/log', state: routeState }] },
  createElement(LogSheet),
))

beforeEach(() => {
  state = freshState()
  drafts = { version: 1 }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('log sheet', () => {
  it('is a labelled dialog offering every way to log, without opening the keyboard', () => {
    const html = renderSheet()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-labelledby="log-sheet-title"')
    expect(html).toContain('id="log-sheet-title">Log a meal</h2>')
    for (const [route, name] of [['photo', 'Snap a photo'], ['text', 'Describe your meal'], ['manual', 'Manual entry'], ['saved', 'Saved meals']]) {
      expect(html).toContain(`href="/log/${route}"`)
      expect(html).toContain(`<span class="sr-only">${name}</span>`)
    }
    expect(html).toContain('aria-label="Search your foods, or type calories"')
    expect(html).toContain('aria-describedby="log-search-hint"')
    expect(html.toLowerCase()).not.toContain('autofocus')
    expect(html).toContain('Anything you log shows up here')
  })

  it('logs to the meal the time implies, or to the meal Today asked for', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 12, 15, 30))
    expect(renderSheet()).toContain('aria-controls="log-meal-choices">Snack')
    expect(renderSheet({ mealType: 'dinner' })).toContain('aria-controls="log-meal-choices">Dinner')
  })

  it('puts recent meals first, with one-tap logging and a separate, named portion button', () => {
    state.foodEntries = [oats()]
    state.favoriteMeals = [{ id: 'saved', name: 'Rice', calories: 200, protein: 4, carbs: 44, fat: 1, mealType: 'lunch' }]
    const html = renderSheet()
    expect(html).toContain('aria-label="Adjust portion for Oats">Portion</button>')
    expect(html).toContain('aria-label="Your meal shortcuts"')
    expect(html).toContain('Favourites</button>')
    expect(html).not.toMatch(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/)
    expect(html.indexOf('Recent · tap to log again')).toBeLessThan(html.indexOf('aria-label="Other ways to log"'))
    state.foodEntries = []
    expect(renderSheet()).toContain('aria-label="Adjust portion for Rice">Portion</button>')
  })
})

describe('manual entry', () => {
  it('shows a serving-scaled review before the native submit action', () => {
    drafts.manual = { name: 'Oats', calories: '250', protein: '8', carbs: '40', fat: '5',
      servings: 1.5, mealType: 'breakfast', updatedAt: new Date().toISOString() }
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ManualEntryPage)))
    expect(html).toContain('<form class="manual-entry-form"')
    expect(html).toContain('aria-label="Meal total"')
    expect(html).toContain('375 kcal')
    expect(html).toContain('1.5 servings · Breakfast')
    expect(html).toContain('Protein 12g · Carbs 60g · Fat 7.5g')
    expect(html).toContain('<button type="submit"')
    expect(html.indexOf('Meal total')).toBeLessThan(html.indexOf('type="submit"'))
    expect(html).toContain('aria-labelledby="manual-meal-type"')
    expect(html).toContain('class="field-req">Required</span>')
    expect(html).toContain('class="manual-macros"')
  })

  it('does not show a misleading zero-calorie total for an empty form', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ManualEntryPage)))
    expect(html).not.toContain('aria-label="Meal total"')
    expect(html).toContain('<button type="submit"')
  })

  it('starts blank even with recent meals, so nothing is logged by accident', () => {
    state.foodEntries = [oats()]
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ManualEntryPage)))
    expect(html).not.toContain('Started from')
    expect(html).not.toContain('value="Oats"')
    expect(html).not.toContain('aria-label="Meal total"')
    expect(html).toContain('<button type="submit"')
  })
})
