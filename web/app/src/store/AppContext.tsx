import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { restoreDeletedEntry } from '../lib/entryUndo'
import { IconCloud, IconOffline, IconShield } from '../components/icons'

import type {

  AppState, FoodEntry, UserProfile, AISettings, FoodAnalysis,

  WeightEntry, ChatMessage, SavedMeal, ExerciseEntry, GamificationState,

} from '../types'

import {
  clearUserState,
  exportData,
  freshState,
  importData,
  loadPrivateAIKey,
  loadState,
  savePrivateAIKey,
  stateWithoutPrivateSecrets,
} from '../lib/storage'

import { stampLocalDate } from '@fud-ai/product/localDate'
import { mealKey, entryToSaved, savedToEntry } from '../lib/meals'

import { useAuth } from './AuthContext'

import { authTokenSubject } from '../lib/auth'

import { accessTokenForAccount, ApiError, apiLoadState, apiSaveState, loadAuthToken } from '../lib/apiClient'

import {
  acknowledgeMutation,
  claimNextMutation,
  clearDurableUser,
  durableOutboxSummary,
  durableStorageKind,
  DurableRecoveryError,
  enqueueDurableMutation,
  hasDurableMutation,
  loadDurableState,
  migrateLegacyState,
  recordMutationFailure,
  rebaseDurableConflict,
  rebindDurableMutations,
  resolveDurableConflictWithServer,
  releaseMutationLeases,
  replaceDurableFromServer,
  saveDurableLocalSnapshot,
} from '../lib/durableState'

import { isCloudBackend } from '../lib/dataBackend'


import { advanceAfterLog, openSession, transitionTrackingPause } from '../lib/gamification'
import { clearAnalytics, finishLogFlow } from '../lib/analytics'
import { clearOnboardingDraft } from '../lib/onboarding'
import { clearNotificationHistory } from '../lib/notifications'
import { clearLogDraft, hydrateLogDrafts } from '../lib/logDrafts'
import { finalizeGuestClaim, guestUserId, hasPendingGuestClaim } from '../lib/guestMode'

import { SplashScreen } from '../components/SplashScreen'
import { PressableButton } from '../components/PressableButton'
import {
  SPLASH_EXIT_MS,
  SPLASH_HOLD_MS,
  SPLASH_SHOW_AFTER_MS,
  SPLASH_SLOW_MS,
  shouldSkipSplash,
  splashHoldRemaining,
  splashRevealWait,
} from '../lib/splashTiming'

/* The brand splash plays once per browser session. Reloads, deep links and
   sign-ins after that go straight to the page as soon as the data is ready. */
const SPLASH_SEEN_KEY = 'poiem-splash-seen'

function splashSeenThisSession(): boolean {
  try { return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1' } catch { return false }
}

function markSplashSeen(): void {
  try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* private mode */ }
}

class CloudSyncUnavailableError extends Error {
  constructor() {
    super('Cloud sync is paused until the account is reloaded.')
    this.name = 'CloudSyncUnavailableError'
  }
}

function tokenIssuedAt(token: string): number | null {
  try {
    const encoded = token.split('.')[1]
    if (!encoded) return null
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { iat?: unknown }
    return Number.isSafeInteger(payload.iat) ? payload.iat as number : null
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}



interface AppContextValue {

  state: AppState

  loading: boolean

  setOnboarded: (v: boolean) => void

  updateProfile: (profile: UserProfile) => void

  updateAISettings: (settings: AISettings) => void

  addEntry: (entry: FoodEntry) => void

  updateEntry: (entry: FoodEntry) => void

  deleteEntry: (id: string) => void
  restoreEntry: (entry: FoodEntry) => void

  addWeightEntry: (weightKg: number, date?: string) => void

  deleteWeightEntry: (id: string) => void

  toggleFavorite: (entry: FoodEntry | SavedMeal) => void

  logSavedMeal: (meal: SavedMeal) => FoodEntry

  addChatMessage: (msg: ChatMessage) => void

  clearChat: () => void

  replaceState: (state: AppState) => void

  clearAllData: () => Promise<boolean>

  ackLevelUp: () => void

  /** Re-pull from the backend and flush anything queued. Drives pull-to-refresh. */
  refresh: () => Promise<void>

  patchGamification: (updater: (g: GamificationState) => GamificationState) => void

  addExercise: (entry: ExerciseEntry) => void

  deleteExercise: (id: string) => void

  pendingAnalysis: FoodAnalysis | null

  setPendingAnalysis: (a: FoodAnalysis | null) => void

  /** Ephemeral evidence shown only while reviewing a photo analysis. Never persisted. */
  pendingImagePreview: string | null

  setPendingImagePreview: (preview: string | null) => void

  pendingSource: FoodEntry['source']

  setPendingSource: (s: FoodEntry['source']) => void

}



const AppContext = createContext<AppContextValue | null>(null)



export function AppProvider({ children, guest = false }: { children: ReactNode; guest?: boolean }) {

  const { user, signOut } = useAuth()

  const cloud = !guest && isCloudBackend()

  const userId = guest ? guestUserId() : user!.sub

  const [state, setState] = useState<AppState>(() => (cloud ? freshState() : loadState(userId)))

  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(false)
  const [slowSplash, setSlowSplash] = useState(false)

  const [cloudLoadError, setCloudLoadError] = useState(false)

  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)

  const [cloudSyncConflict, setCloudSyncConflict] = useState(false)

  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  const [networkOnline, setNetworkOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  )

  const [hydratedFromDevice, setHydratedFromDevice] = useState(false)

  const [storageRecovery, setStorageRecovery] = useState<string | null>(null)

  const [destructiveRecovery, setDestructiveRecovery] = useState(false)

  const [conflictExported, setConflictExported] = useState(false)

  const [conflictResolving, setConflictResolving] = useState(false)

  const [hydrateAttempt, setHydrateAttempt] = useState(0)

  const [splashExiting, setSplashExiting] = useState(false)

  const [pendingAnalysis, setPendingAnalysis] = useState<FoodAnalysis | null>(null)

  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)

  const [pendingSource, setPendingSource] = useState<FoodEntry['source']>('textInput')

  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hydrated = useRef(false)
  const cloudWritable = useRef(!cloud)
  const cloudVersion = useRef(0)
  const drainPromise = useRef<Promise<void> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drainOutboxRef = useRef<() => Promise<void>>(async () => undefined)
  const syncEpoch = useRef(0)
  const clearInFlight = useRef(false)
  const forceNextPersist = useRef(false)
  const suppressNextPersist = useRef<string | null>(null)
  const leaseOwner = useRef(crypto.randomUUID())
  // Bind writes to this account. A later login in another tab may replace the
  // in-memory token; only a same-subject refresh is adopted.
  const cloudSessionToken = useRef(cloud ? loadAuthToken() : null)

  const boundSessionToken = useCallback((): string | null => {
    const next = accessTokenForAccount(userId, cloudSessionToken.current)
    if (next) cloudSessionToken.current = next
    return next
  }, [userId])

  const drainOutbox = useCallback(async (): Promise<void> => {
    if (!cloud || !cloudWritable.current || !networkOnline) return
    if (drainPromise.current) return drainPromise.current

    const sessionToken = boundSessionToken()
    const sessionSubject = sessionToken ? authTokenSubject(sessionToken) : null
    const sessionIssuedAt = sessionToken ? tokenIssuedAt(sessionToken) : null
    if (!sessionToken || sessionSubject !== userId) throw new CloudSyncUnavailableError()
    const epoch = syncEpoch.current

    let task: Promise<void>
    task = (async () => {
      while (epoch === syncEpoch.current && cloudWritable.current) {
        const claimed = await claimNextMutation(
          userId,
          sessionSubject,
          sessionIssuedAt,
          leaseOwner.current,
        )
        if (claimed.kind === 'empty') break
        if (claimed.kind === 'wait') {
          if (retryTimer.current) clearTimeout(retryTimer.current)
          retryTimer.current = setTimeout(
            () => void drainOutboxRef.current(),
            Math.max(0, claimed.retryAt - Date.now()),
          )
          break
        }
        if (claimed.kind === 'session-mismatch') {
          cloudWritable.current = false
          setCloudSyncConflict(true)
          setConflictExported(false)
          setCloudSyncError('Saved changes belong to a different account session.')
          break
        }

        const mutation = claimed.mutation
        setCloudSyncError(null)
        try {
          const nextVersion = await apiSaveState(
            mutation.state,
            mutation.baseVersion,
            sessionToken,
            mutation.mutationId,
          )
          if (epoch !== syncEpoch.current) throw new CloudSyncUnavailableError()
          const acknowledged = await acknowledgeMutation(
            userId,
            mutation.mutationId,
            leaseOwner.current,
            nextVersion,
          )
          cloudVersion.current = Math.max(cloudVersion.current, nextVersion)
          setPendingSyncCount(acknowledged.remaining)
          setCloudSyncConflict(false)
          setCloudSyncError(null)
          setHydratedFromDevice(false)
          if (acknowledged.remaining === 0 && hasPendingGuestClaim(userId)) {
            await finalizeGuestClaim(userId)
          }
          if (acknowledged.destructive) {
            const deletionCallerIsWaiting = clearInFlight.current
            const cleared = freshState()
            suppressNextPersist.current = JSON.stringify(stateWithoutPrivateSecrets(cleared))
            try {
              await clearDurableUser(userId)
              clearUserState(userId)
              clearOnboardingDraft(userId)
              clearLogDraft(userId)
              clearNotificationHistory()
              clearAnalytics()
            } catch {
              setStorageRecovery('Server deletion was confirmed, but some browser recovery storage still needs cleanup.')
            }
            setPendingAnalysis(null)
            setPendingImagePreview(null)
            setState(cleared)
            if (!deletionCallerIsWaiting) {
              setDestructiveRecovery(false)
              clearInFlight.current = false
            }
          }
        } catch (error) {
          if (epoch !== syncEpoch.current || error instanceof CloudSyncUnavailableError) throw error
          const message = error instanceof Error ? error.message : 'Changes could not be synced.'
          const retryAt = await recordMutationFailure(
            userId,
            mutation.mutationId,
            leaseOwner.current,
            message,
          )
          if (error instanceof ApiError && error.status === 401) {
            signOut()
            break
          }
          if (error instanceof ApiError && error.status === 409) {
            // Preserve the exact mutation and device snapshot. Recovery must be
            // explicit because silently replacing either side loses data.
            cloudWritable.current = false
            setCloudSyncConflict(true)
            setConflictExported(false)
            setCloudSyncError('This account changed on another device. Your device copy is preserved.')
            break
          }
          if (error instanceof ApiError && (error.status === 400 || error.status === 413)) {
            cloudWritable.current = false
            setCloudSyncConflict(true)
            setConflictExported(false)
            setCloudSyncError('A saved change needs recovery before the server can accept it. Your device copy is preserved.')
            break
          }
          setCloudSyncError(message)
          if (retryAt !== null) {
            if (retryTimer.current) clearTimeout(retryTimer.current)
            retryTimer.current = setTimeout(
              () => void drainOutboxRef.current(),
              Math.max(0, retryAt - Date.now()),
            )
          }
          break
        }
      }
    })().finally(async () => {
      if (drainPromise.current === task) drainPromise.current = null
      if (epoch !== syncEpoch.current) return
      try {
        const summary = await durableOutboxSummary(userId)
        setPendingSyncCount(summary.count)
        if (
          summary.count > 0
          && summary.nextAttemptAt !== null
          && cloudWritable.current
          && networkOnline
          && !retryTimer.current
        ) {
          retryTimer.current = setTimeout(
            () => void drainOutboxRef.current(),
            Math.max(0, summary.nextAttemptAt - Date.now()),
          )
        }
      } catch (error) {
        setStorageRecovery(error instanceof Error ? error.message : 'Device recovery storage is unavailable.')
      }
    })

    drainPromise.current = task
    return task
  }, [boundSessionToken, cloud, networkOnline, signOut, userId])

  drainOutboxRef.current = drainOutbox

  const saveCloudSnapshot = useCallback(async (
    snapshot: AppState,
    options: { destructive?: boolean; force?: boolean } = {},
  ): Promise<void> => {
    if (!cloud) return
    const sessionToken = boundSessionToken()
    const sessionSubject = sessionToken ? authTokenSubject(sessionToken) : null
    if (
      !sessionToken
      || sessionSubject !== userId
      || (clearInFlight.current && !options.destructive)
      || (options.destructive && (!cloudWritable.current || !networkOnline))
    ) {
      throw new CloudSyncUnavailableError()
    }

    const mutation = await enqueueDurableMutation({
      userId,
      sessionSubject,
      sessionIssuedAt: tokenIssuedAt(sessionToken),
      state: snapshot,
      confirmedVersion: cloudVersion.current,
      destructive: options.destructive,
      force: options.force,
    })
    if (!mutation) return
    const summary = await durableOutboxSummary(userId)
    setPendingSyncCount(summary.count)
    await drainOutbox()
    if (await hasDurableMutation(userId, mutation.mutationId)) {
      throw new CloudSyncUnavailableError()
    }
  }, [boundSessionToken, cloud, drainOutbox, networkOnline, userId])



  useEffect(() => {

    let cancelled = false
    let showTimer: ReturnType<typeof setTimeout> | undefined
    let slowTimer: ReturnType<typeof setTimeout> | undefined

    const epoch = syncEpoch.current + 1
    const currentLeaseOwner = leaseOwner.current
    syncEpoch.current = epoch
    drainPromise.current = null
    clearInFlight.current = false
    forceNextPersist.current = false
    suppressNextPersist.current = null

    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }

    hydrated.current = false
    cloudWritable.current = !cloud
    cloudVersion.current = 0

    setLoading(true)

    setCloudLoadError(false)

    setCloudSyncError(null)

    setCloudSyncConflict(false)

    setConflictExported(false)

    setConflictResolving(false)

    setPendingSyncCount(0)

    setHydratedFromDevice(false)

    setStorageRecovery(null)

    setDestructiveRecovery(false)

    setPendingAnalysis(null)

    setPendingImagePreview(null)

    setSplashExiting(false)
    setShowSplash(false)
    setSlowSplash(false)

    if (exitTimer.current) clearTimeout(exitTimer.current)



    async function hydrate() {

      const quiet = splashSeenThisSession()
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      let splashShown = false
      let splashShownAt = 0

      const revealSplash = () => {
        if (cancelled || splashShown) return
        splashShown = true
        splashShownAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
        setShowSplash(true)
        slowTimer = setTimeout(() => {
          if (!cancelled) setSlowSplash(true)
        }, SPLASH_SLOW_MS)
      }

      showTimer = setTimeout(revealSplash, SPLASH_SHOW_AFTER_MS)

      let hydrationFailed = false

      const hydration = (async () => {
        void hydrateLogDrafts(userId)
        let cached: Awaited<ReturnType<typeof loadDurableState>> = null
        try {
          cached = await loadDurableState(userId)
          if (!cached) cached = await migrateLegacyState(userId)
          if (cached?.storage === 'localStorage' || await durableStorageKind() === 'localStorage') {
            setStorageRecovery('IndexedDB is unavailable. Changes are using limited browser recovery storage.')
          }
          if (cached?.destructivePending) setDestructiveRecovery(true)
        } catch (error) {
          setStorageRecovery(error instanceof DurableRecoveryError
            ? 'A damaged device copy was isolated. Recovering from the account server.'
            : 'Device recovery storage is unavailable.')
          cached = null
        }

        if (!cloud) {
          const next = cached?.state ?? loadState(userId)
          try {
            if (!cached) await saveDurableLocalSnapshot(userId, next)
            if (!cancelled) setState(next)
            if (!guest && hasPendingGuestClaim(userId)) await finalizeGuestClaim(userId)
          } catch {
            hydrationFailed = true
          }
          return
        }

        const sessionToken = boundSessionToken()
        if (!sessionToken || authTokenSubject(sessionToken) !== userId) {
          signOut()
          return
        }
        const activeSessionIssuedAt = tokenIssuedAt(sessionToken)

        try {
          const remote = await apiLoadState(sessionToken)
          if (!Number.isSafeInteger(remote.version) || remote.version < 0) {
            throw new Error('The account state version is invalid.')
          }
          const remoteState = remote.state === null
            ? null
            : importData(JSON.stringify(remote.state), loadPrivateAIKey(userId))

          if (cached?.pendingCount) {
            // Replay the stable device mutations before considering the server
            // copy; replacing this state here would silently lose offline work.
            if (cached.pendingSessions.some(session => (
              session.subject !== userId || session.issuedAt !== activeSessionIssuedAt
            ))) {
              // The successful GET authenticated this replacement session, so
              // it can explicitly adopt same-account queued work.
              await rebindDurableMutations(userId, userId, activeSessionIssuedAt)
            }
            cloudVersion.current = cached.serverVersion
            cloudWritable.current = true
            setPendingSyncCount(cached.pendingCount)
            setHydratedFromDevice(true)
            if (!cancelled) setState(cached.state)
            return
          }

          if (
            remoteState
            && cached
            && (cached.origin === 'legacy' || cached.origin === 'local')
            && JSON.stringify(stateWithoutPrivateSecrets(cached.state))
              !== JSON.stringify(stateWithoutPrivateSecrets(remoteState))
          ) {
            // A pre-cloud device copy and an existing server copy are both
            // valuable. Queue the device copy against the observed version but
            // require an explicit retry before it may replace the server copy.
            cloudVersion.current = remote.version
            const mutation = await enqueueDurableMutation({
              userId,
              sessionSubject: userId,
              sessionIssuedAt: tokenIssuedAt(sessionToken),
              state: cached.state,
              confirmedVersion: remote.version,
              force: true,
            })
            setPendingSyncCount(mutation ? 1 : 0)
            cloudWritable.current = false
            setCloudSyncConflict(true)
            setConflictExported(false)
            setCloudSyncError('A saved device copy differs from this account. Both copies are preserved.')
            if (!cancelled) setState(cached.state)
            return
          }

          if (remoteState) {
            await replaceDurableFromServer(userId, remoteState, remote.version)
            if (hasPendingGuestClaim(userId)) await finalizeGuestClaim(userId)
            cloudVersion.current = remote.version
            cloudWritable.current = true
            if (!cancelled) setState(remoteState)
            return
          }

          if (cached?.origin === 'legacy' || cached?.origin === 'local') {
            cloudVersion.current = remote.version
            cloudWritable.current = true
            forceNextPersist.current = true
            if (!cancelled) setState(cached.state)
            return
          }

          const next = freshState()
          next.aiSettings.apiKey = loadPrivateAIKey(userId)
          await replaceDurableFromServer(userId, next, remote.version)
          cloudVersion.current = remote.version
          cloudWritable.current = true
          if (!cancelled) setState(next)
        } catch (error) {
          if (cancelled) return
          if (error instanceof ApiError && error.status === 401) {
            signOut()
            return
          }
          if (cached) {
            if (
              cached.pendingCount > 0
              && cached.pendingSessions.some(session => (
                session.subject !== userId || session.issuedAt !== activeSessionIssuedAt
              ))
            ) {
              setStorageRecovery('Reconnect to verify this session before recovering its queued changes.')
              hydrationFailed = true
              return
            }
            const retryableReadFailure = error instanceof ApiError
              && (error.status === 0 || error.status === 429 || error.status >= 500)
            if (!retryableReadFailure) {
              cloudVersion.current = cached.serverVersion
              cloudWritable.current = false
              setPendingSyncCount(cached.pendingCount)
              setHydratedFromDevice(true)
              setCloudSyncConflict(true)
              setConflictExported(false)
              setCloudSyncError('The account server copy could not be validated. Your device copy is preserved.')
              setState(cached.state)
              return
            }
            // A validated last-known snapshot is safe to edit offline. New
            // changes enter the durable outbox before any network retry.
            cloudVersion.current = cached.serverVersion
            cloudWritable.current = true
            setPendingSyncCount(cached.pendingCount)
            setHydratedFromDevice(true)
            setCloudSyncError('Offline. Changes are saved on this device.')
            setState(cached.state)
            return
          }
          // Do not expose an editable fresh state without either source.
          hydrationFailed = true
        }
      })()

      await hydration

      if (cancelled) return

      if (hydrationFailed) {
        clearTimeout(showTimer)
        clearTimeout(slowTimer)
        hydrated.current = false
        cloudWritable.current = false
        setLoading(false)
        setCloudLoadError(true)
        return
      }

      hydrated.current = true

      setState(s => {
        const opened = openSession(s)
        return { ...s, gamification: opened.gamification }
      })

      if (cloud) void drainOutboxRef.current()

      markSplashSeen()

      if (shouldSkipSplash(quiet, splashShown)) {
        clearTimeout(showTimer)
        setLoading(false)
        return
      }

      if (!splashShown) {
        await delay(splashRevealWait(startedAt, typeof performance !== 'undefined' ? performance.now() : Date.now()))
        if (cancelled) return
        revealSplash()
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      await delay(splashHoldRemaining(splashShownAt || now, now, SPLASH_HOLD_MS))
      if (cancelled) return

      setSplashExiting(true)

      exitTimer.current = setTimeout(() => {

        if (!cancelled) {

          setLoading(false)

          setSplashExiting(false)

        }

      }, SPLASH_EXIT_MS)

    }



    hydrate()

    return () => {

      cancelled = true
      clearTimeout(showTimer)
      clearTimeout(slowTimer)

      // Invalidate both queued work and the result handlers of in-flight work.
      if (syncEpoch.current === epoch) syncEpoch.current += 1

      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
      }

      void releaseMutationLeases(userId, currentLeaseOwner).catch(() => undefined)

      if (exitTimer.current) clearTimeout(exitTimer.current)

    }

  }, [boundSessionToken, userId, cloud, guest, hydrateAttempt, signOut])



  useEffect(() => {

    if (!hydrated.current) return

    const signature = JSON.stringify(stateWithoutPrivateSecrets(state))
    if (suppressNextPersist.current === signature) {
      suppressNextPersist.current = null
      return
    }



    if (cloud) {

      // Hydration is the gate that prevents an initial empty-state write. Once
      // hydrated, keep accepting durable device mutations even while a server
      // conflict pauses network delivery.
      if (clearInFlight.current) return

      const force = forceNextPersist.current
      forceNextPersist.current = false
      void saveCloudSnapshot(state, { force }).catch(() => undefined)
      return

    }

    savePrivateAIKey(userId, state.aiSettings.apiKey)
    void saveDurableLocalSnapshot(userId, state).catch(error => {
      setStorageRecovery(error instanceof Error ? error.message : 'Device recovery storage is unavailable.')
    })

  }, [userId, state, cloud, saveCloudSnapshot])

  useEffect(() => {
    if (!cloud) return

    function online() {
      setNetworkOnline(true)
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
      }
      if (hydratedFromDevice && pendingSyncCount === 0) {
        setHydrateAttempt(attempt => attempt + 1)
      } else {
        void drainOutboxRef.current()
      }
    }

    function offline() {
      setNetworkOnline(false)
      setCloudSyncError('Offline. Changes are saved on this device.')
    }

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [cloud, hydratedFromDevice, pendingSyncCount])

  useEffect(() => {
    if (cloud && networkOnline && hydrated.current) void drainOutboxRef.current()
  }, [cloud, networkOnline])



  useEffect(() => {

    if (user?.name && !state.profile.name && hydrated.current) {

      setState(s => ({ ...s, profile: { ...s.profile, name: user.name } }))

    }

  }, [user?.name, state.profile.name])

  function downloadConflictCopy(): void {
    const blob = new Blob([exportData(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fud-ai-device-copy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setConflictExported(true)
  }

  async function resolveCloudConflict(choice: 'server' | 'device', destructive = false): Promise<void> {
    if (!conflictExported || !networkOnline || conflictResolving) return
    const sessionToken = boundSessionToken()
    const sessionSubject = sessionToken ? authTokenSubject(sessionToken) : null
    if (!sessionToken || sessionSubject !== userId) {
      signOut()
      return
    }

    setConflictResolving(true)
    try {
      const remote = await apiLoadState(sessionToken)

      if (choice === 'server') {
        const serverState = remote.state === null
          ? freshState()
          : importData(JSON.stringify(remote.state), loadPrivateAIKey(userId))
        if (remote.state === null) serverState.aiSettings.apiKey = loadPrivateAIKey(userId)
        await resolveDurableConflictWithServer(userId, serverState, remote.version)
        suppressNextPersist.current = JSON.stringify(stateWithoutPrivateSecrets(serverState))
        cloudVersion.current = remote.version
        cloudWritable.current = true
        clearInFlight.current = false
        setPendingSyncCount(0)
        setCloudSyncConflict(false)
        setCloudSyncError(null)
        setHydratedFromDevice(false)
        setDestructiveRecovery(false)
        setConflictExported(false)
        setState(serverState)
        if (hasPendingGuestClaim(userId)) await finalizeGuestClaim(userId)
        return
      }

      const snapshot = destructive ? freshState() : state
      const rebased = await rebaseDurableConflict({
        userId,
        sessionSubject,
        sessionIssuedAt: tokenIssuedAt(sessionToken),
        state: snapshot,
        confirmedVersion: remote.version,
        destructive,
      })
      cloudVersion.current = remote.version
      cloudWritable.current = true
      clearInFlight.current = destructive
      setPendingSyncCount(1)
      setCloudSyncConflict(false)
      setCloudSyncError(null)
      setConflictExported(false)
      setDestructiveRecovery(destructive)
      await drainOutboxRef.current()
      if (await hasDurableMutation(userId, rebased.mutationId)) {
        throw new CloudSyncUnavailableError()
      }
      if (destructive) {
        clearInFlight.current = false
        setDestructiveRecovery(false)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        signOut()
        return
      }
      cloudWritable.current = false
      clearInFlight.current = false
      setCloudSyncConflict(true)
      setCloudSyncError(error instanceof Error
        ? `${error.message} Your downloaded device copy remains available.`
        : 'Conflict recovery failed. Your downloaded device copy remains available.')
    } finally {
      setConflictResolving(false)
    }
  }



  const value = useMemo<AppContextValue>(() => ({

    state,

    loading,

    setOnboarded: (v) => setState(s => ({ ...s, onboarded: v })),

    updateProfile: (profile) => setState(s => ({
      ...s,
      profile,
      gamification: transitionTrackingPause(
        s.gamification,
        Boolean(s.profile.trackingPaused),
        Boolean(profile.trackingPaused),
      ),
    })),

    updateAISettings: (aiSettings) => {
      savePrivateAIKey(userId, aiSettings.apiKey)
      setState(s => ({ ...s, aiSettings }))
    },

    addEntry: (entry) => {
      const stamped = { ...entry, localDate: entry.localDate ?? stampLocalDate(entry.timestamp) }
      finishLogFlow({
        entryId: stamped.id,
        source: stamped.source,
        mealSlot: stamped.mealType,
        firstLog: state.foodEntries.length === 0,
      })
      setState(s => {
        const advanced = advanceAfterLog(s, stamped)
        return {
          ...s,
          foodEntries: [...s.foodEntries, stamped],
          gamification: advanced.gamification,
        }
      })
    },

    updateEntry: (entry) => setState(s => ({

      ...s,

      foodEntries: s.foodEntries.map(e => e.id === entry.id ? entry : e),

    })),

    restoreEntry: (entry) => setState(s => ({
      ...s,
      foodEntries: restoreDeletedEntry(s.foodEntries, entry),
    })),

    deleteEntry: (id) => setState(s => ({

      ...s,

      foodEntries: s.foodEntries.filter(e => e.id !== id),

    })),

    addWeightEntry: (weightKg, date) => {

      const entry: WeightEntry = {

        id: crypto.randomUUID(),

        date: date ?? new Date().toISOString(),

        weightKg,

      }

      setState(s => ({

        ...s,

        weightEntries: [...s.weightEntries, entry],

        profile: { ...s.profile, weightKg },

      }))

    },

    deleteWeightEntry: (id) => setState(s => ({

      ...s,

      weightEntries: s.weightEntries.filter(w => w.id !== id),

    })),

    toggleFavorite: (entry) => {

      const key = mealKey(entry)

      setState(s => {

        const exists = s.favoriteMeals.some(f => mealKey(f) === key)

        return {

          ...s,

          favoriteMeals: exists

            ? s.favoriteMeals.filter(f => mealKey(f) !== key)

            : [...s.favoriteMeals, 'timestamp' in entry ? entryToSaved(entry) : entry],

        }

      })

    },

    logSavedMeal: (meal) => {
      const entry = savedToEntry(meal)
      finishLogFlow({
        entryId: entry.id,
        source: entry.source,
        mealSlot: entry.mealType,
        firstLog: state.foodEntries.length === 0,
      })
      setState(s => {
        const advanced = advanceAfterLog(s, entry)
        return { ...s, foodEntries: [...s.foodEntries, entry], gamification: advanced.gamification }
      })
      return entry
    },

    addChatMessage: (msg) => setState(s => ({

      ...s,

      chatMessages: [...s.chatMessages, msg],

    })),

    clearChat: () => setState(s => ({ ...s, chatMessages: [] })),

    replaceState: (next) => setState(next),

    /* Re-runs the same hydration the app does on open, and pushes anything
       still queued, so the gesture does real work rather than spinning. */
    refresh: async () => {
      setHydrateAttempt(attempt => attempt + 1)
      await drainOutbox().catch(() => undefined)
    },

    ackLevelUp: () => setState(s => ({
      ...s,
      gamification: { ...s.gamification, pendingLevelUp: null },
    })),

    patchGamification: (updater) => setState(s => ({
      ...s,
      gamification: updater(s.gamification),
    })),

    // The habit loop rewards meal logging. Optional activity data never
    // changes XP or mascot state.
    addExercise: (entry: ExerciseEntry) => setState(s => ({
      ...s,
      exerciseEntries: [...s.exerciseEntries, entry],
    })),

    deleteExercise: (id: string) => setState(s => ({

      ...s,

      exerciseEntries: s.exerciseEntries.filter(e => e.id !== id),

    })),

    clearAllData: async () => {

      const next = freshState()
      if (cloud) {
        // A disabled writer means no server acknowledgement can be claimed.
        if (!cloudWritable.current || clearInFlight.current || !networkOnline) return false
        clearInFlight.current = true
        setDestructiveRecovery(true)
        try {
          await saveCloudSnapshot(next, { destructive: true })
        } catch {
          // A failed destructive request is ambiguous (the response may have
          // been lost after commit). Stop all writes until an authoritative
          // reload establishes which state the server actually holds.
          cloudWritable.current = false
          setCloudSyncConflict(true)
          setConflictExported(false)
          clearInFlight.current = false
          try {
            const durable = await loadDurableState(userId)
            if (!durable?.destructivePending) setDestructiveRecovery(false)
          } catch {
            // Keep the recovery gate closed if device state cannot prove that
            // no authorized destructive mutation remains.
          }
          return false
        }
      } else {
        await clearDurableUser(userId)
        clearUserState(userId)
      }

      suppressNextPersist.current = JSON.stringify(stateWithoutPrivateSecrets(next))
      setState(next)
      clearInFlight.current = false
      setPendingSyncCount(0)
      setDestructiveRecovery(false)
      setPendingAnalysis(null)
      setPendingImagePreview(null)
      clearOnboardingDraft(userId)
      clearLogDraft(userId)
      clearNotificationHistory()
      clearAnalytics()
      return true
    },

    pendingAnalysis,

    setPendingAnalysis,

    pendingImagePreview,

    setPendingImagePreview,

    pendingSource,

    setPendingSource,

  }), [state, loading, pendingAnalysis, pendingImagePreview, pendingSource, userId, cloud, networkOnline, drainOutbox, saveCloudSnapshot])



  if (loading) {

    if (!showSplash) {
      return <div className="splash-pending" role="status" aria-busy="true" aria-label="Loading Poiem" />
    }
    return <SplashScreen exiting={splashExiting} slow={slowSplash} />

  }

  if (cloudLoadError) {

    return (
      <div className="app-shell">
        <main className="app-main onboarding-main">
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">We could not load your account</h1>
            <p className="onboarding-sub">
              {storageRecovery
                ? `${storageRecovery} Connect to the account server and retry before logging anything new.`
                : 'Your saved data was not changed. Check your connection and try again before logging anything new.'}
            </p>
            <PressableButton fullWidth label="Retry" onClick={() => setHydrateAttempt(attempt => attempt + 1)} />
            <PressableButton fullWidth variant="ghost" label="Sign out" onClick={signOut} />
          </div>
        </main>
      </div>
    )

  }

  if (destructiveRecovery) {
    return (
      <div className="app-shell">
        <main className="app-main onboarding-main">
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Finishing your data deletion</h1>
            <p className="onboarding-sub">
              The deletion request is safely saved on this device. Download the preserved device copy, then choose whether to delete the latest server data or cancel deletion and use it.
            </p>
            <PressableButton fullWidth label="Download device copy" onClick={downloadConflictCopy} />
            <PressableButton
              fullWidth
              variant="secondary"
              disabled={!networkOnline || !conflictExported || conflictResolving}
              onClick={() => void resolveCloudConflict('device', true)}
            >
              {conflictResolving ? 'Checking account…' : 'Delete latest server data'}
            </PressableButton>
            <PressableButton
              fullWidth
              variant="ghost"
              disabled={!networkOnline || !conflictExported || conflictResolving}
              onClick={() => void resolveCloudConflict('server')}
            >
              Cancel deletion and use server copy
            </PressableButton>
            <PressableButton fullWidth variant="ghost" label="Sign out" onClick={signOut} />
          </div>
        </main>
      </div>
    )
  }



  const syncMessage = cloudSyncConflict
    ? `${cloudSyncError ?? 'Sync needs recovery.'} Download the device copy before choosing which version to keep.`
    : !networkOnline
      ? `Offline. ${pendingSyncCount > 0 ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} saved on this device.` : 'Your saved device copy is available.'}`
      : cloudSyncError
        ? `${cloudSyncError} ${pendingSyncCount > 0 ? 'Retry is scheduled.' : ''}`
        : pendingSyncCount > 0
          ? `Syncing ${pendingSyncCount} saved change${pendingSyncCount === 1 ? '' : 's'}…`
          : hydratedFromDevice
            ? 'Recovered your last saved device copy. Sync is checking the account server.'
            : storageRecovery



  return (
    <AppContext.Provider value={value}>
      {syncMessage && (
        <div
          className="cloud-sync-banner"
          role={cloudSyncConflict ? 'alert' : 'status'}
          aria-live={cloudSyncConflict ? 'assertive' : 'polite'}
        >
          {!networkOnline ? <IconOffline /> : cloudSyncConflict || cloudSyncError ? <IconShield /> : <IconCloud />}
          <span>{syncMessage}</span>
          {(pendingSyncCount > 0 || cloudSyncConflict || cloudSyncError) && (
            <div>
              {cloudSyncConflict ? (
                <>
                  <button type="button" onClick={downloadConflictCopy}>
                    Download device copy
                  </button>
                  <button
                    type="button"
                    disabled={!networkOnline || !conflictExported || conflictResolving}
                    onClick={() => void resolveCloudConflict('device')}
                  >
                    Use device copy
                  </button>
                  <button
                    type="button"
                    disabled={!networkOnline || !conflictExported || conflictResolving}
                    onClick={() => void resolveCloudConflict('server')}
                  >
                    Use server copy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!networkOnline}
                  onClick={() => {
                    if (hydratedFromDevice && pendingSyncCount === 0) {
                      setHydrateAttempt(attempt => attempt + 1)
                      return
                    }
                    void drainOutboxRef.current()
                  }}
                >
                  {hydratedFromDevice && pendingSyncCount === 0 ? 'Check account' : 'Sync now'}
                </button>
              )}
              <button type="button" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      )}
      {children}
    </AppContext.Provider>
  )

}



export function useApp() {

  const ctx = useContext(AppContext)

  if (!ctx) throw new Error('useApp must be used within AppProvider')

  return ctx

}

export function isFavorite(state: AppState, entry: FoodEntry): boolean {

  const key = mealKey(entry)

  return state.favoriteMeals.some(f => mealKey(f) === key)

}

