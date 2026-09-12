import { describe, expect, it } from 'vitest'

import { PIECE_ART, momoScene } from './momoArt'
import {
  WARDROBE,
  WARDROBE_SLOTS,
  availablePieceIds,
  claimPieces,
  newPieces,
  normalizeOutfit,
  surpriseOutfit,
  unlockLabel,
  wardrobeProgress,
  wearPiece,
  type WardrobeProgress,
} from './wardrobe'

const NO_FIRSTS = { photoLog: false, note: false, fullWater: false, threeMains: false, savedMeal: false }
const progress = (over: Partial<WardrobeProgress> = {}): WardrobeProgress => ({
  loggedDays: 0, daysSinceStart: 0, firsts: NO_FIRSTS, ...over,
})

describe("Momo's wardrobe", () => {
  it('draws every piece, each in one of five slots', () => {
    expect(WARDROBE).toHaveLength(19)
    expect(new Set(WARDROBE.map(piece => piece.id)).size).toBe(WARDROBE.length)
    for (const piece of WARDROBE) {
      expect(WARDROBE_SLOTS).toContain(piece.slot)
      expect(PIECE_ART[piece.id]?.shapes.length, piece.id).toBeGreaterThan(0)
    }
  })

  it('unlocks by logged days, not streaks, and by trying a feature once', () => {
    expect([...availablePieceIds([], progress({ loggedDays: 6 }))]).toEqual(['blossom', 'pencil', 'bow'])
    expect(availablePieceIds([], progress({ firsts: { ...NO_FIRSTS, photoLog: true } })).has('sunnies')).toBe(true)
    expect(availablePieceIds([], progress({ daysSinceStart: 365 })).has('party-hat')).toBe(true)
    expect(unlockLabel({ kind: 'loggedDays', days: 14 })).toBe('14 logged days')
  })

  it('never takes back a piece someone already owns', () => {
    expect(availablePieceIds(['medal'], progress()).has('medal')).toBe(true)
  })

  it('reads progress from entries, water, notes, saved meals and the start date', () => {
    const result = wardrobeProgress({
      foodEntries: [
        { timestamp: '2026-09-01T08:00:00', source: 'manual' },
        { timestamp: '2026-09-01T12:00:00', source: 'snapFood' },
        { timestamp: '2026-09-02T08:00:00', source: 'manual' },
      ],
      favoriteMeals: [{}],
      gamification: {
        waterByDate: { '2026-09-01': 8 }, notesByDate: { '2026-09-01': 0 },
        awardedKeys: ['enamel-mains-2026-09-01'], startedAt: '2025-09-01T12:00:00.000',
      },
    }, new Date('2026-09-02T12:00:00'))
    expect(result).toEqual({
      loggedDays: 2,
      firsts: { photoLog: true, note: false, fullWater: true, threeMains: true, savedMeal: true },
      daysSinceStart: 366,
    })
  })

  it('wears one piece per slot, swaps within a slot, and takes a piece off again', () => {
    const unlocked = progress({ loggedDays: 30 })
    let ledger = { ownedCosmeticIds: [] as string[], outfit: {} }
    ledger = wearPiece(ledger, 'beanie', unlocked)!
    ledger = wearPiece(ledger, 'scarf', unlocked)!
    ledger = wearPiece(ledger, 'chef-hat', unlocked)!
    expect(ledger.outfit).toEqual({ head: 'chef-hat', neck: 'scarf' })
    expect(ledger.ownedCosmeticIds).toEqual(['beanie', 'scarf', 'chef-hat'])
    expect(wearPiece(ledger, 'chef-hat', unlocked)!.outfit).toEqual({ neck: 'scarf' })
    expect(wearPiece(ledger, 'paper-crown', unlocked)).toBeNull()
  })

  it('moves the one piece worn before slots into its slot and drops unknown pieces', () => {
    expect(normalizeOutfit(undefined, 'chef-hat')).toEqual({ head: 'chef-hat' })
    expect(normalizeOutfit(undefined, null)).toEqual({})
    expect(normalizeOutfit({ head: 'scarf', neck: 'scarf', hand: 'laser' }, 'chef-hat')).toEqual({ neck: 'scarf' })
  })

  it('reveals each newly unlocked piece once', () => {
    const week = progress({ loggedDays: 7 })
    expect(newPieces([], week).map(piece => piece.id)).toEqual(['pencil', 'bow', 'scarf'])
    const claimed = claimPieces({ ownedCosmeticIds: [] as string[] }, ['pencil', 'bow', 'scarf', 'laser'])
    expect(claimed.ownedCosmeticIds).toEqual(['pencil', 'bow', 'scarf'])
    expect(newPieces(claimed.ownedCosmeticIds, week)).toEqual([])
  })

  it('builds surprise looks only from available pieces', () => {
    expect(surpriseOutfit(new Set(['blossom', 'pencil']), () => 0.5)).toEqual({ head: 'blossom', hand: 'pencil' })
    expect(surpriseOutfit(new Set(['blossom']), () => 0.1)).toEqual({})
  })

  it('tucks the steam under hats that cover the knot', () => {
    const steam = (outfit: Record<string, string>) => JSON.stringify(momoScene({ outfit })).includes('momo-steam')
    expect(steam({})).toBe(true)
    expect(steam({ head: 'blossom' })).toBe(true)
    expect(steam({ head: 'beanie' })).toBe(false)
  })

  it('keeps a held piece in a resting right hand, even when he cheers', () => {
    const cheering = { left: 'raised', right: 'raised' } as const
    expect(JSON.stringify(momoScene({ arms: cheering }))).toContain('rotate(38 107 58)')
    const holding = JSON.stringify(momoScene({ arms: cheering, outfit: { hand: 'mug' } }))
    expect(holding).toContain('rotate(-28 99 90)')
    expect(holding).toContain('rotate(-38 13 58)')
  })
})
