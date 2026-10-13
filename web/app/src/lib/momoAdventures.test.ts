import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOMO_ADVENTURES, adventureStorageKey, clearAdventureCollection, collectAdventure,
  emptyAdventureCollection, readAdventureCollection, sanitizeAdventureCollection,
} from './momoAdventures'

let rows: Map<string, string>
beforeEach(() => {
  rows = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => { rows.set(key, value) },
    removeItem: (key: string) => { rows.delete(key) },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('little adventures', () => {
  it('offers six unique, fully authored challenges with three choices each', () => {
    expect(new Set(MOMO_ADVENTURES.map(item => item.id)).size).toBe(6)
    for (const item of MOMO_ADVENTURES) {
      expect(new Set(item.options.map(option => option.id)).size).toBe(3)
      expect(item.prompt.length).toBeGreaterThan(20)
      expect(item.quip.length).toBeGreaterThan(20)
    }
  })
  it('accepts only known choices from the current version', () => {
    expect(sanitizeAdventureCollection({ version: 1, choices: { color: 'bright', texture: 'wrong', injected: 'secret' } }))
      .toEqual({ version: 1, choices: { color: 'bright' } })
    for (const raw of [null, [], 1, 'text', { version: 2, choices: { color: 'bright' } }, { choices: { color: 'bright' } }]) {
      expect(sanitizeAdventureCollection(raw)).toEqual(emptyAdventureCollection())
    }
  })
  it('keeps account collections separate and survives a reload', () => {
    collectAdventure('account-a', emptyAdventureCollection(), 'color', 'bright')
    expect(readAdventureCollection('account-a').choices).toEqual({ color: 'bright' })
    expect(readAdventureCollection('account-b').choices).toEqual({})
    expect(readAdventureCollection('').choices).toEqual({})
    expect(collectAdventure('', emptyAdventureCollection(), 'color', 'bright').saved).toBe(false)
    expect(rows.size).toBe(1)
  })
  it('replays update a choice without duplicating the sticker', () => {
    const first = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright')
    const replay = collectAdventure('a', first.collection, 'color', 'warm')
    expect(replay.saved).toBe(true)
    expect(replay.collection.choices).toEqual({ color: 'warm' })
  })
  it('retains another tab’s stickers when a stale view collects a new one', () => {
    const stale = emptyAdventureCollection()
    collectAdventure('a', stale, 'color', 'bright')
    const next = collectAdventure('a', stale, 'texture', 'crunchy')
    expect(next.collection.choices).toEqual({ color: 'bright', texture: 'crunchy' })
  })
  it('does not restore cleared stickers when a stale tab collects before its storage event', () => {
    const stale = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    clearAdventureCollection('a')
    const next = collectAdventure('a', stale, 'texture', 'crunchy')
    expect(next.saved).toBe(true)
    expect(next.collection.choices).toEqual({ texture: 'crunchy' })
    expect(readAdventureCollection('a').choices).toEqual({ texture: 'crunchy' })
  })
  it('keeps sequential unsaved discoveries when reads work but writes are blocked', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('full') })
    const first = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright')
    const second = collectAdventure('a', first.collection, 'texture', 'crunchy', { color: 'bright' })
    expect(first.saved).toBe(false)
    expect(second.saved).toBe(false)
    expect(second.collection.choices).toEqual({ color: 'bright', texture: 'crunchy' })
    expect(rows.size).toBe(0)
  })
  it('persists pending discoveries after recovery without restoring cleared saved stickers', () => {
    const original = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('full') })
    const unsaved = collectAdventure('a', original, 'texture', 'crunchy')
    clearAdventureCollection('a')
    write.mockRestore()
    const recovered = collectAdventure('a', unsaved.collection, 'pause', 'look', { texture: 'crunchy' })
    expect(recovered.saved).toBe(true)
    expect(recovered.collection.choices).toEqual({ texture: 'crunchy', pause: 'look' })
    expect(readAdventureCollection('a').choices).toEqual(recovered.collection.choices)
  })
  it('falls back to the current collection only while storage cannot be read', () => {
    const current = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw Error('blocked') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('blocked') })
    const first = collectAdventure('a', current, 'texture', 'crunchy')
    const second = collectAdventure('a', first.collection, 'pause', 'look')
    expect(second.saved).toBe(false)
    expect(second.collection.choices).toEqual({ color: 'bright', texture: 'crunchy', pause: 'look' })
  })
  it('treats readable corrupt storage as empty and accepts only valid pending choices', () => {
    const current = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    rows.set(adventureStorageKey('a'), '{corrupt')
    const next = collectAdventure('a', current, 'pause', 'look', { texture: 'crunchy', color: 'wrong' })
    expect(next.collection.choices).toEqual({ texture: 'crunchy', pause: 'look' })
  })
  it('rejects invalid answers without a write', () => {
    expect(collectAdventure('a', emptyAdventureCollection(), 'color', 'oops').saved).toBe(false)
    expect(rows.size).toBe(0)
  })
  it('recovers from corrupt storage and degrades honestly when writes are blocked', () => {
    rows.set(adventureStorageKey('a'), '{corrupt')
    expect(readAdventureCollection('a')).toEqual(emptyAdventureCollection())
    vi.stubGlobal('localStorage', { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } })
    expect(readAdventureCollection('a')).toEqual(emptyAdventureCollection())
    const result = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright')
    expect(result.saved).toBe(false)
    expect(result.collection.choices).toEqual({ color: 'bright' })
  })
  it('clears only the chosen account and surfaces cleanup failures', () => {
    collectAdventure('a', emptyAdventureCollection(), 'color', 'bright')
    collectAdventure('b', emptyAdventureCollection(), 'pause', 'look')
    clearAdventureCollection('a')
    expect(readAdventureCollection('a').choices).toEqual({})
    expect(readAdventureCollection('b').choices).toEqual({ pause: 'look' })
    vi.stubGlobal('localStorage', { removeItem() { throw Error('blocked') } })
    expect(() => clearAdventureCollection('a')).toThrow('blocked')
  })
})
