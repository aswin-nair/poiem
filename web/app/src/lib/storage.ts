import type { AISettings, AppState, FoodEntry, GamificationState } from '../types'
import { entryDayKey } from '@fud-ai/product/localDate'
import { normalizeOutfit } from '@fud-ai/product/wardrobe'
import { localDayKey } from './dates'
import { defaultProfile, profileInputIssue } from './profile'
import { apiFormatFor, authHeaderFor, authTypeFor, defaultAISettings, defaultEndpointFor, normalizeAISettings, retiredGeminiModelReplacement, retiredModelReplacement } from './aiConfig'
import { authHeaderIssue, endpointIssue } from '../../../shared/aiConnection'
import { validateAppState } from '../../../shared/appStateContract'
import { clearLogDraft } from './logDrafts'

const LEGACY_KEY = 'fud-ai-web-state'
const PRIVATE_AI_KEY_PREFIX = 'fud-ai-private-ai-key-'
const PRIVATE_AI_CRYPTO_KEY = 'fud-ai-private-ai-crypto-key-v1'
const PRIVATE_AI_ENC_PREFIX = 'v1:'
const PRIVATE_AI_BOUND_ENC_PREFIX = 'v2:'

function storageKey(userId: string): string {
  return `fud-ai-web-state-${userId}`
}

export function hasStoredState(userId: string): boolean {
  return localStorage.getItem(storageKey(userId)) !== null
    || localStorage.getItem(LEGACY_KEY) !== null
}

export function hasQuarantinedState(userId: string): boolean {
  return localStorage.getItem(`${storageKey(userId)}-quarantine`) !== null
}

/** Remove only the legacy snapshot after it has been committed durably. */
export function removeStoredStateSnapshot(userId: string): void {
  localStorage.removeItem(storageKey(userId))
  localStorage.removeItem(LEGACY_KEY)
}

function privateAIKey(userId: string): string {
  return `${PRIVATE_AI_KEY_PREFIX}${userId}`
}

/**
 * BYOK credentials are device-local secrets. They are deliberately stored
 * outside AppState so exports and cloud sync cannot include them accidentally.
 * The value on disk is AES-GCM ciphertext. The device key is also local, so
 * this protects the credential at rest, not against a script already running
 * in this origin.
 */
let encryptionKeyPromise: Promise<CryptoKey> | null = null
const privateAIWrites = new Map<string, Promise<void>>()
const privateAIWriteRevisions = new Map<string, number>()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index)
  return out
}

function privateAIEncryptionKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    return Promise.reject(new Error('This browser cannot store an API key safely.'))
  }
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = (async () => {
      const encoded = localStorage.getItem(PRIVATE_AI_CRYPTO_KEY)
      if (encoded) {
        try {
          const jwk = JSON.parse(encoded) as JsonWebKey
          return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
        } catch {
          localStorage.removeItem(PRIVATE_AI_CRYPTO_KEY)
        }
      }
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
      const jwk = await crypto.subtle.exportKey('jwk', key)
      localStorage.setItem(PRIVATE_AI_CRYPTO_KEY, JSON.stringify(jwk))
      return key
    })().catch(error => {
      encryptionKeyPromise = null
      throw error
    })
  }
  return encryptionKeyPromise
}

async function encryptPrivateAIKey(value: string): Promise<string> {
  const key = await privateAIEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))
  const packed = new Uint8Array(iv.byteLength + cipher.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(cipher), iv.byteLength)
  return `${PRIVATE_AI_BOUND_ENC_PREFIX}${bytesToBase64(packed)}`
}

async function decryptPrivateAIKey(stored: string): Promise<string> {
  if (!stored.startsWith(PRIVATE_AI_ENC_PREFIX) && !stored.startsWith(PRIVATE_AI_BOUND_ENC_PREFIX)) return stored
  const key = await privateAIEncryptionKey()
  const packed = base64ToBytes(stored.slice(PRIVATE_AI_ENC_PREFIX.length))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.slice(0, 12) },
    key,
    packed.slice(12),
  )
  return new TextDecoder().decode(plain)
}

/** The public connection identity a credential was explicitly saved for. */
function aiConnectionIdentity(settings: AISettings): string | null {
  const format = apiFormatFor(settings)
  const authType = authTypeFor(settings)
  if (authType === 'none') return null
  const endpoint = settings.endpointUrl?.trim() || (settings.provider === 'custom' ? '' : defaultEndpointFor(settings.provider, format))
  if (endpointIssue(endpoint, settings.apiKey)) return null
  const header = authType === 'api-key' ? authHeaderFor(settings).toLowerCase() : ''
  if (header && authHeaderIssue(header)) return null
  // URL canonicalization treats host casing and default ports consistently.
  // Models may change without moving a key to another API or header.
  const url = new URL(endpoint)
  return JSON.stringify([url.href, endpoint.includes('{model}'), format, authType, header])
}

function legacyKeyMatches(settings: AISettings, apiKey: string): boolean {
  if (settings.provider === 'custom') return false
  const original = {
    ...defaultAISettings(),
    provider: settings.provider,
    apiKey: '',
  }
  if (aiConnectionIdentity(settings) !== aiConnectionIdentity(original)) return false
  // The two legacy services have distinctive key prefixes. Never migrate one
  // of those keys onto the other service while adopting synced settings.
  if (apiKey.startsWith('sk-or-')) return settings.provider === 'openrouter'
  if (apiKey.startsWith('AIza')) return settings.provider === 'gemini'
  return settings.provider === 'openrouter'
}

export function aiConnectionsMatch(first: AISettings, second: AISettings): boolean {
  const identity = aiConnectionIdentity(first)
  return identity !== null && identity === aiConnectionIdentity(second)
}

export async function loadPrivateAIKey(userId: string, settings: AISettings = defaultAISettings()): Promise<string> {
  try {
    await privateAIWrites.get(userId)
    const stored = localStorage.getItem(privateAIKey(userId)) ?? ''
    if (!stored) return ''
    const decrypted = await decryptPrivateAIKey(stored)
    if (stored.startsWith(PRIVATE_AI_BOUND_ENC_PREFIX)) {
      const credential = JSON.parse(decrypted) as { apiKey?: unknown; connection?: unknown }
      return typeof credential.apiKey === 'string'
        && credential.connection === aiConnectionIdentity(settings)
        && credential.connection !== null ? credential.apiKey : ''
    }
    if (!legacyKeyMatches(settings, decrypted)) return ''
    await savePrivateAIKey(userId, decrypted, settings)
    return decrypted
  } catch {
    return ''
  }
}

export function savePrivateAIKey(userId: string, apiKey: string, settings: AISettings = defaultAISettings()): Promise<void> {
  const revision = (privateAIWriteRevisions.get(userId) ?? 0) + 1
  privateAIWriteRevisions.set(userId, revision)
  const connection = aiConnectionIdentity(settings)
  const task = (async () => {
    if (!apiKey.trim() || connection === null) {
      localStorage.removeItem(privateAIKey(userId))
      return
    }
    const encrypted = await encryptPrivateAIKey(JSON.stringify({ apiKey, connection }))
    if (privateAIWriteRevisions.get(userId) === revision) {
      localStorage.setItem(privateAIKey(userId), encrypted)
    }
  })()
  privateAIWrites.set(userId, task)
  void task.finally(() => {
    if (privateAIWrites.get(userId) === task) privateAIWrites.delete(userId)
  }).catch(() => undefined)
  return task
}

export function clearPrivateAIKey(userId: string): void {
  privateAIWriteRevisions.set(userId, (privateAIWriteRevisions.get(userId) ?? 0) + 1)
  localStorage.removeItem(privateAIKey(userId))
}

/** A copy suitable for export or transport across the network. */
export function stateWithoutPrivateSecrets(state: AppState): AppState {
  const { apiKey, endpointUrl, authHeader, ...settings } = state.aiSettings
  return {
    ...state,
    aiSettings: {
      ...settings,
      apiKey: '',
      ...(endpointUrl !== undefined && !endpointIssue(endpointUrl, apiKey) ? { endpointUrl } : {}),
      ...(authHeader !== undefined && !authHeaderIssue(authHeader) && !authHeader.includes(apiKey.trim() || '\u0000') ? { authHeader } : {}),
    },
  }
}

export function loadState(userId: string): AppState {
  const key = storageKey(userId)
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)

    // Migrate anonymous data from before Google auth was added.
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        localStorage.setItem(key, legacy)
        localStorage.removeItem(LEGACY_KEY)
        raw = legacy
      }
    }

    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as AppState
    const normalized = normalizeState(parsed)
    // Run migrations first so older, incomplete blobs remain recoverable, then
    // refuse malformed nested members that would otherwise crash session-open
    // logic (for example `foodEntries: [null]`).
    const validation = validateAppState(normalized, new Date(), { allowLegacyGamification: true })
    if (!validation.ok) {
      // Keep one recoverable copy before the normal persistence effect replaces
      // the unusable primary blob with a safe fresh state.
      localStorage.setItem(`${key}-quarantine`, raw)
      return freshState()
    }

    // One-time migration from older state blobs that embedded the key.
    // Encrypted keys are attached by the async loader; a legacy plaintext slot
    // is still readable here so an existing session does not lose it.
    const storedKey = localStorage.getItem(privateAIKey(userId)) ?? ''
    const legacyKey = normalized.aiSettings.apiKey
    const migratedKey = !storedKey && legacyKeyMatches(normalized.aiSettings, legacyKey) ? legacyKey : ''
    if (migratedKey) void savePrivateAIKey(userId, migratedKey, normalized.aiSettings)
    const encrypted = storedKey.startsWith(PRIVATE_AI_ENC_PREFIX) || storedKey.startsWith(PRIVATE_AI_BOUND_ENC_PREFIX)
    const readableKey = !encrypted && legacyKeyMatches(normalized.aiSettings, storedKey) ? storedKey : ''

    return {
      ...normalized,
      aiSettings: { ...normalized.aiSettings, apiKey: readableKey || migratedKey },
    }
  } catch {
    if (raw) {
      try { localStorage.setItem(`${key}-quarantine`, raw) } catch { /* storage may be unavailable */ }
    }
    return freshState()
  }
}

/** JSON snapshot with the BYOK credential removed. The name marks the stored text as encoded. */
function encodeStoredJournal(state: AppState): string {
  return JSON.stringify(stateWithoutPrivateSecrets(state))
}

export async function saveState(userId: string, state: AppState): Promise<void> {
  await savePrivateAIKey(userId, state.aiSettings.apiKey, state.aiSettings)
  localStorage.setItem(storageKey(userId), encodeStoredJournal(state))
}

export function clearUserState(userId: string): void {
  const key = storageKey(userId)
  localStorage.removeItem(key)
  localStorage.removeItem(`${key}-quarantine`)
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem('fud-seen-badges')
  clearPrivateAIKey(userId)
  clearLogDraft(userId)
}

/**
 * A persisted quest record is only usable if it carries all four fields the
 * rest of the code reads. Asserting the shape instead would let a truncated or
 * older record through and fail later, somewhere less obvious — the normaliser
 * exists precisely so bad data is dropped here.
 */
function enamelQuests(value: unknown): GamificationState['enamelQuests'] {
  if (!record(value)) return undefined

  const shaped =
    typeof value.date === 'string'
    && typeof value.weekStart === 'string'
    && Array.isArray(value.daily)
    && record(value.weekly)

  return shaped ? (value as unknown as GamificationState['enamelQuests']) : undefined
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeState(parsed: AppState): AppState {
  if (!record(parsed)) return parsed

  const source = parsed as unknown as Record<string, unknown>
  const foodEntries = source.foodEntries === undefined ? [] : source.foodEntries
  const gamification = normalizeGamification(source.gamification)

  if (record(gamification) && Array.isArray(gamification.awardedKeys)) {
    gamification.awardedKeys = [...new Set([
      ...gamification.awardedKeys,
      ...historicalAwardKeys(foodEntries),
    ])]
  }

  const profile = source.profile === undefined
    ? defaultProfile()
    : record(source.profile)
      ? { ...defaultProfile(), ...source.profile }
      : source.profile

  // Preserve explicit malformed values and unknown fields so the validator can
  // quarantine them. Only fields absent from an older state receive defaults.
  return {
    ...source,
    onboarded: source.onboarded === undefined ? false : source.onboarded,
    profile,
    foodEntries,
    weightEntries: source.weightEntries === undefined ? [] : source.weightEntries,
    exerciseEntries: source.exerciseEntries === undefined ? [] : source.exerciseEntries,
    favoriteMeals: source.favoriteMeals === undefined ? [] : source.favoriteMeals,
    chatMessages: source.chatMessages === undefined ? [] : source.chatMessages,
    aiSettings: normalizeAIForValidation(source.aiSettings),
    gamification,
  } as unknown as AppState
}

/**
 * Older releases used the 50-row display feed as their deduplication store.
 * Conservatively reconstruct keys from accepted entries during migration so
 * undo/replay cannot manufacture XP after an old feed row has rolled off.
 */
function historicalAwardKeys(entries: unknown): string[] {
  if (!Array.isArray(entries)) return []
  const keys: string[] = []
  const counts = new Map<string, number>()

  for (const entry of entries) {
    if (!record(entry) || typeof entry.id !== 'string' || typeof entry.timestamp !== 'string') continue
    const timestamp = new Date(entry.timestamp)
    if (!Number.isFinite(timestamp.getTime())) continue
    keys.push(`meal-${entry.id}`, `new-food-${entry.id}`)
    const date = localDayKey(timestamp)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  for (const [date, count] of counts) {
    keys.push(`first-meal-${date}`)
    if (count >= 3) keys.push(`three-meals-${date}`)
    if (count >= 4) keys.push(`four-meals-${date}`)
  }

  return keys
}

function normalizeAIForValidation(value: unknown): AppState['aiSettings'] {
  if (value === undefined) return defaultAISettings()
  if (!record(value)) return value as AppState['aiSettings']

  const migrated = normalizeAISettings(value as Partial<AppState['aiSettings']>)
  // Stored values win, so validation judges what was really saved rather than a repaired copy.
  // A retired model slug is the exception: a BYOK reader who kept one 404s on every request.
  const storedProvider = value.provider ?? migrated.provider
  const storedModel = storedProvider === 'openrouter'
    ? retiredModelReplacement(value.model) ?? value.model
    : storedProvider === 'gemini' ? retiredGeminiModelReplacement(value.model, value.endpointUrl) ?? value.model : value.model
  return {
    ...migrated,
    ...value,
    provider: value.provider === undefined ? migrated.provider : value.provider,
    apiKey: value.apiKey === undefined ? migrated.apiKey : value.apiKey,
    model: value.model === undefined ? migrated.model : storedModel,
  } as AppState['aiSettings']
}

function normalizeGamification(value: unknown): GamificationState {
  const base = defaultGamification()
  if (value === undefined) {
    // Migrate old seen-badge IDs from localStorage
    try {
      const old = localStorage.getItem('fud-seen-badges')
      if (old) base.seenBadgeIds = JSON.parse(old) as string[]
    } catch { /* ignore */ }
    return base
  }

  if (!record(value)) return value as GamificationState
  const g = value
  const xpEvents = g.xpEvents === undefined ? [] : g.xpEvents
  const rawAwardedKeys = g.awardedKeys === undefined ? [] : g.awardedKeys
  const awardedKeys = Array.isArray(rawAwardedKeys)
    ? [...new Set([
        ...rawAwardedKeys,
        ...(Array.isArray(xpEvents)
          ? xpEvents.flatMap(event => record(event) && typeof event.key === 'string' ? [event.key] : [])
          : []),
      ])]
    : rawAwardedKeys

  return {
    ...g,
    xp: g.xp === undefined ? 0 : g.xp,
    level: g.level === undefined ? 1 : g.level,
    streakFreezes: g.streakFreezes === undefined ? 1 : g.streakFreezes,
    freezeUsedDates: g.freezeUsedDates === undefined ? [] : g.freezeUsedDates,
    freezeEarnedMonth: g.freezeEarnedMonth === undefined ? '' : g.freezeEarnedMonth,
    pauseStartedDate: g.pauseStartedDate === undefined ? null : g.pauseStartedDate,
    pauseProtectedDates: g.pauseProtectedDates === undefined ? [] : g.pauseProtectedDates,
    xpEvents,
    awardedKeys,
    pendingLevelUp: g.pendingLevelUp === undefined ? null : g.pendingLevelUp,
    seenBadgeIds: g.seenBadgeIds === undefined ? base.seenBadgeIds : g.seenBadgeIds,
    // Nutrition-outcome quests were removed from the healthy-engagement
    // policy. A legacy same-day quest is regenerated on the next session.
    quest: record(g.quest) && g.quest.type === 'hit_protein'
      ? undefined
      : g.quest,
    gems: typeof g.gems === 'number' ? g.gems : 0,
    gemEvents: Array.isArray(g.gemEvents) ? g.gemEvents : [],
    waterByDate: record(g.waterByDate) ? g.waterByDate as Record<string, number> : {},
    notesByDate: record(g.notesByDate) ? g.notesByDate as Record<string, number> : {},
    ownedCosmeticIds: Array.isArray(g.ownedCosmeticIds) ? g.ownedCosmeticIds : [],
    equippedCosmeticId: typeof g.equippedCosmeticId === 'string' || g.equippedCosmeticId === null
      ? g.equippedCosmeticId
      : null,
    outfit: normalizeOutfit(g.outfit, g.equippedCosmeticId),
    repairsUsedMonth: typeof g.repairsUsedMonth === 'string' ? g.repairsUsedMonth : '',
    mascotActivity: g.mascotActivity === 'calm' || g.mascotActivity === 'off' || g.mascotActivity === 'lively'
      ? g.mascotActivity
      : 'lively',
    enamelQuests: enamelQuests(g.enamelQuests),
    brokenOn: typeof g.brokenOn === 'string' || g.brokenOn === null ? g.brokenOn : null,
    brokenFrom: typeof g.brokenFrom === 'number' ? g.brokenFrom : 0,
    startedAt: typeof g.startedAt === 'string' && g.startedAt
      ? g.startedAt
      : `${localDayKey(new Date())}T12:00:00.000`,
  } as unknown as GamificationState
}

export function defaultGamification(): GamificationState {
  return {
    xp: 0,
    level: 1,
    streakFreezes: 1,
    freezeUsedDates: [],
    freezeEarnedMonth: localDayKey(new Date()).slice(0, 7),
    pauseStartedDate: null,
    pauseProtectedDates: [],
    xpEvents: [],
    awardedKeys: [],
    pendingLevelUp: null,
    seenBadgeIds: [],
    gems: 0,
    gemEvents: [],
    waterByDate: {},
    notesByDate: {},
    ownedCosmeticIds: [],
    equippedCosmeticId: null,
    outfit: {},
    repairsUsedMonth: '',
    mascotActivity: 'lively',
    brokenOn: null,
    brokenFrom: 0,
    startedAt: `${localDayKey(new Date())}T12:00:00.000`,
  }
}

export function freshState(): AppState {
  return {
    onboarded: false,
    profile: defaultProfile(),
    foodEntries: [],
    weightEntries: [],
    exerciseEntries: [],
    favoriteMeals: [],
    chatMessages: [],
    aiSettings: defaultAISettings(),
    gamification: defaultGamification(),
  }
}

export function exportData(state: AppState): string {
  return JSON.stringify(stateWithoutPrivateSecrets(state), null, 2)
}

export function importData(json: string, localApiKey = '', localSettings?: AISettings): AppState {
  const raw = JSON.parse(json) as unknown
  const validation = validateAppState(raw, new Date(), { allowLegacyGamification: true })
  if (!validation.ok) throw new Error(validation.error)
  const parsed = raw as AppState
  const normalized = normalizeState(parsed)
  const profileIssue = profileInputIssue(normalized.profile)
  if (profileIssue) throw new Error(profileIssue)
  return {
    ...normalized,
    aiSettings: {
      ...normalized.aiSettings,
      apiKey: localSettings && aiConnectionsMatch(localSettings, normalized.aiSettings) ? localApiKey : '',
    },
  }
}

export function dayKey(date: Date): string {
  return localDayKey(date)
}

export function entriesForDay(entries: FoodEntry[], date: Date): FoodEntry[] {
  const key = dayKey(date)
  return entries
    .filter(e => entryDayKey(e) === key)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function macroTotals(entries: FoodEntry[]) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}
