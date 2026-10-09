import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepeatMealRow } from '../components/RepeatMealRow'
import { freshState } from '../lib/storage'
import { SavedMealsPage } from './SavedMealsPage'

let state = freshState()
vi.mock('../store/AppContext', () => ({
  useApp: () => ({ state, logSavedMeal: vi.fn(), toggleFavorite: vi.fn() }),
  isFavorite: () => false,
}))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: { sub: 'saved-test', name: 'Sam', email: 'sam@example.test' } }),
}))
beforeEach(() => { state = freshState() })

describe('Saved library UI contract', () => {
  it('names all three sort choices and derives usage from journal entries', () => {
    state.favoriteMeals = [{ id: 'oats', name: 'Oats', calories: 320, protein: 10, carbs: 21.4, fat: 7.6, mealType: 'breakfast' }]
    state.foodEntries = [{ ...state.favoriteMeals[0], id: 'log', timestamp: '2026-09-19T12:00:00Z', source: 'manual', mealType: 'snack' }]
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/discover'] }, createElement(SavedMealsPage)))
    expect(html).toContain('for="saved-meal-sort">Sort saved meals</label>')
    expect(html).toContain('<option value="recent" selected="">Recently used</option>')
    expect(html).toContain('<option value="name">Name</option>')
    expect(html).toContain('<option value="most-used">Most used</option>')
    expect(html).toContain('1 matching journal log')
    expect(html).toContain('class="k-repeat-meal is-compact"')
  })

  it('shows externally retained portions and the exact rounded nutrition and destination', () => {
    const meal = { id: 'oats', name: 'Oats', calories: 320, protein: 10, carbs: 21.4, fat: 7.6, mealType: 'breakfast' as const }
    const html = renderToStaticMarkup(createElement(RepeatMealRow, { item: meal, basis: 'saved', mealType: 'snack', onLog: vi.fn(), portionMultiplier: 1.25, onPortionChange: vi.fn() }))
    expect(html).toContain('400 kcal')
    expect(html).toContain('Protein 12.5g · Carbs 26.8g · Fat 9.5g')
    expect(html).toContain('Log Oats, 1.25 times your saved meal to Snack')
    expect(html).toContain('currently 1.25 times your saved meal')
    expect(meal).toMatchObject({ calories: 320, protein: 10, mealType: 'breakfast' })
  })
})
