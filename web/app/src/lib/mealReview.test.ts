import { describe, expect, it } from 'vitest'
import { normalizeServings, resetFoodAnalysisField, scaleFoodAnalysis } from './mealReview'
import { photoFileIssue } from './photoSelection'
import { reviewFoodIssue, validateManualFood } from './foodEntryValidation'
import type { FoodAnalysis } from '../types'

const base: FoodAnalysis = { name: 'Soup', calories: 120, protein: 4, carbs: 15, fat: 5, servingSizeGrams: 200,
  ingredients: [{ item: 'Soup', calories: 120, protein: 4, carbs: 15, fat: 5, grams: 200 }] }

describe('review portion maths', () => {
  it.each([[0, .25], [-1, .25], [.63, .75], [1.5, 1.5], [5000, 1000]])('normalizes %s to %s', (input, output) => {
    expect(normalizeServings(input)).toBe(output)
  })
  it('preserves the previous value for non-finite input', () => {
    expect(normalizeServings(NaN, 2)).toBe(2)
    expect(normalizeServings(Infinity, 3)).toBe(3)
  })
  it('scales nutrition, weight and ingredient lines from the original portion', () => {
    const scaled = scaleFoodAnalysis(base, 1.5)
    expect(scaled).toMatchObject({ calories: 180, protein: 6, carbs: 22.5, fat: 7.5, servingSizeGrams: 300 })
    expect(scaled.ingredients?.[0]).toMatchObject({ grams: 300, calories: 180, carbs: 22.5 })
    expect(base.calories).toBe(120)
    expect(scaleFoodAnalysis(base, 1, scaled)).toEqual(base)
  })
  it('keeps name corrections during portion changes and does not revive a removed breakdown', () => {
    const corrected = { ...base, name: 'Tomato soup', calories: 150, ingredients: undefined }
    const result = scaleFoodAnalysis(corrected, 2)
    expect(result.name).toBe('Tomato soup')
    expect(result.calories).toBe(300)
    expect(result.ingredients).toBeUndefined()
  })
  it('lets validation reject totals that go outside safe entry limits after scaling', () => {
    const scaled = scaleFoodAnalysis(base, 1000)
    expect(reviewFoodIssue(scaled, new Set())).not.toBeNull()
  })
  it('resets only the selected correction to the original estimate at the current portion', () => {
    const correctedBase = { ...base, calories: 110, protein: 7, ingredients: undefined }
    const current = { ...scaleFoodAnalysis(correctedBase, 1.5), name: 'My soup' }
    const reset = resetFoodAnalysisField(base, correctedBase, current, 1.5, 'calories')
    expect(reset.analysis).toMatchObject({ name: 'My soup', calories: 180, protein: 10.5, carbs: 22.5, fat: 7.5 })
    expect(reset.base.calories).toBe(120)
    expect(reset.base.protein).toBe(7)
    expect(reset.analysis.ingredients).toBeUndefined()
    // Further portion changes use that base once, without accumulating rounding.
    const half = scaleFoodAnalysis(reset.base, 0.5, reset.analysis)
    expect(half).toMatchObject({ calories: 60, protein: 3.5 })
    expect(scaleFoodAnalysis(reset.base, 1.5, half)).toEqual(reset.analysis)
    expect(base.ingredients).toHaveLength(1)
  })
  it.each(['-1', 'NaN', 'Infinity', '100001', ''])('rejects invalid edited calories %s', calories => {
    expect(validateManualFood({ name: 'Soup', calories, protein: '4', carbs: '15', fat: '5', servings: 1 }).ok).toBe(false)
  })
})

describe('local photo selection', () => {
  it('accepts images up to the stated limit', () => {
    expect(photoFileIssue({ type: 'image/jpeg', size: 15 * 1024 * 1024 })).toBeNull()
    expect(photoFileIssue({ type: 'image/png', size: 1234 })).toBeNull()
  })
  it('explains unsupported, empty and oversized files before upload', () => {
    expect(photoFileIssue({ type: 'application/pdf', size: 2048 })).toContain('Choose an image')
    expect(photoFileIssue({ type: 'image/jpeg', size: 0 })).toContain('empty')
    expect(photoFileIssue({ type: 'image/jpeg', size: 15 * 1024 * 1024 + 1 })).toContain('15 MB')
  })
})
