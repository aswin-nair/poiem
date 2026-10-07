import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppState } from '../types'
import {
  acknowledgeMutation,
  claimNextMutation,
  closeDurableState,
  DURABLE_STATE_SCHEMA_VERSION,
  durableOutboxSummary,
  DurableRecoveryError,
  enqueueDurableMutation,
  loadDurableState,
  migrateLegacyState,
  recordMutationFailure,
  rebaseDurableConflict,
  rebindDurableMutations,
  resolveDurableConflictWithServer,
  saveDurableLocalSnapshot,
} from './durableState'
import { freshState, loadPrivateAIKey, saveState } from './storage'

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

function namedState(name: string, apiKey = ''): AppState {
  const state = freshState()
  state.profile.name = name
  state.aiSettings.apiKey = apiKey
  return state
}

async function enqueue(
  state: AppState,
  now: Date,
  options: { userId?: string; version?: number; destructive?: boolean } = {},
) {
  const userId = options.userId ?? 'user-1'
  return enqueueDurableMutation({
    userId,
    sessionSubject: userId,
    sessionIssuedAt: 1_787_222_400,
    state,
    confirmedVersion: options.version ?? 3,
    destructive: options.destructive,
    now,
  })
}

describe('durable state and outbox', () => {
  beforeEach(async () => {
    await closeDurableState()
    vi.stubGlobal('indexedDB', undefined)
    vi.stubGlobal('localStorage', memoryStorage())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
  })

  afterEach(async () => {
    await closeDurableState()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('persists a validated per-user snapshot without the BYOK secret', async () => {
    await saveDurableLocalSnapshot('user-1', namedState('Asha', 'sk-device-only'))

    const loaded = await loadDurableState('user-1')
    expect(loaded).toMatchObject({
      serverVersion: 0,
      pendingCount: 0,
      origin: 'local',
      storage: 'localStorage',
      state: { profile: { name: 'Asha' } },
    })
    expect(localStorage.getItem('fud-ai-durable-account-user-1')).not.toContain('sk-device-only')
  })

  it('migrates a legacy localStorage snapshot only after the durable write', async () => {
    await saveState('user-1', namedState('Legacy', 'sk-private-legacy'))

    const migrated = await migrateLegacyState('user-1')

    expect(migrated).toMatchObject({ origin: 'legacy', state: { profile: { name: 'Legacy' } } })
    expect(localStorage.getItem('fud-ai-web-state-user-1')).toBeNull()
    expect(await loadPrivateAIKey('user-1')).toBe('sk-private-legacy')
    expect(localStorage.getItem('fud-ai-durable-account-user-1')).not.toContain('sk-private-legacy')
  })

  it('retains the legacy snapshot when the durable migration write fails', async () => {
    await saveState('user-1', namedState('Still recoverable'))
    const originalSetItem = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'fud-ai-durable-account-user-1') throw new Error('quota exceeded')
      originalSetItem(key, value)
    })

    await expect(migrateLegacyState('user-1')).rejects.toThrow('quota exceeded')
    expect(localStorage.getItem('fud-ai-web-state-user-1')).not.toBeNull()
  })

  it('queues ordered, version-reserved mutations with complete recovery metadata', async () => {
    const first = await enqueue(namedState('First', 'sk-never-queue'), new Date('2026-08-20T12:00:00.000Z'))
    const second = await enqueue(namedState('Second'), new Date('2026-08-20T12:00:00.000Z'))

    expect(first).toMatchObject({
      userId: 'user-1',
      sessionSubject: 'user-1',
      sessionIssuedAt: 1_787_222_400,
      baseVersion: 3,
      localDay: '2026-08-20',
      timeZone: 'America/New_York',
      schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
      attempts: 0,
    })
    expect(first?.mutationId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(second?.baseVersion).toBe(4)
    expect(second?.order).toBeGreaterThan(first?.order ?? 0)
    expect(localStorage.getItem('fud-ai-durable-account-user-1')).not.toContain('sk-never-queue')
    await closeDurableState()
    await expect(loadDurableState('user-1')).resolves.toMatchObject({
      pendingCount: 2,
      state: { profile: { name: 'Second' } },
    })
  })

  it('retries the same mutation ID with ordered exponential backoff', async () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    const queued = await enqueue(namedState('Offline'), now)
    const firstClaim = await claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', now.getTime())
    expect(firstClaim).toMatchObject({ kind: 'claimed', mutation: { mutationId: queued?.mutationId } })

    const retryAt = await recordMutationFailure(
      'user-1',
      queued!.mutationId,
      'tab-1',
      'network unavailable',
      now.getTime(),
    )
    expect(retryAt).toBe(now.getTime() + 1_000)
    await expect(claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', retryAt! - 1))
      .resolves.toEqual({ kind: 'wait', retryAt })

    const retryClaim = await claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', retryAt!)
    expect(retryClaim).toMatchObject({
      kind: 'claimed',
      mutation: { mutationId: queued?.mutationId, attempts: 1 },
    })
    await expect(recordMutationFailure(
      'user-1',
      queued!.mutationId,
      'tab-1',
      'still unavailable',
      retryAt!,
    )).resolves.toBe(retryAt! + 2_000)
  })

  it('acknowledges in order while retaining the latest unsynced snapshot', async () => {
    const first = await enqueue(namedState('First'), new Date('2026-08-20T12:00:00.000Z'))
    await enqueue(namedState('Second'), new Date('2026-08-20T12:00:00.001Z'))
    await claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', Date.now())

    await expect(acknowledgeMutation('user-1', first!.mutationId, 'tab-1', 4))
      .resolves.toEqual({ destructive: false, remaining: 1 })
    await expect(loadDurableState('user-1')).resolves.toMatchObject({
      serverVersion: 4,
      pendingCount: 1,
      state: { profile: { name: 'Second' } },
    })
    const secondClaim = await claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', Date.now() + 1)
    expect(secondClaim).toMatchObject({ kind: 'claimed', mutation: { baseVersion: 4 } })
  })

  it('keeps a destructive reset hidden locally until server acknowledgement', async () => {
    await saveDurableLocalSnapshot('user-1', namedState('Keep until confirmed'))
    const destructive = await enqueue(freshState(), new Date(), { version: 0, destructive: true })

    await expect(loadDurableState('user-1')).resolves.toMatchObject({
      state: { profile: { name: 'Keep until confirmed' } },
      pendingCount: 1,
    })
    await expect(enqueue(namedState('Must wait'), new Date()))
      .rejects.toBeInstanceOf(DurableRecoveryError)
    await claimNextMutation('user-1', 'user-1', 1_787_222_400, 'tab-1', Date.now())
    await acknowledgeMutation('user-1', destructive!.mutationId, 'tab-1', 1)
    await expect(loadDurableState('user-1')).resolves.toBeNull()
  })

  it('isolates account queues and refuses a mismatched session claim', async () => {
    await enqueue(namedState('One'), new Date(), { userId: 'user-1' })
    await enqueue(namedState('Two'), new Date(), { userId: 'user-2' })

    await expect(durableOutboxSummary('user-1')).resolves.toEqual({
      count: 1,
      nextAttemptAt: Date.now(),
    })
    await expect(claimNextMutation('user-1', 'user-2', 1_787_222_400, 'tab-1', Date.now())).resolves.toMatchObject({
      kind: 'session-mismatch',
    })
    await expect(loadDurableState('user-2')).resolves.toMatchObject({
      state: { profile: { name: 'Two' } },
    })
  })

  it('requires an explicit same-account rebind for a replacement session', async () => {
    const queued = await enqueue(namedState('Session-bound'), new Date())

    await expect(claimNextMutation('user-1', 'user-1', 1_800_000_000, 'tab-2', Date.now()))
      .resolves.toMatchObject({ kind: 'session-mismatch', mutationId: queued?.mutationId })
    await rebindDurableMutations('user-1', 'user-1', 1_800_000_000)
    await expect(claimNextMutation('user-1', 'user-1', 1_800_000_000, 'tab-2', Date.now()))
      .resolves.toMatchObject({ kind: 'claimed', mutation: { mutationId: queued?.mutationId } })
  })

  it('can explicitly adopt a validated server copy after the device copy is exported', async () => {
    await enqueue(namedState('Device one'), new Date())
    await enqueue(namedState('Device two'), new Date())

    await resolveDurableConflictWithServer('user-1', namedState('Server'), 9)

    await expect(loadDurableState('user-1')).resolves.toMatchObject({
      serverVersion: 9,
      pendingCount: 0,
      state: { profile: { name: 'Server' } },
    })
  })

  it('rebases only the latest device snapshot with a new ID after explicit resolution', async () => {
    const stale = await enqueue(namedState('Stale'), new Date())
    await enqueue(namedState('Latest device'), new Date())

    const rebased = await rebaseDurableConflict({
      userId: 'user-1',
      sessionSubject: 'user-1',
      sessionIssuedAt: 1_800_000_000,
      state: namedState('Latest device'),
      confirmedVersion: 12,
      now: new Date(),
    })

    expect(rebased).toMatchObject({ baseVersion: 12, sessionIssuedAt: 1_800_000_000 })
    expect(rebased.mutationId).not.toBe(stale?.mutationId)
    await expect(loadDurableState('user-1')).resolves.toMatchObject({
      serverVersion: 12,
      pendingCount: 1,
      state: { profile: { name: 'Latest device' } },
    })
  })

  it('isolates a corrupt fallback record instead of returning an empty state', async () => {
    localStorage.setItem('fud-ai-durable-account-user-1', '{not-json')

    await expect(loadDurableState('user-1')).rejects.toBeInstanceOf(DurableRecoveryError)
    expect(localStorage.getItem('fud-ai-durable-account-user-1')).toBeNull()
    expect(localStorage.getItem('fud-ai-durable-recovery-user-1')).toBe('{not-json')
  })
})
