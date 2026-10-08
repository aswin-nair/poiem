import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FoodAnalysis } from '../types'
import { createPendingDraftWriter } from './pendingDraftWriter'
import {
  clearLogDraft,
  clearPhotoLogDraft,
  flushLogDraftWrites,
  hydrateLogDrafts,
  hydratePhotoLogDraft,
  isSafeFoodAnalysis,
  loadLogDrafts,
  logDraftClearGeneration,
  logDraftStorageKeys,
  peekPhotoLogDraft,
  resetLogDraftRuntime,
  saveManualLogDraft,
  savePhotoLogDraft,
  saveReviewLogDraft,
  saveTextLogDraft,
} from './logDrafts'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

function memoryIndexedDb(readDelay?: () => Promise<void> | undefined) {
  const tables = new Map<string, Map<string, { userId: string }>>()

  function succeed<T>(result: T, delay?: Promise<void>) {
    const request: {
      result: T
      error: null
      onsuccess: (() => void) | null
      onerror: (() => void) | null
    } = { result, error: null, onsuccess: null, onerror: null }
    queueMicrotask(() => {
      if (delay) void delay.then(() => request.onsuccess?.())
      else request.onsuccess?.()
    })
    return request
  }

  const db = {
    objectStoreNames: {
      contains(name: string) {
        return tables.has(name)
      },
    },
    createObjectStore(name: string) {
      tables.set(name, new Map())
    },
    onversionchange: null as (() => void) | null,
    close() {},
    transaction(storeName: string) {
      const store = tables.get(storeName) ?? new Map()
      tables.set(storeName, store)
      return {
        objectStore() {
          return {
            get(key: string) {
              return succeed(store.get(key), readDelay?.())
            },
            put(value: { userId: string }) {
              store.set(value.userId, value)
              return succeed(undefined)
            },
            delete(key: string) {
              store.delete(key)
              return succeed(undefined)
            },
          }
        },
      }
    },
  }

  return {
    open() {
      const request: {
        result: typeof db
        error: null
        onsuccess: (() => void) | null
        onerror: (() => void) | null
        onupgradeneeded: (() => void) | null
        onblocked: (() => void) | null
      } = {
        result: db,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      }
      queueMicrotask(() => {
        if (!tables.has('drafts')) request.onupgradeneeded?.()
        request.onsuccess?.()
      })
      return request
    },
  }
}

const analysis: FoodAnalysis = {
  name: 'Rice bowl', calories: 520, protein: 21, carbs: 78, fat: 14, servingSizeGrams: 430,
}

describe('food logging drafts', () => {
  beforeEach(async () => {
    await resetLogDraftRuntime()
    vi.stubGlobal('indexedDB', undefined)
    vi.stubGlobal('localStorage', memoryStorage())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
  })

  afterEach(async () => {
    await resetLogDraftRuntime()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps drafts isolated by account and never stores a photo or API key field', () => {
    saveTextLogDraft('person-a', 'oatmeal and berries')
    saveManualLogDraft('person-b', {
      name: 'Soup', calories: '250', protein: '8', carbs: '30', fat: '9', mealType: 'lunch', servings: 1,
    })

    expect(loadLogDrafts('person-a').text?.text).toBe('oatmeal and berries')
    expect(loadLogDrafts('person-a').manual).toBeUndefined()
    expect(JSON.stringify(loadLogDrafts('person-b'))).not.toMatch(/apiKey|base64|photo/i)
  })

  it('restores a validated review draft with its stable source and serving state', () => {
    saveReviewLogDraft('person-a', {
      analysis,
      baseAnalysis: analysis,
      mealType: 'dinner',
      servings: 1.5,
      source: 'textInput',
      emptyNumericFields: ['fat'],
    })

    expect(loadLogDrafts('person-a').review).toMatchObject({
      analysis,
      mealType: 'dinner',
      servings: 1.5,
      source: 'textInput',
      emptyNumericFields: ['fat'],
    })
  })

  it('retains the immutable estimate separately from corrected values and rejects an unsafe original', () => {
    const correctedBase = { ...analysis, calories: 490, protein: 25 }
    const draft = {
      analysis: { ...correctedBase, calories: 735, protein: 37.5 },
      baseAnalysis: correctedBase,
      originalAnalysis: analysis,
      mealType: 'snack' as const,
      servings: 1.5,
      source: 'textInput' as const,
      emptyNumericFields: [],
    }
    expect(saveReviewLogDraft('person-a', draft)).toBe(true)
    const restored = loadLogDrafts('person-a').review
    expect(restored?.originalAnalysis?.calories).toBe(520)
    expect(restored?.baseAnalysis.calories).toBe(490)
    expect(restored?.analysis.calories).toBe(735)
    expect(saveReviewLogDraft('person-a', { ...draft, originalAnalysis: { ...analysis, calories: -1 } })).toBe(false)
    expect(loadLogDrafts('person-a').review?.originalAnalysis?.calories).toBe(520)
  })

  it('quarantines malformed draft data instead of hydrating it', () => {
    const [key, recovery] = logDraftStorageKeys('person-a')
    localStorage.setItem(key, JSON.stringify({ version: 1, review: { analysis: { calories: -1 } } }))

    expect(loadLogDrafts('person-a')).toEqual({ version: 1 })
    expect(localStorage.getItem(key)).toBeNull()
    const stored = JSON.parse(localStorage.getItem(recovery) ?? 'null') as { raw: string; quarantinedAt: string }
    expect(stored.raw).toContain('"calories":-1')
    expect(stored.quarantinedAt).toBe('2026-08-20T12:00:00.000Z')
  })

  it('clears both active and recovery data during an explicit full clear', () => {
    saveTextLogDraft('person-a', 'draft')
    const [, recovery] = logDraftStorageKeys('person-a')
    localStorage.setItem(recovery, 'old-corrupt-data')

    clearLogDraft('person-a')

    expect(logDraftStorageKeys('person-a').map(key => localStorage.getItem(key))).toEqual([null, null])
  })

  it('starts a fresh manual meal without clearing another logging method’s draft', () => {
    saveTextLogDraft('person-a', 'Rice and lentils')
    saveManualLogDraft('person-a', {
      name: 'Soup', calories: '250', protein: '', carbs: '', fat: '', mealType: 'lunch', servings: 1,
    })
    clearLogDraft('person-a', 'manual')
    saveManualLogDraft('person-a', {
      name: '', calories: '', protein: '', carbs: '', fat: '', mealType: 'snack', servings: 1,
    })
    expect(loadLogDrafts('person-a').manual).toBeUndefined()
    expect(loadLogDrafts('person-a').text?.text).toBe('Rice and lentils')
  })

  it('keeps recoverable drafts while a review field is temporarily invalid', () => {
    saveTextLogDraft('person-a', 'Rice and lentils')
    const draft = { analysis, baseAnalysis: analysis, mealType: 'snack' as const, servings: 1,
      source: 'textInput' as const, emptyNumericFields: [] }
    saveReviewLogDraft('person-a', draft)
    expect(saveReviewLogDraft('person-a', { ...draft, analysis: { ...analysis, calories: -1 } })).toBe(false)
    expect(loadLogDrafts('person-a').review?.analysis.calories).toBe(520)
    expect(loadLogDrafts('person-a').text?.text).toBe('Rice and lentils')
  })

  it('expires a section seven days after its last edit', () => {
    saveTextLogDraft('person-a', 'old oats')
    vi.setSystemTime(new Date('2026-08-21T12:00:00.000Z'))
    saveManualLogDraft('person-a', {
      name: 'Soup', calories: '250', protein: '8', carbs: '30', fat: '9', mealType: 'lunch', servings: 1,
    })

    vi.setSystemTime(new Date('2026-08-27T12:00:01.000Z'))

    const drafts = loadLogDrafts('person-a')
    expect(drafts.text).toBeUndefined()
    expect(drafts.manual?.name).toBe('Soup')
  })

  it('expires a quarantined recovery blob after seven days', () => {
    const [, recovery] = logDraftStorageKeys('person-a')
    localStorage.setItem(recovery, JSON.stringify({
      raw: '{old-draft',
      quarantinedAt: '2026-08-13T12:00:00.000Z',
    }))

    expect(loadLogDrafts('person-a')).toEqual({ version: 1 })
    expect(localStorage.getItem(recovery)).toBeNull()
  })

  it.each([
    { ...analysis, calories: Number.NaN },
    { ...analysis, protein: Number.POSITIVE_INFINITY },
    { ...analysis, carbs: -1 },
    { ...analysis, name: '   ' },
  ])('rejects unsafe analysis input %#', candidate => {
    expect(isSafeFoodAnalysis(candidate)).toBe(false)
  })
})

describe('food logging drafts in IndexedDB', () => {
  beforeEach(async () => {
    await resetLogDraftRuntime()
    vi.stubGlobal('indexedDB', memoryIndexedDb())
    vi.stubGlobal('localStorage', memoryStorage())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
  })

  afterEach(async () => {
    await resetLogDraftRuntime()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('promotes a draft to IndexedDB and drops the ordinary storage copy', async () => {
    saveTextLogDraft('person-a', 'oatmeal and berries')
    await flushLogDraftWrites()

    const [key] = logDraftStorageKeys('person-a')
    expect(localStorage.getItem(key)).toBeNull()
    expect(loadLogDrafts('person-a').text?.text).toBe('oatmeal and berries')

    await resetLogDraftRuntime()
    const hydrated = await hydrateLogDrafts('person-a')
    expect(hydrated.text?.text).toBe('oatmeal and berries')
    expect(JSON.stringify(hydrated)).not.toMatch(/apiKey|base64|photo/i)
  })

  it('migrates a leftover localStorage draft into IndexedDB', async () => {
    const [key] = logDraftStorageKeys('person-a')
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      text: { text: 'legacy oats', updatedAt: '2026-08-20T12:00:00.000Z' },
    }))

    const hydrated = await hydrateLogDrafts('person-a')
    expect(hydrated.text?.text).toBe('legacy oats')
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('clears the IndexedDB record during an explicit full clear', async () => {
    saveTextLogDraft('person-a', 'draft')
    await flushLogDraftWrites()
    clearLogDraft('person-a')
    await flushLogDraftWrites()

    await resetLogDraftRuntime()
    expect(await hydrateLogDrafts('person-a')).toEqual({ version: 1 })
  })

  it('does not restore a photo that was replaced or cleared while hydration was in flight', async () => {
    const older = new File([Uint8Array.of(1)], 'old.png', { type: 'image/png', lastModified: 1 })
    const newer = new File([Uint8Array.of(2)], 'new.png', { type: 'image/png', lastModified: 2 })
    savePhotoLogDraft('person-a', older)
    await flushLogDraftWrites()
    await resetLogDraftRuntime()

    const restoring = hydratePhotoLogDraft('person-a')
    savePhotoLogDraft('person-a', newer)
    expect((await restoring)?.name).toBe('new.png')
    expect(peekPhotoLogDraft('person-a')?.name).toBe('new.png')

    await resetLogDraftRuntime()
    const restoringAfterClear = hydratePhotoLogDraft('person-a')
    clearPhotoLogDraft('person-a')
    expect(await restoringAfterClear).toBeNull()
    expect(peekPhotoLogDraft('person-a')).toBeNull()
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    expect(await hydratePhotoLogDraft('person-a')).toBeNull()
  })

  it('shares a pending envelope read for the same account', async () => {
    const first = hydrateLogDrafts('person-a')
    const second = hydrateLogDrafts('person-a')
    expect(second).toBe(first)
    await first
  })

  it('persists early edits after delayed hydration while retaining another method’s draft', async () => {
    let pauseReads = false
    let releaseRead!: () => void
    let notifyRead!: () => void
    const delayedRead = new Promise<void>(resolve => { releaseRead = resolve })
    const reading = new Promise<void>(resolve => { notifyRead = resolve })
    vi.stubGlobal('indexedDB', memoryIndexedDb(() => {
      if (!pauseReads) return undefined
      notifyRead()
      return delayedRead
    }))
    saveTextLogDraft('person-a', 'Rice and lentils')
    saveManualLogDraft('person-a', {
      name: 'Soup', calories: '250', protein: '', carbs: '', fat: '', mealType: 'lunch', servings: 1,
    })
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    pauseReads = true
    const hydrating = hydrateLogDrafts('person-a')
    await reading
    const writer = createPendingDraftWriter<string>(
      draft => saveTextLogDraft('person-a', draft),
      () => logDraftClearGeneration('person-a', 'text'),
    )
    writer.edit('Eggs and toast')
    // No mounted form or React state is needed when the durable read settles.
    const completing = hydrating.finally(() => writer.hydrated())
    releaseRead()
    await completing
    expect(loadLogDrafts('person-a').text?.text).toBe('Eggs and toast')
    expect(loadLogDrafts('person-a').manual?.name).toBe('Soup')
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    const durable = await hydrateLogDrafts('person-a')
    expect(durable.text?.text).toBe('Eggs and toast')
    expect(durable.manual?.name).toBe('Soup')
  })

  it.each(['text', 'all'] as const)('does not restore drafts after a pending durable read is cleared: %s', async section => {
    let pauseReads = false
    let releaseRead!: () => void
    let notifyRead!: () => void
    const delayedRead = new Promise<void>(resolve => { releaseRead = resolve })
    const reading = new Promise<void>(resolve => { notifyRead = resolve })
    vi.stubGlobal('indexedDB', memoryIndexedDb(() => {
      if (!pauseReads) return undefined
      notifyRead()
      return delayedRead
    }))
    saveTextLogDraft('person-a', 'Older description')
    saveManualLogDraft('person-a', {
      name: 'Soup', calories: '250', protein: '', carbs: '', fat: '', mealType: 'lunch', servings: 1,
    })
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    pauseReads = true
    const hydrating = hydrateLogDrafts('person-a')
    await reading
    clearLogDraft('person-a', section === 'all' ? undefined : section)
    releaseRead()
    const hydrated = await hydrating
    expect(hydrated.text).toBeUndefined()
    expect(loadLogDrafts('person-a').text).toBeUndefined()
    if (section === 'text') expect(hydrated.manual?.name).toBe('Soup')
    else expect(hydrated).toEqual({ version: 1 })
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    const durable = await hydrateLogDrafts('person-a')
    expect(durable.text).toBeUndefined()
    if (section === 'text') expect(durable.manual?.name).toBe('Soup')
    else expect(durable).toEqual({ version: 1 })
  })

  it.each(['text', 'manual', 'all'] as const)('invalidates an old pending writer when another route clears during hydration: %s', async section => {
    let pauseReads = false
    let releaseRead!: () => void
    let notifyRead!: () => void
    const delayedRead = new Promise<void>(resolve => { releaseRead = resolve })
    const reading = new Promise<void>(resolve => { notifyRead = resolve })
    vi.stubGlobal('indexedDB', memoryIndexedDb(() => {
      if (!pauseReads) return undefined
      notifyRead()
      return delayedRead
    }))
    saveTextLogDraft('person-a', 'Durable older meal')
    const manual = { name: 'Older soup', calories: '250', protein: '', carbs: '', fat: '', mealType: 'lunch' as const, servings: 1 }
    saveManualLogDraft('person-a', manual)
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    pauseReads = true
    const hydrating = hydrateLogDrafts('person-a')
    await reading
    const oldWriter = createPendingDraftWriter<string>(
      draft => saveTextLogDraft('person-a', draft),
      () => logDraftClearGeneration('person-a', 'text'),
    )
    const oldManualWriter = createPendingDraftWriter<string>(
      name => saveManualLogDraft('person-a', { ...manual, name }),
      () => logDraftClearGeneration('person-a', 'manual'),
    )
    oldWriter.edit('Typed before leaving')
    oldManualWriter.edit('Edited soup before leaving')
    // A different route clears the account or starts a fresh description.
    clearLogDraft('person-a', section === 'all' ? undefined : section)
    releaseRead()
    await hydrating
    oldWriter.hydrated()
    oldManualWriter.hydrated()
    const current = loadLogDrafts('person-a')
    if (section === 'text' || section === 'all') expect(current.text).toBeUndefined()
    else expect(current.text?.text).toBe('Typed before leaving')
    if (section === 'manual' || section === 'all') expect(current.manual).toBeUndefined()
    else expect(current.manual?.name).toBe('Edited soup before leaving')
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    const durable = await hydrateLogDrafts('person-a')
    if (section === 'text' || section === 'all') expect(durable.text).toBeUndefined()
    else expect(durable.text?.text).toBe('Typed before leaving')
    if (section === 'manual' || section === 'all') expect(durable.manual).toBeUndefined()
    else expect(durable.manual?.name).toBe('Edited soup before leaving')
  })

  it('restores an earlier form’s buffered edit when returning before shared hydration finishes', async () => {
    saveTextLogDraft('person-a', 'Older description')
    await flushLogDraftWrites()
    await resetLogDraftRuntime()
    const hydrating = hydrateLogDrafts('person-a')
    const oldWriter = createPendingDraftWriter<string>(
      draft => saveTextLogDraft('person-a', draft),
      () => logDraftClearGeneration('person-a', 'text'),
    )
    oldWriter.edit('Latest description before Back')
    const oldForm = hydrating.then(() => { oldWriter.hydrated() })
    const returnedWriter = createPendingDraftWriter<string>(
      draft => saveTextLogDraft('person-a', draft),
      () => logDraftClearGeneration('person-a', 'text'),
    )
    let restoredText: string | undefined
    const returnedForm = hydrating.then(() => {
      returnedWriter.hydrated()
      restoredText = loadLogDrafts('person-a').text?.text
    })
    await Promise.all([oldForm, returnedForm])
    expect(restoredText).toBe('Latest description before Back')
    expect(loadLogDrafts('person-a').text?.text).toBe(restoredText)
  })

  it('keeps clear generations isolated by account and method without changing them for saves', () => {
    const textBefore = logDraftClearGeneration('person-a', 'text')
    const manualBefore = logDraftClearGeneration('person-a', 'manual')
    const otherBefore = logDraftClearGeneration('person-b', 'text')
    saveTextLogDraft('person-a', 'Description')
    expect(logDraftClearGeneration('person-a', 'text')).toBe(textBefore)
    clearLogDraft('person-a', 'text')
    expect(logDraftClearGeneration('person-a', 'text')).not.toBe(textBefore)
    expect(logDraftClearGeneration('person-a', 'manual')).toBe(manualBefore)
    expect(logDraftClearGeneration('person-b', 'text')).toBe(otherBefore)
    clearLogDraft('person-a')
    expect(logDraftClearGeneration('person-a', 'manual')).not.toBe(manualBefore)
  })
})
