import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { filterMealLibrary } from '../lib/mealLibrary'
import { SavedMealsPage } from './SavedMealsPage'
import { ProgressPage } from './ProgressPage'
import { WeightLogSheet } from '../components/WeightLogSheet'

let state = freshState()
vi.mock('../store/AppContext', () => ({
  useApp: () => ({ state, logSavedMeal: vi.fn(), toggleFavorite: vi.fn(), addWeightEntry: vi.fn(), deleteWeightEntry: vi.fn() }),
  isFavorite: () => false,
}))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: { sub: 'insights-test', name: 'Sam', email: 'sam@example.test' } }),
}))
const savedHtml = () => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/discover'] }, createElement(SavedMealsPage)))
const insightsHtml = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ProgressPage)))
beforeEach(() => { state = freshState() })

describe('meal-library filters', () => {
  const meals = [{ name: 'Rice bowl', mealType: 'lunch' }, { name: 'Rice pudding', mealType: 'snack' }]
  it('combines trimmed case-insensitive search with meal type', () => {
    expect(filterMealLibrary(meals, ' RICE ', 'lunch')).toEqual([meals[0]])
    expect(filterMealLibrary(meals, 'rice', 'all')).toEqual(meals)
    expect(filterMealLibrary(meals, '', 'snack')).toEqual([meals[1]])
  })
  it('restores the complete list when both filters are cleared without mutating it', () => {
    expect(filterMealLibrary(meals, 'nothing', 'all')).toEqual([])
    expect(filterMealLibrary(meals, '', 'all')).toEqual(meals)
    expect(meals).toHaveLength(2)
  })
})

describe('Saved UI', () => {
  it('labels search and gives an empty library a useful action', () => {
    const html = savedHtml()
    expect(html).toContain('for="saved-meal-search"')
    expect(html).toContain('<header class="page-heading">')
    expect(html).toContain('Find a saved or recent meal')
    expect(html).toContain('href="/log"')
    expect(html).toContain('role="group" aria-label="Filter saved meals by type"')
    expect(html).toContain('Your logged meals will appear here')
    expect(html).toContain('Your saved meals')
    expect(html).not.toContain('Pinned')
    expect(html).not.toContain('favourites')
    expect(html).toContain('class="app-shell k-app k-screen has-nav k-saved"')
    expect(html).not.toContain('poster-')
    expect(html).toContain('0 saved · 0 recent in your collection')
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"')
    expect(html).not.toContain('🕐')
  })
  it('names every meal action and shows nutrition before logging', () => {
    state.favoriteMeals = [{ id: 'rice', name: 'Rice bowl', calories: 320, protein: 8, carbs: 60, fat: 5, mealType: 'lunch', servingSizeGrams: 180 }]
    state.foodEntries = [{ ...state.favoriteMeals[0], id: 'recent', name: 'Oats', timestamp: new Date().toISOString(), source: 'manual' }]
    const html = savedHtml()
    expect(html).toContain('<article class="k-repeat-meal" aria-label="Rice bowl"')
    expect(html).toContain('1× = your saved meal · 180 g')
    expect(html).toContain('1× = your previous meal · 180 g')
    expect(html).toContain('Protein 8g · Carbs 60g · Fat 5g')
    expect(html).toContain('aria-label="Log Rice bowl, 1 times your saved meal to')
    expect(html).toContain('aria-label="Adjust portion for Rice bowl, currently 1 times your saved meal" aria-expanded="false"')
    expect(html).toContain('aria-label="Log Oats, 1 times your previous meal to')
    expect(html).toContain('aria-label="Adjust portion for Oats, currently 1 times your previous meal" aria-expanded="false"')
    expect(html.match(/>1× · Portion<\/button>/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Remove Rice bowl from Saved" aria-pressed="true"')
    expect(html).toContain('aria-label="Save Oats" aria-pressed="false"')
  })
  it('shows the explicit logging slot independently of the saved meal’s original type', () => {
    state.favoriteMeals = [{ id: 'oats', name: 'Oats', calories: 250, protein: 8, carbs: 40, fat: 5, mealType: 'breakfast' }]
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [{ pathname: '/log/saved', state: { mealType: 'snack' } }] }, createElement(SavedMealsPage)))
    expect(html).toContain('<option value="snack" selected="">Snack</option>')
    expect(html).toContain('Logging to Snack · Today')
    expect(html).toContain('aria-label="Log Oats, 1 times your saved meal to Snack"')
    expect(state.favoriteMeals[0].mealType).toBe('breakfast')
  })
})

describe('Insights UI', () => {
  it('scopes the chart selector separately from monthly consistency', () => {
    const html = insightsHtml()
    expect(html.indexOf('Consistency')).toBeLessThan(html.indexOf('Weight and calorie chart range'))
    expect(html).toContain('role="group" aria-label="Chart time range"')
    expect(html).toContain('aria-pressed="true">Week</button>')
    expect(html).toContain('Last 7 days · Applies to the two charts below.')
    expect(html).toContain('role="status" aria-live="polite"')
    expect(html).toContain('All time')
    expect(html).toContain('class="progress-card consistency-card"')
    expect(html).toContain('class="insights-more"')
    expect(html).toContain('Ticket archive')
    expect(html).toContain('Your first badge starts with your first log.')
  })
  it('does not present profile defaults as observed averages or changes', () => {
    const html = insightsHtml()
    expect(html).toContain('Profile weight')
    expect(html).toContain('No weigh-ins in this range')
    expect(html).toContain('No weight entries in this range. Use Log weight if you’d like to track this.')
    expect(html).not.toContain('Net change')
    expect(html).not.toContain('>Average</span>')
    expect(html).not.toContain('Not set')
    expect(html).not.toContain('Needs two weigh-ins')
    expect(html).not.toContain('+0.0 kg')
    expect(html).toContain('No logged days')
    expect(html).not.toContain('Avg 0 kcal')
  })
  it('labels real observations and exposes a collapsible weight history', () => {
    state.weightEntries = [{ id: 'w1', date: new Date().toISOString(), weightKg: 72.5 }]
    state.foodEntries = [{ id: 'f1', name: 'Oats', calories: 320, protein: 8, carbs: 60, fat: 5, mealType: 'breakfast', timestamp: new Date().toISOString(), source: 'manual' }]
    const html = insightsHtml()
    expect(html).toContain('First weigh-in in range')
    expect(html).toContain('72.5 kg')
    expect(html).toContain('A trend appears after two weigh-ins in this range.')
    expect(html).not.toContain('Latest in range')
    expect(html).not.toContain('Net change')
    expect(html).not.toContain('>Average</span>')
    expect(html).toContain('aria-expanded="false" aria-controls="weight-history"')
    expect(html).toContain('id="weight-history" hidden=""')
    expect(html).toContain('Average uses logged days only')
    expect(html).toContain('Avg 320 kcal')
  })
  it('shows change and average only after two observations and keeps a chosen goal', () => {
    const first = new Date()
    first.setDate(first.getDate() - 1)
    state.weightEntries = [
      { id: 'w1', date: first.toISOString(), weightKg: 73 },
      { id: 'w2', date: new Date().toISOString(), weightKg: 72.5 },
    ]
    state.profile.goalWeightKg = 70
    const html = insightsHtml()
    expect(html).toContain('Latest in range')
    expect(html).toContain('Net change')
    expect(html).toContain('-0.5 kg')
    expect(html).toContain('>Average</span>')
    expect(html).toContain('72.8 kg')
    expect(html).toContain('2 weigh-ins in range')
    expect(html).toContain('70.0 kg')
    expect(html).not.toContain('A trend appears after two weigh-ins')
  })
  it('makes every archived day a named journal link and explains XP and freezes', () => {
    state.foodEntries = [{ id: 'f1', name: 'Archived oats', calories: 320, protein: 8, carbs: 60, fat: 5, mealType: 'breakfast', timestamp: '2026-09-18T12:00:00.000Z', source: 'manual' }]
    const html = insightsHtml()
    expect(html).toMatch(/<a class="torn-stub" aria-label="Open journal for [^"]+" href="\/"/)
    expect(html).toContain('About XP and freezes')
    expect(html).toContain('A freeze protects your streak on a missed day; it doesn’t count as a logged day.')
  })
  it('keeps progress data hidden during a tracking pause', () => {
    state.profile.trackingPaused = true
    const html = insightsHtml()
    expect(html).toContain('Tracking is paused')
    expect(html).not.toContain('Chart time range')
    expect(html).not.toContain('Profile weight')
  })
  it('uses a named dialog with a native submit form for weight entry', () => {
    const html = renderToStaticMarkup(createElement(WeightLogSheet, { initialWeight: 72.5, onSave: vi.fn(), onClose: vi.fn() }))
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="weight-log-title"')
    expect(html).toContain('<form noValidate=""')
    expect(html).toContain('inputMode="decimal"')
    expect(html).toContain('aria-describedby="weight-log-hint"')
    expect(html).toContain('value="72.5"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('Cancel')
  })
})
