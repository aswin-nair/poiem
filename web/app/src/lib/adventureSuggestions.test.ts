import { describe, expect, it } from 'vitest'
import { suggestAdventure, stickerReaction } from './adventureSuggestions'
import { MOMO_ADVENTURES, type AdventureCollection, type AdventureId } from './momoAdventures'

describe('adventure suggestions', () => {
  it('offers every uncollected challenge before repeating a suggestion', () => {
    let seen: AdventureId[] = []
    const suggestions: AdventureId[] = []
    for (let index = 0; index < MOMO_ADVENTURES.length; index++) {
      const next = suggestAdventure({}, seen)
      seen = next.seen
      suggestions.push(next.adventure.id)
    }
    expect(suggestions).toEqual(MOMO_ADVENTURES.map(adventure => adventure.id))
    expect(suggestAdventure({}, seen).adventure.id).toBe('color')
  })

  it('prioritizes uncollected discoveries and leaves its inputs untouched', () => {
    const choices = Object.freeze({ color: 'bright', texture: 'crunchy' })
    const seen = Object.freeze(['comfort'] as const)
    expect(suggestAdventure(choices, seen).adventure.id).toBe('aroma')
    expect(choices).toEqual({ color: 'bright', texture: 'crunchy' })
    expect(seen).toEqual(['comfort'])
  })

  it('can revisit the whole catalog when all stickers are collected', () => {
    const choices: AdventureCollection['choices'] = Object.fromEntries(
      MOMO_ADVENTURES.map(adventure => [adventure.id, adventure.options[0].id]),
    )
    expect(suggestAdventure(choices, ['color']).adventure.id).toBe('texture')
  })

  it('avoids the current page when starting a fresh cycle if alternatives exist', () => {
    const seen = MOMO_ADVENTURES.map(adventure => adventure.id)
    const next = suggestAdventure({}, seen, 'color')
    expect(next.adventure.id).toBe('texture')
    expect(next.seen).toEqual(['texture'])
  })

  it('keeps the final uncollected discovery available on every rotation', () => {
    const choices: AdventureCollection['choices'] = Object.fromEntries(
      MOMO_ADVENTURES.filter(adventure => adventure.id !== 'pause').map(adventure => [adventure.id, adventure.options[0].id]),
    )
    expect(suggestAdventure(choices, ['pause'], 'pause').adventure.id).toBe('pause')
  })

  it('drops newly collected pages from the current rotation', () => {
    expect(suggestAdventure({ color: 'bright' }, ['color', 'texture']).seen).toEqual(['texture', 'comfort'])
  })
})

describe('sticker reactions', () => {
  it('gives each sticker three distinct authored reactions and neutral alternatives', () => {
    for (const adventure of MOMO_ADVENTURES) {
      for (const showMomo of [true, false]) {
        const lines = [0, 1, 2].map(turn => stickerReaction(adventure.id, turn, showMomo))
        expect(new Set(lines).size).toBe(3)
        expect(lines.every(line => line.length > 15)).toBe(true)
        expect(stickerReaction(adventure.id, 3, showMomo)).toBe(lines[0])
      }
      expect(stickerReaction(adventure.id, 0, false)).not.toBe(stickerReaction(adventure.id, 0, true))
    }
  })

  it('handles invalid counters with the first reaction', () => {
    for (const turn of [-1, Infinity, NaN]) {
      expect(stickerReaction('color', turn, true)).toBe(stickerReaction('color', 0, true))
    }
  })
})
