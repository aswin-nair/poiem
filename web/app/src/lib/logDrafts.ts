import type { FoodAnalysis, FoodSource, MealType } from '../types'

const VERSION = 1 as const
const KEY_PREFIX = 'fud-log-drafts-v1-'
const RECOVERY_PREFIX = 'fud-log-drafts-recovery-v1-'
const SNAPSHOT_PREFIX = 'fud-log-drafts-snapshot-v1-'
const DATABASE_NAME = 'fud-ai-web-drafts'
const DATABASE_VERSION = 1
const DRAFT_STORE = 'drafts'

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const DRAFT_DATABASE_NAME = DATABASE_NAME

const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
const FOOD_SOURCES = new Set<FoodSource>(['textInput', 'manual', 'snapFood', 'quickAdd', 'recent'])

export const REVIEW_NUMERIC_FIELDS = ['calories', 'protein', 'carbs', 'fat'] as const
export type ReviewNumericField = typeof REVIEW_NUMERIC_FIELDS[number]

export interface ManualLogDraft {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  mealType: MealType
  servings: number
  updatedAt: string
}

export interface ReviewLogDraft {
  analysis: FoodAnalysis
  baseAnalysis: FoodAnalysis
  /** Immutable model estimate. Older drafts may only have their corrected base. */
  originalAnalysis?: FoodAnalysis
  mealType: MealType
  servings: number
  source: FoodSource
  emptyNumericFields: ReviewNumericField[]
  updatedAt: string
}

export interface LogDraftEnvelope {
  version: typeof VERSION
  text?: { text: string; updatedAt: string }
  manual?: ManualLogDraft
  review?: ReviewLogDraft
}

interface RecoveryBlob {
  raw: string
  quarantinedAt: string
}

interface StoredPhotoDraft {
  name: string
  type: string
  lastModified: number
  savedAt: string
  bytes: ArrayBuffer
}

interface DraftSnapshot {
  revision: number
  /** null clears a section that IndexedDB may not have committed yet. */
  text?: LogDraftEnvelope['text'] | null
  manual?: ManualLogDraft | null
  review?: ReviewLogDraft | null
  clearPhoto?: true
  clearRecovery?: true
}

interface StoredDrafts {
  userId: string
  envelope: LogDraftEnvelope
  recovery?: RecoveryBlob
  photo?: StoredPhotoDraft
  /** Matches the synchronous snapshot written before the IndexedDB transaction commits. */
  revision?: number
}

const memory = new Map<string, LogDraftEnvelope>()
type EnvelopeSection = 'text' | 'manual' | 'review'
type EnvelopeRevision = Record<EnvelopeSection | 'all', number>
const envelopeRevisions = new Map<string, EnvelopeRevision>()
const clearRevisions = new Map<string, EnvelopeRevision>()
const hydrationByUser = new Map<string, Promise<LogDraftEnvelope>>()
const photoMemory = new Map<string, File>()
const photoRevision = new Map<string, number>()
let databasePromise: Promise<IDBDatabase | null> | null = null
let writeQueue: Promise<void> = Promise.resolve()
let writeEpoch = 0

function envelopeRevision(userId: string): EnvelopeRevision {
  return envelopeRevisions.get(userId) ?? { all: 0, text: 0, manual: 0, review: 0 }
}

function markEnvelopeEdit(userId: string, section: EnvelopeSection | 'all'): void {
  const revision = envelopeRevision(userId)
  envelopeRevisions.set(userId, { ...revision, [section]: revision[section] + 1 })
}

function markDraftCleared(userId: string, section: EnvelopeSection | 'all'): void {
  const revision = clearRevisions.get(userId) ?? { all: 0, text: 0, manual: 0, review: 0 }
  clearRevisions.set(userId, { ...revision, [section]: revision[section] + 1 })
}

/** Only explicit clears invalidate another form's pending edits; ordinary saves do not. */
export function logDraftClearGeneration(userId: string, section: EnvelopeSection): string {
  const revision = clearRevisions.get(userId)
  return `${revision?.all ?? 0}:${revision?.[section] ?? 0}`
}

/** A late durable read must respect edits and explicit clears made while it was pending. */
function mergeHydratedEnvelope(userId: string, envelope: LogDraftEnvelope, before: EnvelopeRevision): LogDraftEnvelope {
  const after = envelopeRevision(userId)
  const latest = memory.get(userId) ?? emptyEnvelope()
  if (after.all !== before.all) return expireEnvelope(latest)
  const merged = { ...envelope }
  for (const section of ['text', 'manual', 'review'] as const) {
    if (after[section] === before[section]) continue
    delete merged[section]
    if (latest[section]) Object.assign(merged, { [section]: latest[section] })
  }
  return merged
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(userId)}`
}

function recoveryKey(userId: string): string {
  return `${RECOVERY_PREFIX}${encodeURIComponent(userId)}`
}

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_PREFIX}${encodeURIComponent(userId)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isText(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 100 && Number.isFinite(Date.parse(value))
}

function hasOnly(value: Record<string, unknown>, fields: readonly string[]): boolean {
  const allowed = new Set(fields)
  return Object.keys(value).every(key => allowed.has(key))
}

function isIngredient(value: unknown): boolean {
  return isRecord(value)
    && hasOnly(value, ['item', 'grams', 'calories', 'protein', 'carbs', 'fat'])
    && isText(value.item, 500, false)
    && isFiniteNumber(value.grams, 0, 100_000)
    && isFiniteNumber(value.calories, 0, 100_000)
    && isFiniteNumber(value.protein, 0, 10_000)
    && isFiniteNumber(value.carbs, 0, 10_000)
    && isFiniteNumber(value.fat, 0, 10_000)
}

export function isSafeFoodAnalysis(value: unknown): value is FoodAnalysis {
  if (!isRecord(value)) return false
  if (!hasOnly(value, ['name', 'calories', 'protein', 'carbs', 'fat', 'servingSizeGrams', 'emoji', 'ingredients'])) {
    return false
  }
  return isText(value.name, 500, false)
    && isFiniteNumber(value.calories, 0, 100_000)
    && isFiniteNumber(value.protein, 0, 10_000)
    && isFiniteNumber(value.carbs, 0, 10_000)
    && isFiniteNumber(value.fat, 0, 10_000)
    && isFiniteNumber(value.servingSizeGrams, 0, 100_000)
    && (value.emoji === undefined || isText(value.emoji, 32))
    && (value.ingredients === undefined
      || (Array.isArray(value.ingredients) && value.ingredients.length <= 200 && value.ingredients.every(isIngredient)))
}

function isTextDraft(value: unknown): value is NonNullable<LogDraftEnvelope['text']> {
  return isRecord(value)
    && hasOnly(value, ['text', 'updatedAt'])
    && isText(value.text, 5_000)
    && isTimestamp(value.updatedAt)
}

function isManualDraft(value: unknown): value is ManualLogDraft {
  return isRecord(value)
    && hasOnly(value, ['name', 'calories', 'protein', 'carbs', 'fat', 'mealType', 'servings', 'updatedAt'])
    && isText(value.name, 500)
    && isText(value.calories, 40)
    && isText(value.protein, 40)
    && isText(value.carbs, 40)
    && isText(value.fat, 40)
    && typeof value.mealType === 'string'
    && MEAL_TYPES.has(value.mealType as MealType)
    && isFiniteNumber(value.servings, 0.25, 1_000)
    && isTimestamp(value.updatedAt)
}

function isReviewDraft(value: unknown): value is ReviewLogDraft {
  return isRecord(value)
    && hasOnly(value, [
      'analysis', 'baseAnalysis', 'originalAnalysis', 'mealType', 'servings', 'source', 'emptyNumericFields', 'updatedAt',
    ])
    && isSafeFoodAnalysis(value.analysis)
    && isSafeFoodAnalysis(value.baseAnalysis)
    && (value.originalAnalysis === undefined || isSafeFoodAnalysis(value.originalAnalysis))
    && typeof value.mealType === 'string'
    && MEAL_TYPES.has(value.mealType as MealType)
    && isFiniteNumber(value.servings, 0.25, 1_000)
    && typeof value.source === 'string'
    && FOOD_SOURCES.has(value.source as FoodSource)
    && Array.isArray(value.emptyNumericFields)
    && value.emptyNumericFields.length <= REVIEW_NUMERIC_FIELDS.length
    && value.emptyNumericFields.every(field => REVIEW_NUMERIC_FIELDS.includes(field as ReviewNumericField))
    && new Set(value.emptyNumericFields).size === value.emptyNumericFields.length
    && isTimestamp(value.updatedAt)
}

function isEnvelope(value: unknown): value is LogDraftEnvelope {
  return isRecord(value)
    && hasOnly(value, ['version', 'text', 'manual', 'review'])
    && value.version === VERSION
    && (value.text === undefined || isTextDraft(value.text))
    && (value.manual === undefined || isManualDraft(value.manual))
    && (value.review === undefined || isReviewDraft(value.review))
}

function emptyEnvelope(): LogDraftEnvelope {
  return { version: VERSION }
}

function isEmptyEnvelope(envelope: LogDraftEnvelope): boolean {
  return !envelope.text && !envelope.manual && !envelope.review
}

export function isTimestampExpired(value: string, now: number, ttlMs: number): boolean {
  const timestamp = Date.parse(value)
  return !Number.isFinite(timestamp) || now - timestamp >= ttlMs
}

export function expireEnvelope(envelope: LogDraftEnvelope, now = Date.now()): LogDraftEnvelope {
  const next: LogDraftEnvelope = { version: VERSION }
  if (envelope.text && !isTimestampExpired(envelope.text.updatedAt, now, DRAFT_TTL_MS)) {
    next.text = envelope.text
  }
  if (envelope.manual && !isTimestampExpired(envelope.manual.updatedAt, now, DRAFT_TTL_MS)) {
    next.manual = envelope.manual
  }
  if (envelope.review && !isTimestampExpired(envelope.review.updatedAt, now, DRAFT_TTL_MS)) {
    next.review = envelope.review
  }
  return next
}

function parseRecovery(stored: string, now: Date): RecoveryBlob {
  try {
    const parsed: unknown = JSON.parse(stored)
    if (
      isRecord(parsed)
      && typeof parsed.raw === 'string'
      && isTimestamp(parsed.quarantinedAt)
      && hasOnly(parsed, ['raw', 'quarantinedAt'])
    ) {
      return { raw: parsed.raw, quarantinedAt: parsed.quarantinedAt }
    }
  } catch {
    // Legacy unwrapped blobs get a TTL starting at first sight.
  }
  return { raw: stored, quarantinedAt: now.toISOString() }
}

function writeRecovery(userId: string, recovery: RecoveryBlob): void {
  localStorage.setItem(recoveryKey(userId), JSON.stringify(recovery))
}

function removeFallback(userId: string): void {
  localStorage.removeItem(storageKey(userId))
}

function readSnapshot(userId: string): DraftSnapshot {
  try {
    const raw = localStorage.getItem(snapshotKey(userId))
    if (!raw) return { revision: 0 }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !isFiniteNumber(parsed.revision, 1, Number.MAX_SAFE_INTEGER)) return { revision: 0 }
    const snapshot: DraftSnapshot = { revision: parsed.revision }
    if (parsed.text === null) snapshot.text = null
    else if (isTextDraft(parsed.text)) snapshot.text = parsed.text
    if (parsed.manual === null) snapshot.manual = null
    else if (isManualDraft(parsed.manual)) snapshot.manual = parsed.manual
    if (parsed.review === null) snapshot.review = null
    else if (isReviewDraft(parsed.review)) snapshot.review = parsed.review
    if (parsed.clearPhoto === true) snapshot.clearPhoto = true
    if (parsed.clearRecovery === true) snapshot.clearRecovery = true
    return snapshot
  } catch {
    return { revision: 0 }
  }
}

/** Survive a reload that lands before the IndexedDB transaction commits. */
function writeSnapshot(
  userId: string,
  envelope: LogDraftEnvelope,
  section: EnvelopeSection | 'all',
  flags?: Pick<DraftSnapshot, 'clearPhoto' | 'clearRecovery'>,
): void {
  const previous = readSnapshot(userId)
  const snapshot: DraftSnapshot = {
    revision: previous.revision + 1,
    ...(flags?.clearPhoto ? { clearPhoto: true as const } : {}),
    ...(flags?.clearRecovery ? { clearRecovery: true as const } : {}),
  }
  if (section === 'all' || section === 'text') snapshot.text = envelope.text ?? null
  else if (previous.text !== undefined) snapshot.text = previous.text
  if (section === 'all' || section === 'manual') snapshot.manual = envelope.manual ?? null
  else if (previous.manual !== undefined) snapshot.manual = previous.manual
  if (section === 'all' || section === 'review') snapshot.review = envelope.review ?? null
  else if (previous.review !== undefined) snapshot.review = previous.review
  localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot))
}

function commitSnapshot(userId: string, revision: number): void {
  const current = readSnapshot(userId)
  if (current.revision !== revision) return
  localStorage.setItem(snapshotKey(userId), JSON.stringify({ revision }))
}

function applySnapshot(envelope: LogDraftEnvelope, snapshot: DraftSnapshot): LogDraftEnvelope {
  const next: LogDraftEnvelope = { ...envelope, version: VERSION }
  if (snapshot.text === null) delete next.text
  else if (snapshot.text) next.text = snapshot.text
  if (snapshot.manual === null) delete next.manual
  else if (snapshot.manual) next.manual = snapshot.manual
  if (snapshot.review === null) delete next.review
  else if (snapshot.review) next.review = snapshot.review
  return next
}

function storedRevision(record: StoredDrafts | null): number {
  return record && isFiniteNumber(record.revision, 0, Number.MAX_SAFE_INTEGER) ? record.revision : 0
}

function removeRecovery(userId: string): void {
  localStorage.removeItem(recoveryKey(userId))
}

function expireRecoveryStore(userId: string, now: Date): void {
  try {
    const stored = localStorage.getItem(recoveryKey(userId))
    if (!stored) return
    const recovery = parseRecovery(stored, now)
    if (isTimestampExpired(recovery.quarantinedAt, now.getTime(), RECOVERY_TTL_MS)) {
      removeRecovery(userId)
      return
    }
    writeRecovery(userId, recovery)
  } catch {
    // Storage may be unavailable; the in-memory form remains usable.
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function openDraftDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise
  if (typeof indexedDB === 'undefined') {
    databasePromise = Promise.resolve(null)
    return databasePromise
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'userId' })
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

function bumpPhotoRevision(userId: string): number {
  const next = (photoRevision.get(userId) ?? 0) + 1
  photoRevision.set(userId, next)
  return next
}

function photoRevisionMatches(userId: string, revision: number): boolean {
  return (photoRevision.get(userId) ?? 0) === revision
}

function enqueueWrite(task: () => Promise<void>): void {
  const epoch = writeEpoch
  const run = () => {
    if (epoch !== writeEpoch) return
    return task()
  }
  writeQueue = writeQueue.then(run, run)
}

async function idbGet(db: IDBDatabase, userId: string): Promise<StoredDrafts | null> {
  const request = db.transaction(DRAFT_STORE, 'readonly').objectStore(DRAFT_STORE).get(userId)
  return (await requestToPromise(request) as StoredDrafts | undefined) ?? null
}

async function idbPut(db: IDBDatabase, record: StoredDrafts): Promise<void> {
  const request = db.transaction(DRAFT_STORE, 'readwrite').objectStore(DRAFT_STORE).put(record)
  await requestToPromise(request)
}

async function idbDelete(db: IDBDatabase, userId: string): Promise<void> {
  const request = db.transaction(DRAFT_STORE, 'readwrite').objectStore(DRAFT_STORE).delete(userId)
  await requestToPromise(request)
}

function readFallbackEnvelope(userId: string, now: Date): LogDraftEnvelope {
  expireRecoveryStore(userId, now)
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyEnvelope()
    const parsed: unknown = JSON.parse(raw)
    if (isEnvelope(parsed)) {
      const envelope = expireEnvelope(parsed, now.getTime())
      if (isEmptyEnvelope(envelope)) {
        removeFallback(userId)
        return emptyEnvelope()
      }
      if (JSON.stringify(envelope) !== raw) {
        localStorage.setItem(storageKey(userId), JSON.stringify(envelope))
      }
      return envelope
    }
    quarantineRaw(userId, raw, now)
  } catch {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      if (raw) quarantineRaw(userId, raw, now)
    } catch {
      // Storage may be unavailable; the in-memory form remains usable.
    }
  }
  return emptyEnvelope()
}

function quarantineRaw(userId: string, raw: string, now: Date): void {
  const recovery = { raw, quarantinedAt: now.toISOString() }
  try {
    writeRecovery(userId, recovery)
    removeFallback(userId)
  } catch {
    // Best effort for browsers with unavailable storage.
  }
  enqueueWrite(async () => {
    const db = await openDraftDatabase()
    if (!db) return
    const current = await idbGet(db, userId)
    await idbPut(db, {
      userId,
      envelope: emptyEnvelope(),
      recovery,
      ...(current && !isEmptyEnvelope(current.envelope) ? { envelope: current.envelope } : {}),
    })
  })
}

function persist(userId: string, next: LogDraftEnvelope, section: EnvelopeSection | 'all'): boolean {
  const envelope = expireEnvelope(next)
  memory.set(userId, envelope)
  const empty = isEmptyEnvelope(envelope)
  const indexedDbMissing = typeof indexedDB === 'undefined'

  if (indexedDbMissing) {
    try {
      if (empty) removeFallback(userId)
      else localStorage.setItem(storageKey(userId), JSON.stringify(envelope))
    } catch {
      return false
    }
    return true
  }

  try {
    writeSnapshot(userId, envelope, section)
  } catch {
    // IndexedDB still receives the draft when ordinary storage is unavailable.
  }

  enqueueWrite(async () => {
    const db = await openDraftDatabase()
    const latest = memory.get(userId)
    // A full clear drops the in-memory draft and owns the durable delete.
    if (!latest) return
    if (db) {
      const current = await idbGet(db, userId)
      const still = memory.get(userId)
      if (!still) return
      const photo = current?.photo
      const revision = readSnapshot(userId).revision
      if (isEmptyEnvelope(still) && !photo && !photoMemory.has(userId)) await idbDelete(db, userId)
      else await idbPut(db, { userId, envelope: still, recovery: current?.recovery, photo, revision })
      try {
        if (memory.get(userId) === still && readSnapshot(userId).revision === revision) {
          removeFallback(userId)
          commitSnapshot(userId, revision)
        }
      } catch { /* keep the fallback if it cannot be removed */ }
      return
    }
    try {
      if (isEmptyEnvelope(latest)) removeFallback(userId)
      else localStorage.setItem(storageKey(userId), JSON.stringify(latest))
    } catch {
      // Memory still holds the draft for this session.
    }
  })
  return true
}

export function loadLogDrafts(userId: string, now = new Date()): LogDraftEnvelope {
  if (!userId) return emptyEnvelope()
  expireRecoveryStore(userId, now)
  const cached = memory.get(userId)
  if (cached) {
    const envelope = expireEnvelope(cached, now.getTime())
    if (JSON.stringify(envelope) !== JSON.stringify(cached)) persist(userId, envelope, 'all')
    else memory.set(userId, envelope)
    return envelope
  }
  const envelope = readFallbackEnvelope(userId, now)
  memory.set(userId, envelope)
  return envelope
}

export function hydrateLogDrafts(userId: string, now = new Date()): Promise<LogDraftEnvelope> {
  if (!userId) return Promise.resolve(emptyEnvelope())
  const pending = hydrationByUser.get(userId)
  if (pending) return pending
  const hydration = hydrateEnvelope(userId, now).finally(() => {
    if (hydrationByUser.get(userId) === hydration) hydrationByUser.delete(userId)
  })
  hydrationByUser.set(userId, hydration)
  return hydration
}

async function hydrateEnvelope(userId: string, now: Date): Promise<LogDraftEnvelope> {
  const revision = envelopeRevision(userId)
  await writeQueue
  expireRecoveryStore(userId, now)
  const db = await openDraftDatabase()
  if (!db) {
    const fallback = loadLogDrafts(userId, now)
    return fallback
  }

  let record: StoredDrafts | null = null
  try {
    record = await idbGet(db, userId)
  } catch {
    record = null
  }

  const snapshot = readSnapshot(userId)
  const recordRevision = storedRevision(record)
  const snapshotWins = snapshot.revision > recordRevision
  let envelope = emptyEnvelope()
  if (record && isEnvelope(record.envelope)) {
    envelope = expireEnvelope(record.envelope, now.getTime())
  } else if (record?.envelope) {
    quarantineRaw(userId, JSON.stringify(record.envelope), now)
    envelope = emptyEnvelope()
  } else {
    envelope = readFallbackEnvelope(userId, now)
  }
  if (snapshotWins) envelope = applySnapshot(envelope, snapshot)

  envelope = mergeHydratedEnvelope(userId, envelope, revision)
  const fullyCleared = envelopeRevision(userId).all !== revision.all
  let recovery = fullyCleared || (snapshotWins && snapshot.clearRecovery) ? undefined : record?.recovery
  if (recovery && isTimestampExpired(recovery.quarantinedAt, now.getTime(), RECOVERY_TTL_MS)) {
    recovery = undefined
  }

  memory.set(userId, envelope)
  const photo = fullyCleared || (snapshotWins && snapshot.clearPhoto) ? undefined : record?.photo
  const durableRevision = Math.max(recordRevision, snapshot.revision)
  try {
    if (isEmptyEnvelope(envelope) && !recovery && !photo && !photoMemory.has(userId)) await idbDelete(db, userId)
    else await idbPut(db, { userId, envelope, recovery, photo, ...(durableRevision > 0 ? { revision: durableRevision } : {}) })
    removeFallback(userId)
    if (snapshot.revision > 0) commitSnapshot(userId, snapshot.revision)
  } catch {
    // Keep the in-memory draft when the durable write cannot complete.
  }
  return envelope
}

export function saveTextLogDraft(userId: string, text: string): boolean {
  markEnvelopeEdit(userId, 'text')
  const current = loadLogDrafts(userId)
  const next = { ...current }
  if (text.length === 0) delete next.text
  else next.text = { text: text.slice(0, 5_000), updatedAt: new Date().toISOString() }
  return persist(userId, next, 'text')
}

export function saveManualLogDraft(userId: string, draft: Omit<ManualLogDraft, 'updatedAt'>): boolean {
  markEnvelopeEdit(userId, 'manual')
  const current = loadLogDrafts(userId)
  const next = { ...current }
  const hasDetails = [draft.name, draft.calories, draft.protein, draft.carbs, draft.fat].some(value => value.length > 0)
    || draft.servings !== 1
  if (hasDetails) next.manual = { ...draft, updatedAt: new Date().toISOString() }
  else delete next.manual
  return persist(userId, next, 'manual')
}

export function saveReviewLogDraft(userId: string, draft: Omit<ReviewLogDraft, 'updatedAt'>): boolean {
  // Keep the last recoverable review while a field is temporarily invalid.
  if (!isReviewDraft({ ...draft, updatedAt: new Date().toISOString() })) return false
  markEnvelopeEdit(userId, 'review')
  const current = loadLogDrafts(userId)
  return persist(userId, { ...current, review: { ...draft, updatedAt: new Date().toISOString() } }, 'review')
}

export function clearLogDraft(userId: string, section?: 'text' | 'manual' | 'review' | 'photo'): void {
  if (!userId) return
  if (!section) {
    markDraftCleared(userId, 'all')
    markEnvelopeEdit(userId, 'all')
    memory.delete(userId)
    bumpPhotoRevision(userId)
    photoMemory.delete(userId)
    try {
      if (typeof indexedDB !== 'undefined') writeSnapshot(userId, emptyEnvelope(), 'all', { clearPhoto: true, clearRecovery: true })
      else removeFallback(userId)
      removeRecovery(userId)
    } catch {
      // Best effort for browsers with unavailable storage.
    }
    enqueueWrite(async () => {
      const db = await openDraftDatabase()
      if (db) await idbDelete(db, userId)
    })
    return
  }
  if (section === 'photo') {
    clearPhotoLogDraft(userId)
    return
  }
  markDraftCleared(userId, section)
  markEnvelopeEdit(userId, section)
  const current = { ...loadLogDrafts(userId) }
  delete current[section]
  persist(userId, current, section)
}

function fileFromPhoto(photo: StoredPhotoDraft): File {
  return new File([photo.bytes], photo.name, { type: photo.type, lastModified: photo.lastModified })
}

export function peekPhotoLogDraft(userId: string): File | null {
  return photoMemory.get(userId) ?? null
}

export function savePhotoLogDraft(userId: string, file: File): boolean {
  if (!userId) return false
  bumpPhotoRevision(userId)
  photoMemory.set(userId, file)
  enqueueWrite(async () => {
    const latest = memory.get(userId) ?? emptyEnvelope()
    const db = await openDraftDatabase()
    if (!db) return
    const current = await idbGet(db, userId)
    const bytes = await file.arrayBuffer()
    await idbPut(db, {
      userId,
      envelope: current?.envelope ?? latest,
      recovery: current?.recovery,
      photo: {
        name: file.name.slice(0, 200),
        type: file.type,
        lastModified: file.lastModified,
        savedAt: new Date().toISOString(),
        bytes,
      },
    })
  })
  return true
}

export async function hydratePhotoLogDraft(userId: string, now = new Date()): Promise<File | null> {
  if (!userId) return null
  const cached = photoMemory.get(userId)
  if (cached) return cached
  const revision = photoRevision.get(userId) ?? 0
  await writeQueue
  if (!photoRevisionMatches(userId, revision)) return photoMemory.get(userId) ?? null
  const afterWrites = photoMemory.get(userId)
  if (afterWrites) return afterWrites
  const db = await openDraftDatabase()
  if (!db) return null
  let record: StoredDrafts | null = null
  try { record = await idbGet(db, userId) } catch { return photoMemory.get(userId) ?? null }
  if (!photoRevisionMatches(userId, revision)) return photoMemory.get(userId) ?? null
  const photo = record?.photo
  if (!photo?.bytes || !isTimestamp(photo.savedAt) || isTimestampExpired(photo.savedAt, now.getTime(), DRAFT_TTL_MS)) {
    if (record?.photo && photoRevisionMatches(userId, revision) && !photoMemory.has(userId)) {
      await idbPut(db, { ...record, photo: undefined })
    }
    return photoMemory.get(userId) ?? null
  }
  if (!photoRevisionMatches(userId, revision)) return photoMemory.get(userId) ?? null
  const file = fileFromPhoto(photo)
  if (!photoRevisionMatches(userId, revision)) return photoMemory.get(userId) ?? null
  photoMemory.set(userId, file)
  return file
}

export function clearPhotoLogDraft(userId: string): void {
  if (!userId) return
  bumpPhotoRevision(userId)
  photoMemory.delete(userId)
  enqueueWrite(async () => {
    const db = await openDraftDatabase()
    if (!db) return
    const current = await idbGet(db, userId)
    if (!current) return
    if (isEmptyEnvelope(current.envelope) && !current.recovery) await idbDelete(db, userId)
    else await idbPut(db, { ...current, photo: undefined })
  })
}

export async function flushLogDraftWrites(): Promise<void> {
  await writeQueue
}

export async function resetLogDraftRuntime(): Promise<void> {
  memory.clear()
  envelopeRevisions.clear()
  clearRevisions.clear()
  hydrationByUser.clear()
  photoMemory.clear()
  photoRevision.clear()
  writeEpoch += 1
  writeQueue = Promise.resolve()
  if (databasePromise) {
    const db = await databasePromise
    try { db?.close() } catch { /* tests replace the database between cases */ }
  }
  databasePromise = null
}

export function logDraftStorageKeys(userId: string): string[] {
  return [storageKey(userId), recoveryKey(userId)]
}
