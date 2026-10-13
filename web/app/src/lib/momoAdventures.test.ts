import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOMO_ADVENTURES, adventureStorageKey, clearAdventureCollection, collectAdventure,
  emptyAdventureCollection, pinAdventure, readAdventureCollection, sanitizeAdventureCollection,
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
      expect(item.shelfQuip.length).toBeGreaterThan(20)
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

describe('sticker shelf', () => {
  it('keeps existing v1 collections compatible and accepts only an earned known pin', () => {
    const old = { version: 1, choices: { color: 'bright' } }
    expect(sanitizeAdventureCollection(old)).toEqual(old)
    expect(sanitizeAdventureCollection({ ...old, pinned: 'color' })).toEqual({ ...old, pinned: 'color' })
    for (const pinned of ['texture', 'unknown', null, 1, {}, '__proto__']) {
      expect(sanitizeAdventureCollection({ ...old, pinned })).toEqual(old)
    }
    expect(sanitizeAdventureCollection({ version: 1, choices: { color: 'wrong' }, pinned: 'color' }))
      .toEqual(emptyAdventureCollection())
  })
  it('pins, switches, and unpins a single sticker without changing answers', () => {
    collectAdventure('a', emptyAdventureCollection(), 'color', 'bright')
    const earned = collectAdventure('a', emptyAdventureCollection(), 'texture', 'crunchy').collection
    const first = pinAdventure('a', earned, 'color')
    expect(first).toEqual({ collection: { ...earned, pinned: 'color' }, saved: true, available: true })
    expect(readAdventureCollection('a').pinned).toBe('color')
    const switched = pinAdventure('a', first.collection, 'texture')
    expect(switched.collection).toEqual({ ...earned, pinned: 'texture' })
    const unpinned = pinAdventure('a', switched.collection, null)
    expect(unpinned).toEqual({ collection: earned, saved: true, available: true })
    expect(readAdventureCollection('a')).toEqual(earned)
  })
  it('keeps pins separate by account and does not save for a missing account', () => {
    const a = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    collectAdventure('b', emptyAdventureCollection(), 'pause', 'look')
    pinAdventure('a', a, 'color')
    expect(readAdventureCollection('a').pinned).toBe('color')
    expect(readAdventureCollection('b')).toEqual({ version: 1, choices: { pause: 'look' } })
    expect(pinAdventure('b', a, 'color').available).toBe(false)
    expect(pinAdventure('', a, 'color')).toMatchObject({ saved: false, available: false })
    expect(rows.has(adventureStorageKey(''))).toBe(false)
  })
  it('clears the selected account’s shelf and stickers while preserving another account’s pin', () => {
    const a = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const b = collectAdventure('b', emptyAdventureCollection(), 'pause', 'look').collection
    pinAdventure('a', a, 'color')
    const otherAccount = pinAdventure('b', b, 'pause').collection
    clearAdventureCollection('a')
    expect(rows.has(adventureStorageKey('a'))).toBe(false)
    expect(readAdventureCollection('a')).toEqual(emptyAdventureCollection())
    expect(readAdventureCollection('b')).toEqual(otherAccount)
  })
  it('rejects unearned stickers without a write and preserves the latest existing pin', () => {
    const a = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const pinned = pinAdventure('a', a, 'color').collection
    const write = vi.spyOn(localStorage, 'setItem')
    expect(pinAdventure('a', emptyAdventureCollection(), 'texture'))
      .toEqual({ collection: pinned, saved: false, available: false })
    expect(write).not.toHaveBeenCalled()
  })
  it('does not grant ownership from an invalid pending answer', () => {
    const write = vi.spyOn(localStorage, 'setItem')
    expect(pinAdventure('a', emptyAdventureCollection(), 'color', { color: 'invalid' }))
      .toEqual({ collection: emptyAdventureCollection(), saved: false, available: false })
    expect(write).not.toHaveBeenCalled()
  })
  it('preserves discoveries made in another tab while pinning from a stale view', () => {
    const stale = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    collectAdventure('a', stale, 'texture', 'creamy')
    const pin = pinAdventure('a', stale, 'color')
    expect(pin.collection).toEqual({ version: 1, choices: { color: 'bright', texture: 'creamy' }, pinned: 'color' })
    expect(readAdventureCollection('a')).toEqual(pin.collection)
  })
  it('collecting preserves a newer pin or unpin from another tab', () => {
    const first = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const second = collectAdventure('a', first, 'texture', 'creamy').collection
    const stale = pinAdventure('a', second, 'color').collection
    pinAdventure('a', stale, 'texture')
    const collected = collectAdventure('a', stale, 'comfort', 'ritual')
    expect(collected.collection.pinned).toBe('texture')
    pinAdventure('a', collected.collection, null)
    const afterUnpin = collectAdventure('a', stale, 'pause', 'look')
    expect(afterUnpin.collection.pinned).toBeUndefined()
    expect(afterUnpin.collection.choices).toEqual({ color: 'bright', texture: 'creamy', comfort: 'ritual', pause: 'look' })
  })
  it('retains a failed pin in memory and saves it with the next discovery when explicitly pending', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('full') })
    const failed = pinAdventure('a', earned, 'color')
    expect(failed).toEqual({ collection: { ...earned, pinned: 'color' }, saved: false, available: true })
    expect(readAdventureCollection('a').pinned).toBeUndefined()
    write.mockRestore()
    const recovered = collectAdventure('a', failed.collection, 'pause', 'look', {}, 'color')
    expect(recovered.saved).toBe(true)
    expect(recovered.collection).toEqual({ version: 1, choices: { color: 'bright', pause: 'look' }, pinned: 'color' })
    expect(readAdventureCollection('a')).toEqual(recovered.collection)
  })
  it('retains a failed unpin in memory and carries its explicit null through a later save', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const pinned = pinAdventure('a', earned, 'color').collection
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('full') })
    const failed = pinAdventure('a', pinned, null)
    expect(failed).toEqual({ collection: earned, saved: false, available: true })
    expect(readAdventureCollection('a').pinned).toBe('color')
    write.mockRestore()
    const recovered = collectAdventure('a', failed.collection, 'pause', 'look', {}, null)
    expect(recovered.saved).toBe(true)
    expect(recovered.collection.pinned).toBeUndefined()
    expect(readAdventureCollection('a')).toEqual(recovered.collection)
  })
  it('can pin an explicitly unsaved discovery and persist it after storage recovers', () => {
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('full') })
    const discovery = collectAdventure('a', emptyAdventureCollection(), 'color', 'green')
    const failed = pinAdventure('a', discovery.collection, 'color', { color: 'green' })
    expect(failed).toEqual({ collection: { version: 1, choices: { color: 'green' }, pinned: 'color' }, saved: false, available: true })
    write.mockRestore()
    const recovered = pinAdventure('a', failed.collection, 'color', { color: 'green' })
    expect(recovered.saved).toBe(true)
    expect(readAdventureCollection('a')).toEqual(failed.collection)
  })
  it('rejects a cleared sticker from a stale view without restoring its choices or pin', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const stale = pinAdventure('a', earned, 'color').collection
    clearAdventureCollection('a')
    const write = vi.spyOn(localStorage, 'setItem')
    expect(pinAdventure('a', stale, 'color')).toEqual({ collection: emptyAdventureCollection(), saved: false, available: false })
    expect(write).not.toHaveBeenCalled()
    expect(rows.has(adventureStorageKey('a'))).toBe(false)
    const collected = collectAdventure('a', stale, 'pause', 'look', {}, 'color')
    expect(collected.collection).toEqual({ version: 1, choices: { pause: 'look' } })
  })
  it('unpinning after a clear does not restore stale saved discoveries', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const stale = pinAdventure('a', earned, 'color').collection
    clearAdventureCollection('a')
    const unpinned = pinAdventure('a', stale, null, { pause: 'look' })
    expect(unpinned).toEqual({ collection: { version: 1, choices: { pause: 'look' } }, saved: true, available: true })
    expect(readAdventureCollection('a')).toEqual(unpinned.collection)
  })
  it('only falls back to the current pin and discoveries while reads are inaccessible', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const current = pinAdventure('a', earned, 'color').collection
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw Error('blocked') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw Error('blocked') })
    expect(pinAdventure('a', current, 'color')).toEqual({ collection: current, saved: false, available: true })
    expect(pinAdventure('a', current, null)).toEqual({ collection: earned, saved: false, available: true })
    expect(collectAdventure('a', current, 'pause', 'look').collection.pinned).toBe('color')
  })
  it('treats readable corrupt storage as empty rather than restoring an old pin', () => {
    const earned = collectAdventure('a', emptyAdventureCollection(), 'color', 'bright').collection
    const stale = pinAdventure('a', earned, 'color').collection
    rows.set(adventureStorageKey('a'), '{corrupt')
    expect(pinAdventure('a', stale, 'color')).toEqual({ collection: emptyAdventureCollection(), saved: false, available: false })
  })
})
