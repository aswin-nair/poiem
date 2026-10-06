import { describe, expect, it } from 'vitest'

import type { FoodAnalysis } from '../types'
import { manualFoodFieldErrors, reviewFoodFieldErrors, reviewFoodIssue, validateManualFood } from './foodEntryValidation'

const analysis: FoodAnalysis = {
  name: 'Toast', calories: 180, protein: 6, carbs: 30, fat: 4, servingSizeGrams: 70,
}

describe('food entry validation', () => {
  it('normalizes valid manual values after applying servings', () => {
    expect(validateManualFood({
      name: ' Soup ', calories: '120.4', protein: '3', carbs: '', fat: '2', servings: 1.5,
    })).toEqual({
      ok: true,
      value: { name: 'Soup', calories: 181, protein: 4.5, carbs: 0, fat: 3 },
    })
  })

  it.each([
    { name: 'Soup', calories: '-1', protein: '', carbs: '', fat: '', servings: 1 },
    { name: 'Soup', calories: 'Infinity', protein: '', carbs: '', fat: '', servings: 1 },
    { name: 'Soup', calories: '100000', protein: '', carbs: '', fat: '', servings: 2 },
    { name: 'Soup', calories: '100', protein: '', carbs: '', fat: '', servings: Number.NaN },
  ])('rejects unsafe manual input %#', input => {
    expect(validateManualFood(input).ok).toBe(false)
  })

  it('rejects blank and non-finite review values', () => {
    expect(reviewFoodIssue(analysis, new Set(['calories']))).toMatch(/numeric/i)
    expect(reviewFoodIssue({ ...analysis, fat: Number.NaN }, new Set())).toMatch(/finite/i)
  })

  it('identifies negative, missing and portion-scaled values at their fields', () => {
    const errors = manualFoodFieldErrors({ name: '', calories: '60000', protein: '-1', carbs: '', fat: '', servings: 2 })
    expect(errors.name).toMatch(/food name/i)
    expect(errors.calories).toMatch(/total calories/i)
    expect(errors.protein).toMatch(/Protein must be between/i)
    expect(errors.carbs).toBeUndefined()
    expect(errors.fat).toBeUndefined()
    expect(manualFoodFieldErrors({ name: 'Soup', calories: '', protein: '', carbs: '', fat: '', servings: 1 }).calories).toMatch(/required/i)
  })

  it('assigns separate review errors to each empty or unsafe nutrition value', () => {
    expect(reviewFoodFieldErrors({ ...analysis, fat: Number.NaN, carbs: -1 }, new Set(['protein']))).toEqual({
      protein: 'Enter a numeric value for protein.',
      carbs: 'Carbs must be between 0 and 10,000.',
      fat: 'Fat must be between 0 and 10,000.',
    })
  })

  it('uses the same rounded total limit as the accepted manual value', () => {
    const input = { name: 'Soup', calories: '99999.6', protein: '', carbs: '', fat: '', servings: 1 }
    expect(validateManualFood(input).ok).toBe(true)
    expect(manualFoodFieldErrors(input)).toEqual({})
  })
})
