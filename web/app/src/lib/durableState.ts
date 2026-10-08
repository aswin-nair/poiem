import type { AppState } from '../types'
import { validateAppState } from '../../../shared/appStateContract'
import { localDayKey } from './dates'
import {
  hasStoredState,
  importData,
  loadPrivateAIKey,
  loadState,
  removeStoredStateSnapshot,
  savePrivateAIKey,
  stateWithoutPrivateSecrets,
} from './storage'

export const DURABLE_STATE_SCHEMA_VERSION = 1

const DATABASE_NAME = 'fud-ai-web-durable'
const DATABASE_VERSION = 1
const ACCOUNT_STORE = 'accounts'
const FALLBACK_PREFIX = 'fud-ai-durable-account-'
const RECOVERY_PREFIX = 'fud-ai-durable-recovery-'
const LEASE_MS = 30_000
const MAX_RETRY_MS = 60_000

export interface DurableMutation {
  mutationId: string
  userId: string
  sessionSubject: string
  sessionIssuedAt: number | null
  baseVersion: number
  state: AppState
  destructive: boolean
  createdAt: string
  localDay: string
  timeZone: string
  order: number
  schemaVersion: number
  attempts: number
  nextAttemptAt: number
  leaseOwner?: string
  leaseExpiresAt?: number
  lastError?: string
}

interface DurableAccount {
  userId: string
  state: AppState
  serverVersion: number
  updatedAt: string
  schemaVersion: number
  origin: 'legacy' | 'local' | 'remote' | 'pending'
  outbox: DurableMutation[]
}

export interface DurableHydration {
  state: AppState
  serverVersion: number
  pendingCount: number
  origin: DurableAccount['origin']
  storage: 'indexeddb' | 'localStorage'
  pendingSessions: Array<{ subject: string; issuedAt: number | null }>
  destructivePending: boolean
}

export interface EnqueueMutationInput {
  userId: string
  sessionSubject: string
  sessionIssuedAt: number | null
  state: AppState
  confirmedVersion: number
  destructive?: boolean
  force?: boolean
  now?: Date
}

export interface ConflictRebaseInput extends Omit<EnqueueMutationInput, 'force'> {
  confirmedVersion: number
}

export type ClaimResult =
  | { kind: 'empty' }
  | { kind: 'wait'; retryAt: number }
  | { kind: 'session-mismatch'; mutationId: string }
  | { kind: 'claimed'; mutation: DurableMutation }

export class DurableRecoveryError extends Error {
  constructor(message = 'The saved device copy could not be recovered.') {
    super(message)
    this.name = 'DurableRecoveryError'
  }
}

let databasePromise: Promise<IDBDatabase | null> | null = null

function fallbackKey(userId: string): string {
  return `${FALLBACK_PREFIX}${userId}`
}

function safeState(state: AppState): AppState {
  const safe = stateWithoutPrivateSecrets(state)
  const validation = validateAppState(safe, new Date(), {
    allowLegacyGamification: true,
    allowApiKey: false,
  })
  if (!validation.ok) throw new Error(`Invalid durable state: ${validation.error}`)
  return safe
}

function hydratedState(value: unknown): AppState {
  const validation = validateAppState(value, new Date(), {
    allowLegacyGamification: true,
    allowApiKey: false,
  })
  if (!validation.ok) throw new DurableRecoveryError(validation.error)
  return importData(JSON.stringify(value))
}

function validVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function localTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof zone === 'string' && /^[A-Za-z0-9_+\-/]{1,100}$/.test(zone)) return zone
  } catch { /* use the deterministic fallback below */ }
  return 'UTC'
}

function createMutation(
  input: EnqueueMutationInput,
  state: AppState,
  baseVersion: number,
  order: number,
  now: Date,
): DurableMutation {
  return {
    mutationId: crypto.randomUUID(),
    userId: input.userId,
    sessionSubject: input.sessionSubject,
    sessionIssuedAt: input.sessionIssuedAt,
    baseVersion,
    state,
    destructive: input.destructive === true,
    createdAt: now.toISOString(),
    localDay: localDayKey(now),
    timeZone: localTimeZone(),
    order,
    schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
    attempts: 0,
    nextAttemptAt: now.getTime(),
  }
}

function validMutationMetadata(value: unknown, userId: string): value is DurableMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const mutation = value as Partial<DurableMutation>
  return typeof mutation.mutationId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(mutation.mutationId)
    && mutation.userId === userId
    && mutation.sessionSubject === userId
    && (mutation.sessionIssuedAt === null || Number.isSafeInteger(mutation.sessionIssuedAt))
    && validVersion(mutation.baseVersion)
    && typeof mutation.destructive === 'boolean'
    && typeof mutation.createdAt === 'string'
    && Number.isFinite(Date.parse(mutation.createdAt))
    && typeof mutation.localDay === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(mutation.localDay)
    && typeof mutation.timeZone === 'string'
    && /^[A-Za-z0-9_+\-/]{1,100}$/.test(mutation.timeZone)
    && Number.isSafeInteger(mutation.order)
    && mutation.schemaVersion === DURABLE_STATE_SCHEMA_VERSION
    && Number.isSafeInteger(mutation.attempts)
    && (mutation.attempts as number) >= 0
    && typeof mutation.nextAttemptAt === 'number'
    && Number.isFinite(mutation.nextAttemptAt)
}

function parseAccount(value: unknown, userId: string): DurableAccount {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DurableRecoveryError()
  }
  const account = value as Partial<DurableAccount>
  if (
    account.userId !== userId
    || account.schemaVersion !== DURABLE_STATE_SCHEMA_VERSION
    || !validVersion(account.serverVersion)
    || typeof account.updatedAt !== 'string'
    || !['legacy', 'local', 'remote', 'pending'].includes(account.origin ?? '')
    || !Array.isArray(account.outbox)
    || !account.outbox.every(mutation => validMutationMetadata(mutation, userId))
  ) {
    throw new DurableRecoveryError()
  }

  const state = hydratedState(account.state)
  for (const mutation of account.outbox) hydratedState(mutation.state)
  return {
    ...(account as DurableAccount),
    state: stateWithoutPrivateSecrets(state),
    outbox: [...account.outbox].sort((a, b) => a.order - b.order),
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise
  if (typeof indexedDB === 'undefined') {
    databasePromise = Promise.resolve(null)
    return databasePromise
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ACCOUNT_STORE)) {
        db.createObjectStore(ACCOUNT_STORE, { keyPath: 'userId' })
      }
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
    request.onblocked = () => reject(new Error('IndexedDB upgrade was blocked.'))
  }).catch((): IDBDatabase | null => null)
  databasePromise = promise
  return promise
}

function readFallback(userId: string): DurableAccount | null {
  const raw = localStorage.getItem(fallbackKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as DurableAccount
  } catch {
    try {
      localStorage.setItem(`${RECOVERY_PREFIX}${userId}`, raw)
      localStorage.removeItem(fallbackKey(userId))
    } catch { /* retain the primary when a recovery copy cannot be made */ }
    throw new DurableRecoveryError()
  }
}

function writeFallback(userId: string, account: DurableAccount | null): void {
  if (account) localStorage.setItem(fallbackKey(userId), JSON.stringify(account))
  else localStorage.removeItem(fallbackKey(userId))
}

async function readRawAccount(userId: string): Promise<DurableAccount | null> {
  const db = await openDatabase()
  if (!db) return readFallback(userId)
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNT_STORE, 'readonly')
    const request = transaction.objectStore(ACCOUNT_STORE).get(userId)
    request.onsuccess = () => resolve((request.result as DurableAccount | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('Durable state read failed.'))
  })
}

interface MutationOutcome<T> {
  account: DurableAccount | null
  result: T
}

async function mutateAccount<T>(
  userId: string,
  mutate: (current: DurableAccount | null) => MutationOutcome<T>,
): Promise<T> {
  const db = await openDatabase()
  if (!db) {
    const outcome = mutate(readFallback(userId))
    writeFallback(userId, outcome.account)
    return outcome.result
  }

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(ACCOUNT_STORE, 'readwrite')
    const store = transaction.objectStore(ACCOUNT_STORE)
    const request = store.get(userId)
    let result: T
    let mutationError: unknown

    request.onsuccess = () => {
      try {
        const outcome = mutate((request.result as DurableAccount | undefined) ?? null)
        result = outcome.result
        if (outcome.account) store.put(outcome.account)
        else store.delete(userId)
      } catch (error) {
        mutationError = error
        transaction.abort()
      }
    }
    request.onerror = () => {
      mutationError = request.error
      transaction.abort()
    }
    transaction.oncomplete = () => resolve(result!)
    transaction.onabort = () => reject(mutationError ?? transaction.error ?? new Error('Durable state update failed.'))
    transaction.onerror = () => {
      mutationError ??= transaction.error
    }
  })
}

async function quarantineAndRemove(userId: string, raw: unknown): Promise<void> {
  try {
    localStorage.setItem(`${RECOVERY_PREFIX}${userId}`, JSON.stringify(raw))
  } catch {
    // Never destroy the only copy merely because recovery storage is full.
    throw new DurableRecoveryError('The damaged device copy was retained because it could not be isolated.')
  }
  await mutateAccount(userId, () => ({ account: null, result: undefined }))
}

export async function loadDurableState(userId: string): Promise<DurableHydration | null> {
  const raw = await readRawAccount(userId)
  if (!raw) return null
  try {
    const account = parseAccount(raw, userId)
    return {
      state: {
        ...account.state,
        aiSettings: { ...account.state.aiSettings, apiKey: await loadPrivateAIKey(userId, account.state.aiSettings) },
      },
      serverVersion: account.serverVersion,
      pendingCount: account.outbox.length,
      origin: account.origin,
      storage: await openDatabase() ? 'indexeddb' : 'localStorage',
      pendingSessions: account.outbox.map(mutation => ({
        subject: mutation.sessionSubject,
        issuedAt: mutation.sessionIssuedAt,
      })),
      destructivePending: account.outbox.some(mutation => mutation.destructive),
    }
  } catch (error) {
    await quarantineAndRemove(userId, raw)
    throw error instanceof DurableRecoveryError ? error : new DurableRecoveryError()
  }
}

export async function durableStorageKind(): Promise<'indexeddb' | 'localStorage'> {
  return await openDatabase() ? 'indexeddb' : 'localStorage'
}

export async function migrateLegacyState(userId: string): Promise<DurableHydration | null> {
  if (!hasStoredState(userId)) return null
  const primaryRaw = localStorage.getItem(`fud-ai-web-state-${userId}`)
    ?? localStorage.getItem('fud-ai-web-state')
  const state = loadState(userId)
  const quarantinedRaw = localStorage.getItem(`fud-ai-web-state-${userId}-quarantine`)
  if (primaryRaw && quarantinedRaw === primaryRaw) return null
  if (state.aiSettings.apiKey) await savePrivateAIKey(userId, state.aiSettings.apiKey, state.aiSettings)

  const now = new Date()
  const account: DurableAccount = {
    userId,
    state: safeState(state),
    serverVersion: 0,
    updatedAt: now.toISOString(),
    schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
    origin: 'legacy',
    outbox: [],
  }
  await mutateAccount(userId, current => ({ account: current ?? account, result: undefined }))
  removeStoredStateSnapshot(userId)
  return loadDurableState(userId)
}

export async function saveDurableLocalSnapshot(userId: string, state: AppState): Promise<void> {
  const nextState = safeState(state)
  const now = new Date().toISOString()
  await mutateAccount(userId, current => ({
    account: {
      userId,
      state: nextState,
      serverVersion: current?.serverVersion ?? 0,
      updatedAt: now,
      schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
      origin: 'local',
      outbox: current?.outbox ?? [],
    },
    result: undefined,
  }))
}

export async function replaceDurableFromServer(
  userId: string,
  state: AppState,
  serverVersion: number,
): Promise<void> {
  if (!validVersion(serverVersion)) throw new Error('Invalid server version.')
  const nextState = safeState(state)
  await mutateAccount(userId, current => {
    if (current?.outbox.length) throw new Error('Pending changes must be resolved before replacing the device copy.')
    return {
      account: {
        userId,
        state: nextState,
        serverVersion,
        updatedAt: new Date().toISOString(),
        schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
        origin: 'remote',
        outbox: [],
      },
      result: undefined,
    }
  })
}

export async function enqueueDurableMutation(
  input: EnqueueMutationInput,
): Promise<DurableMutation | null> {
  if (input.sessionSubject !== input.userId) throw new Error('Mutation session does not match the account.')
  if (!validVersion(input.confirmedVersion)) throw new Error('Invalid confirmed version.')
  const nextState = safeState(input.state)
  const now = input.now ?? new Date()

  return mutateAccount(input.userId, current => {
    const outbox = current?.outbox ? [...current.outbox].sort((a, b) => a.order - b.order) : []
    if (!input.destructive && outbox.some(mutation => mutation.destructive)) {
      throw new DurableRecoveryError('Account deletion must be recovered before saving more changes.')
    }
    const currentSafe = current?.state ? safeState(current.state) : null
    if (!input.force && !input.destructive && currentSafe && JSON.stringify(currentSafe) === JSON.stringify(nextState)) {
      return { account: current, result: null }
    }

    const last = outbox.at(-1)
    const baseVersion = last ? last.baseVersion + 1 : Math.max(current?.serverVersion ?? 0, input.confirmedVersion)
    if (!validVersion(baseVersion)) throw new Error('The queued base version is invalid.')
    const order = Math.max(now.getTime(), (last?.order ?? 0) + 1)
    const mutation = createMutation(input, nextState, baseVersion, order, now)
    outbox.push(mutation)

    return {
      account: {
        userId: input.userId,
        // A destructive reset remains hidden until the server confirms it.
        state: input.destructive && current ? current.state : nextState,
        serverVersion: current?.serverVersion ?? input.confirmedVersion,
        updatedAt: now.toISOString(),
        schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
        origin: 'pending',
        outbox,
      },
      result: mutation,
    }
  })
}

/** Explicit user choice: discard pending device mutations and adopt the server snapshot. */
export async function resolveDurableConflictWithServer(
  userId: string,
  state: AppState,
  serverVersion: number,
): Promise<void> {
  if (!validVersion(serverVersion)) throw new Error('Invalid server version.')
  const nextState = safeState(state)
  await mutateAccount(userId, current => ({
    account: {
      userId,
      state: nextState,
      serverVersion,
      updatedAt: new Date().toISOString(),
      schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
      origin: 'remote',
      outbox: [],
    },
    result: current?.outbox.length ?? 0,
  }))
}

/** Explicit user choice: rebase the latest device snapshot onto an observed server version. */
export async function rebaseDurableConflict(
  input: ConflictRebaseInput,
): Promise<DurableMutation> {
  if (input.sessionSubject !== input.userId) throw new Error('Mutation session does not match the account.')
  if (!validVersion(input.confirmedVersion)) throw new Error('Invalid confirmed version.')
  const nextState = safeState(input.state)
  const now = input.now ?? new Date()
  return mutateAccount(input.userId, current => {
    if (!current) throw new DurableRecoveryError('The preserved device copy is unavailable.')
    const order = current.outbox.reduce(
      (latest, mutation) => Math.max(latest, mutation.order + 1),
      now.getTime(),
    )
    const mutation = createMutation(input, nextState, input.confirmedVersion, order, now)
    return {
      account: {
        userId: input.userId,
        state: input.destructive ? current.state : nextState,
        serverVersion: input.confirmedVersion,
        updatedAt: now.toISOString(),
        schemaVersion: DURABLE_STATE_SCHEMA_VERSION,
        origin: 'pending',
        outbox: [mutation],
      },
      result: mutation,
    }
  })
}

export async function claimNextMutation(
  userId: string,
  sessionSubject: string,
  sessionIssuedAt: number | null,
  leaseOwner: string,
  now = Date.now(),
): Promise<ClaimResult> {
  return mutateAccount<ClaimResult>(userId, current => {
    if (!current?.outbox.length) return { account: current, result: { kind: 'empty' } }
    const outbox = [...current.outbox].sort((a, b) => a.order - b.order)
    const first = outbox[0]
    if (
      first.userId !== userId
      || first.sessionSubject !== sessionSubject
      || first.sessionIssuedAt !== sessionIssuedAt
    ) {
      return { account: current, result: { kind: 'session-mismatch', mutationId: first.mutationId } }
    }
    const retryAt = Math.max(first.nextAttemptAt, first.leaseExpiresAt ?? 0)
    if (retryAt > now && first.leaseOwner !== leaseOwner) {
      return { account: current, result: { kind: 'wait', retryAt } }
    }
    if (first.nextAttemptAt > now) {
      return { account: current, result: { kind: 'wait', retryAt: first.nextAttemptAt } }
    }

    const claimed = { ...first, leaseOwner, leaseExpiresAt: now + LEASE_MS }
    outbox[0] = claimed
    return {
      account: { ...current, outbox },
      result: { kind: 'claimed', mutation: claimed },
    }
  })
}

/** Rebind queued work only after the server has authenticated a replacement session. */
export async function rebindDurableMutations(
  userId: string,
  sessionSubject: string,
  sessionIssuedAt: number | null,
): Promise<void> {
  if (sessionSubject !== userId) throw new Error('Replacement session does not match the account.')
  await mutateAccount(userId, current => {
    if (!current) return { account: null, result: undefined }
    if (current.outbox.some(mutation => mutation.userId !== userId || mutation.sessionSubject !== userId)) {
      throw new DurableRecoveryError('Queued changes belong to a different account session.')
    }
    return {
      account: {
        ...current,
        outbox: current.outbox.map(mutation => ({ ...mutation, sessionIssuedAt })),
      },
      result: undefined,
    }
  })
}

export async function recordMutationFailure(
  userId: string,
  mutationId: string,
  leaseOwner: string,
  message: string,
  now = Date.now(),
): Promise<number | null> {
  return mutateAccount<number | null>(userId, current => {
    if (!current) return { account: null, result: null }
    const index = current.outbox.findIndex(item => item.mutationId === mutationId)
    if (index < 0) return { account: current, result: null }
    const mutation = current.outbox[index]
    if (mutation.leaseOwner && mutation.leaseOwner !== leaseOwner) {
      return { account: current, result: mutation.leaseExpiresAt ?? null }
    }
    const attempts = mutation.attempts + 1
    const retryDelay = Math.min(1_000 * (2 ** Math.min(attempts - 1, 16)), MAX_RETRY_MS)
    const nextAttemptAt = now + retryDelay
    const outbox = [...current.outbox]
    outbox[index] = {
      ...mutation,
      attempts,
      nextAttemptAt,
      lastError: message.slice(0, 500),
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    }
    return { account: { ...current, outbox }, result: nextAttemptAt }
  })
}

export async function acknowledgeMutation(
  userId: string,
  mutationId: string,
  leaseOwner: string,
  serverVersion: number,
): Promise<{ destructive: boolean; remaining: number }> {
  if (!validVersion(serverVersion)) throw new Error('Invalid acknowledged version.')
  return mutateAccount<{ destructive: boolean; remaining: number }>(userId, current => {
    if (!current) return { account: null, result: { destructive: false, remaining: 0 } }
    const index = current.outbox.findIndex(item => item.mutationId === mutationId)
    if (index < 0) {
      return { account: current, result: { destructive: false, remaining: current.outbox.length } }
    }
    const mutation = current.outbox[index]
    if (mutation.leaseOwner !== leaseOwner) throw new Error('Mutation acknowledgement does not own the lease.')
    if (serverVersion <= mutation.baseVersion) throw new Error('Mutation acknowledgement did not advance the version.')
    if (mutation.destructive) {
      return { account: null, result: { destructive: true, remaining: 0 } }
    }
    const outbox = current.outbox.filter(item => item.mutationId !== mutationId)
    return {
      account: {
        ...current,
        serverVersion,
        updatedAt: new Date().toISOString(),
        origin: outbox.length ? 'pending' : 'remote',
        outbox,
      },
      result: { destructive: false, remaining: outbox.length },
    }
  })
}

export async function releaseMutationLeases(userId: string, leaseOwner: string): Promise<void> {
  await mutateAccount(userId, current => {
    if (!current) return { account: null, result: undefined }
    return {
      account: {
        ...current,
        outbox: current.outbox.map(mutation => mutation.leaseOwner === leaseOwner
          ? { ...mutation, leaseOwner: undefined, leaseExpiresAt: undefined }
          : mutation),
      },
      result: undefined,
    }
  })
}

export async function durableOutboxSummary(
  userId: string,
): Promise<{ count: number; nextAttemptAt: number | null }> {
  const raw = await readRawAccount(userId)
  if (!raw) return { count: 0, nextAttemptAt: null }
  const account = parseAccount(raw, userId)
  const first = [...account.outbox].sort((a, b) => a.order - b.order)[0]
  return {
    count: account.outbox.length,
    nextAttemptAt: first ? Math.max(first.nextAttemptAt, first.leaseExpiresAt ?? 0) : null,
  }
}

export async function hasDurableMutation(userId: string, mutationId: string): Promise<boolean> {
  const raw = await readRawAccount(userId)
  if (!raw) return false
  const account = parseAccount(raw, userId)
  return account.outbox.some(mutation => mutation.mutationId === mutationId)
}

export async function clearDurableUser(userId: string): Promise<void> {
  await mutateAccount(userId, () => ({ account: null, result: undefined }))
  localStorage.removeItem(fallbackKey(userId))
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(`${RECOVERY_PREFIX}${userId}`)) localStorage.removeItem(key)
  }
}

/** Close the shared connection so tests and future schema upgrades can reopen it. */
export async function closeDurableState(): Promise<void> {
  const database = await databasePromise
  database?.close()
  databasePromise = null
}
