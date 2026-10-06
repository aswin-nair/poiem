import { describe, expect, it } from 'vitest'

import { scaleMeal } from './meals'
import type { SavedMeal } from '../types'

const base: SavedMeal = {
  id: 'm1',
  name: 'Greek yogurt bowl',
  emoji: '🥣',
  calories: 240,
  protein: 18,
  carbs: 30,
  fat: 6,
  mealType: 'breakfast',
}

describe('scaleMeal', () => {
  it('returns the same object at 1x so a plain tap logs exactly what was saved', () => {
    expect(scaleMeal(base, 1)).toBe(base)
  })

  it('scales calories and every macro together', () => {
    expect(scaleMeal(base, 2)).toMatchObject({ calories: 480, protein: 36, carbs: 60, fat: 12 })
    expect(scaleMeal(base, 0.5)).toMatchObject({ calories: 120, protein: 9, carbs: 15, fat: 3 })
  })

  it('rounds to whole numbers rather than logging fractions of a gram', () => {
    const scaled = scaleMeal(base, 1.5)
    expect(scaled).toMatchObject({ calories: 360, protein: 27, carbs: 45, fat: 9 })
    for (const v of [scaled.calories, scaled.protein, scaled.carbs, scaled.fat]) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('keeps identity fields untouched', () => {
    const scaled = scaleMeal(base, 2)
    expect(scaled.name).toBe(base.name)
    expect(scaled.emoji).toBe(base.emoji)
  })

  it('scales known portion mass and ingredient details without changing the original saved meal', () => {
    const detailed = { ...base, servingSizeGrams: 180, ingredients: [{ item: 'Yogurt', grams: 180, calories: 240, protein: 18, carbs: 30, fat: 6 }] }
    expect(scaleMeal(detailed, 1.5)).toMatchObject({ servingSizeGrams: 270, ingredients: [{ item: 'Yogurt', grams: 270, calories: 360, protein: 27, carbs: 45, fat: 9 }] })
    expect(detailed.servingSizeGrams).toBe(180)
    expect(detailed.ingredients[0]).toEqual({ item: 'Yogurt', grams: 180, calories: 240, protein: 18, carbs: 30, fat: 6 })
    expect(scaleMeal(base, 2)).not.toHaveProperty('servingSizeGrams')
    expect(scaleMeal(base, 2)).not.toHaveProperty('ingredients')
  })
})
