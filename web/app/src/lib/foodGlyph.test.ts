import { describe, expect, it } from 'vitest'
import { foodGlyphFor, foodToneFor } from './foodGlyph'

describe('food tile tones', () => {
  it('groups foods into a few friendly colours', () => {
    expect(foodToneFor('Large oat milk latte')).toBe('sky')
    expect(foodToneFor('Avocado toast')).toBe('butter')
    expect(foodToneFor('Chicken rice bowl')).toBe('peach')
    expect(foodToneFor('Overnight oats')).toBe('mint')
    expect(foodToneFor('Chocolate chip cookie')).toBe('pink')
    expect(foodToneFor('Quick add')).toBe('plain')
  })
})

describe('food glyphs', () => {
  it('recognises common meals, choosing the specific food over the broad one', () => {
    expect(foodGlyphFor('Chocolate chip cookie')).toBe('cookie')
    expect(foodGlyphFor('Avocado toast')).toBe('bread')
    expect(foodGlyphFor('Chicken rice bowl')).toBe('chicken')
    expect(foodGlyphFor('Overnight oats')).toBe('soup')
    expect(foodGlyphFor('Greek yogurt with berries')).toBe('milk')
    expect(foodGlyphFor('Large oat milk latte')).toBe('coffee')
    expect(foodGlyphFor('Veggie pizza')).toBe('pizza')
    expect(foodGlyphFor('Salmon sushi')).toBe('fish')
  })

  it('falls back to the neutral meal icon', () => {
    expect(foodGlyphFor('Quick add')).toBe('meal')
    expect(foodGlyphFor('')).toBe('meal')
    expect(foodGlyphFor(undefined)).toBe('meal')
  })

  it('matches whole words, so a name that merely contains a food stays neutral', () => {
    expect(foodGlyphFor('Teacake')).toBe('meal')
    expect(foodGlyphFor('Pineapple chunks')).toBe('meal')
  })
})
