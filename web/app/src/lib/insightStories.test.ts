import { describe, expect, it } from 'vitest'
import type { FoodEntry, MealType } from '../types'
import { insightStories } from './insightStories'

let counter = 0
/** A meal at a local time on a local day, the way the app stamps one. */
function meal(name: string, mealType: MealType, month: number, day: number, hour: number, minute = 0): FoodEntry {
  counter += 1
  const at = new Date(2026, month - 1, day, hour, minute)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    id: `s${counter}`,
    name,
    calories: 400,
    protein: 10,
    carbs: 40,
    fat: 10,
    emoji: '🍽',
    source: 'manual',
    mealType,
    timestamp: at.toISOString(),
    localDate: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
  }
}

const OPTIONS = { locale: 'en-GB' }

/** Five logged days: Mon 5 to Fri 9 October 2026, lunch at about 12:40. */
function workWeek(): FoodEntry[] {
  return [5, 6, 7, 8, 9].flatMap((day, index) => [
    meal(['Rice bowl', 'Soup', 'Salad', 'Wrap', 'Pasta'][index], 'lunch', 10, day, 12, [30, 40, 50, 40, 40][index]),
  ])
}

describe('insightStories', () => {
  it('stays quiet until there are five logged days', () => {
    expect(insightStories(workWeek().slice(0, 4), OPTIONS)).toEqual([])
    expect(insightStories([], OPTIONS)).toEqual([])
  })

  it('names the usual time of the slot logged on the most days, at its median', () => {
    const stories = insightStories(workWeek(), OPTIONS)
    expect(stories.find(story => story.id === 'time')?.text).toBe('Lunch is usually around 12:40.')
  })

  it('rounds the usual time to five minutes', () => {
    const entries = [5, 6, 7, 8, 9].map((day, index) => meal(`Soup ${index}`, 'dinner', 10, day, 19, [3, 8, 12, 13, 14][index]))
    expect(insightStories(entries, OPTIONS).find(story => story.id === 'time')?.text).toBe('Dinner is usually around 19:10.')
  })

  it('needs four days in a slot before it claims a usual time', () => {
    const entries = [
      ...[5, 6, 7].map(day => meal('Soup', 'lunch', 10, day, 12, 30)),
      ...[8, 9].map(day => meal('Soup', 'breakfast', 10, day, 8, 0)),
    ]
    expect(insightStories(entries, OPTIONS).some(story => story.id === 'time')).toBe(false)
  })

  it('says which weekday is logged most often, only when one clearly leads', () => {
    // Three Mondays, one Tuesday, one Wednesday, one Thursday.
    const entries = [5, 12, 19, 6, 7, 8].map(day => meal('Toast', 'breakfast', 10, day, 8))
    expect(insightStories(entries, OPTIONS).find(story => story.id === 'weekday')?.text).toBe('You log most often on Mondays.')

    const level = [5, 6, 7, 8, 9].map(day => meal('Toast', 'breakfast', 10, day, 8))
    expect(insightStories(level, OPTIONS).some(story => story.id === 'weekday')).toBe(false)
  })

  it('counts each logged day once, however many meals it held', () => {
    // Monday has four meals on one day; Tuesday and Wednesday and Thursday and Friday have one each.
    const entries = [
      ...[8, 9, 12, 13].map(hour => meal('Snack', 'snack', 10, 5, hour)),
      ...[6, 7, 8, 9].map(day => meal('Toast', 'breakfast', 10, day, 8)),
    ]
    expect(insightStories(entries, OPTIONS).some(story => story.id === 'weekday')).toBe(false)
  })

  it('celebrates variety from eight different foods, ignoring case and spacing', () => {
    const names = ['Oats', 'oats ', 'Toast', 'Soup', 'Salad', 'Wrap', 'Pasta', 'Rice', 'Curry', 'Fish']
    const entries = names.map((name, index) => meal(name, 'lunch', 10, 5 + (index % 7), 12))
    expect(insightStories(entries, OPTIONS).find(story => story.id === 'variety')?.text).toBe('You’ve logged 9 different foods.')
    expect(insightStories(entries.slice(0, 7), OPTIONS).some(story => story.id === 'variety')).toBe(false)
  })

  it('returns at most three lines in a fixed order and never mentions calories or goals', () => {
    const names = ['Oats', 'Toast', 'Soup', 'Salad', 'Wrap', 'Pasta', 'Rice', 'Curry']
    const entries = [5, 12, 19, 6, 7, 8, 9, 13].map((day, index) => meal(names[index], 'lunch', 10, day, 12, 40))
    const stories = insightStories(entries, OPTIONS)
    expect(stories.map(story => story.id)).toEqual(['time', 'weekday', 'variety'])
    for (const story of stories) expect(story.text).not.toMatch(/kcal|calorie|goal|macro|protein|over|under/i)
  })
})
