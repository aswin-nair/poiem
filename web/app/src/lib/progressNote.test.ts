import { describe, expect, it } from 'vitest'
import { progressNote } from './progressNote'

describe('progress note', () => {
  it('points at the nearest outfit or milestone, never both', () => {
    expect(progressNote({ loggedDays: 0, ownedPieceIds: [] })).toEqual({
      kind: 'milestone', text: '0 logged days · next milestone at 1 logged day',
    })
    expect(progressNote({ loggedDays: 3, ownedPieceIds: [] })).toEqual({
      kind: 'outfit', text: '3 logged days · Momo’s Bow unlocks at 5 logged days',
    })
  })

  it('a tie prefers the named outfit', () => {
    expect(progressNote({ loggedDays: 2, ownedPieceIds: [] })).toEqual({
      kind: 'outfit', text: '2 logged days · Momo’s Pencil unlocks at 3 logged days',
    })
  })

  it('starts from the real count, never from zero when days are logged', () => {
    expect(progressNote({ loggedDays: 6, ownedPieceIds: [] })).toEqual({
      kind: 'outfit', text: '6 logged days · Momo’s Scarf unlocks at 7 logged days',
    })
  })

  it('says a single day in the singular', () => {
    expect(progressNote({ loggedDays: 1, ownedPieceIds: [] }).text).toBe('1 logged day · Momo’s Pencil unlocks at 3 logged days')
    expect(progressNote({ loggedDays: 1, ownedPieceIds: ['pencil'] }).text).toBe('1 logged day · next milestone at 3 logged days')
  })

  it('reaches the complete line when everything is passed', () => {
    expect(progressNote({ loggedDays: 120, ownedPieceIds: [] })).toEqual({
      kind: 'complete', text: '120 logged days. Look how far you’ve come.',
    })
  })

  it('ignores pieces that are already owned', () => {
    expect(progressNote({ loggedDays: 2, ownedPieceIds: ['pencil'] })).toEqual({
      kind: 'milestone', text: '2 logged days · next milestone at 3 logged days',
    })
    expect(progressNote({ loggedDays: 3, ownedPieceIds: ['bow', 'scarf'] })).toEqual({
      kind: 'milestone', text: '3 logged days · next milestone at 7 logged days',
    })
  })

  it('does not depend on food or streaks', () => {
    const beforeBreak = { loggedDays: 6, ownedPieceIds: ['pencil'], calories: 600, streak: 6 }
    const afterBreak = { ...beforeBreak, calories: 3000, streak: 0 }
    expect(progressNote(afterBreak)).toEqual(progressNote(beforeBreak))
  })
})
