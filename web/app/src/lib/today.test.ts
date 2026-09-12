import { describe, expect, it } from 'vitest'
import type { FoodEntry } from '../types'
import { calorieBudget, groupEntriesByMeal, macroBudget } from './today'

function entry(id: string, mealType: FoodEntry['mealType'], calories: number, time: string): FoodEntry {
  return { id, name: id, calories, protein: 0, carbs: 0, fat: 0, mealType, source: 'manual', timestamp: `2026-09-12T${time}:00.000Z` }
}

describe('Today meal groups', () => {
  it('keeps the four core meals in order and sorts each by time', () => {
    const groups = groupEntriesByMeal([
      entry('late lunch', 'lunch', 300, '13:30'),
      entry('oats', 'breakfast', 340, '08:00'),
      entry('early lunch', 'lunch', 200, '12:00'),
    ])
    expect(groups.map(group => group.type)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    expect(groups[1].entries.map(item => item.id)).toEqual(['early lunch', 'late lunch'])
    expect(groups[1].calories).toBe(500)
    expect(groups[2]).toMatchObject({ label: 'Dinner', entries: [], calories: 0 })
  })

  it('adds Other only when something is filed there, including unknown legacy types', () => {
    expect(groupEntriesByMeal([]).some(group => group.type === 'other')).toBe(false)
    const legacy = { ...entry('mystery', 'other', 90, '10:00'), mealType: 'brunch' as FoodEntry['mealType'] }
    const other = groupEntriesByMeal([legacy]).find(group => group.type === 'other')
    expect(other?.entries).toHaveLength(1)
  })
})

describe('calorie and macro budgets', () => {
  it('reports what is left, or how far over, without negative numbers', () => {
    expect(calorieBudget(1540.4, 2416)).toEqual({ consumed: 1540, target: 2416, remaining: 876, over: 0, progress: 1540 / 2416 })
    expect(calorieBudget(2600, 2400)).toMatchObject({ remaining: 0, over: 200, progress: 1 })
    expect(calorieBudget(300, 0)).toMatchObject({ remaining: 0, over: 300, progress: 0 })
  })

  it('marks a macro over its goal only when there is a goal', () => {
    expect(macroBudget(54, 42)).toEqual({ current: 54, goal: 42, progress: 1, over: true })
    expect(macroBudget(72, 112)).toMatchObject({ over: false, progress: 72 / 112 })
    expect(macroBudget(10, 0)).toMatchObject({ over: false, progress: 0 })
  })
})
