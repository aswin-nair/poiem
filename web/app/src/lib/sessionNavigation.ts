import { journalDayFromNavState, localDayKey } from './dates'
import { mealTypeFromNavState } from './logContext'

export const SESSION_NAVIGATION_KEY = 'poiem-session-return-v1'
export const SESSION_RETURN_TTL_MS = 30 * 60 * 1000

export interface SessionDestination {
  pathname: string
  search: string
  state?: { mealType?: string; firstMeal?: boolean; journalDay?: string }
}

interface SessionNavigation extends SessionDestination {
  version: 1
  accountId: string
  expiresAt: number
  pending: boolean
}

const ROUTES = new Set([
  '/', '/progress', '/coach', '/log', '/log/text', '/log/photo', '/log/manual',
  '/log/saved', '/discover', '/review', '/settings', '/about', '/support', '/journey', '/onboarding',
])
const PANELS = new Set(['profile', 'preferences', 'momo', 'ai', 'account', 'data'])

/** Navigation only: never copy credentials, estimates, photos, receipts, or arbitrary history state. */
export function safeSessionDestination(pathname: unknown, search: unknown = '', state?: unknown): SessionDestination | null {
  if (typeof pathname !== 'string' || (!ROUTES.has(pathname) && !/^\/edit\/[A-Za-z0-9_-]{1,100}$/.test(pathname))) return null
  let safeSearch = ''
  if (pathname === '/settings' && typeof search === 'string') {
    const panel = new URLSearchParams(search).get('panel')
    if (panel && PANELS.has(panel)) safeSearch = `?panel=${panel}`
  }
  const safeState: NonNullable<SessionDestination['state']> = {}
  if (pathname.startsWith('/log') || pathname === '/review' || pathname === '/discover') {
    const mealType = mealTypeFromNavState(state)
    if (mealType) safeState.mealType = mealType
    if (state && typeof state === 'object' && (state as { firstMeal?: unknown }).firstMeal === true) safeState.firstMeal = true
  }
  if (pathname === '/') {
    const day = journalDayFromNavState(state)
    if (day) safeState.journalDay = localDayKey(day)
  }
  return { pathname, search: safeSearch, ...(Object.keys(safeState).length ? { state: safeState } : {}) }
}

export function clearSessionNavigation(): void {
  try { sessionStorage.removeItem(SESSION_NAVIGATION_KEY) } catch { /* Navigation still works without storage. */ }
}

function readSessionNavigation(now = Date.now()): SessionNavigation | null {
  try {
    const raw = sessionStorage.getItem(SESSION_NAVIGATION_KEY)
    if (!raw) return null
    const candidate = JSON.parse(raw) as Partial<SessionNavigation>
    const destination = safeSessionDestination(candidate.pathname, candidate.search, candidate.state)
    if (!destination || candidate.version !== 1 || typeof candidate.accountId !== 'string'
      || !candidate.accountId || candidate.accountId.length > 300 || typeof candidate.pending !== 'boolean'
      || typeof candidate.expiresAt !== 'number' || !Number.isFinite(candidate.expiresAt)
      || candidate.expiresAt <= now || candidate.expiresAt > now + SESSION_RETURN_TTL_MS) {
      clearSessionNavigation()
      return null
    }
    return { ...destination, version: 1, accountId: candidate.accountId, pending: candidate.pending, expiresAt: candidate.expiresAt }
  } catch {
    clearSessionNavigation()
    return null
  }
}

export function rememberSessionNavigation(accountId: string, destination: SessionDestination, now = Date.now()): void {
  const safe = safeSessionDestination(destination.pathname, destination.search, destination.state)
  if (!safe || !accountId || accountId.length > 300) return
  const previous = readSessionNavigation(now)
  // Sign-in mounts the account before its provider has hydrated. Keep its pending destination until then.
  if (previous?.pending && previous.accountId === accountId) return
  try {
    sessionStorage.setItem(SESSION_NAVIGATION_KEY, JSON.stringify({ ...safe, version: 1, accountId, pending: false, expiresAt: now + SESSION_RETURN_TTL_MS }))
  } catch { /* A browser that blocks storage simply lands on Today. */ }
}

export function markSessionNavigationExpired(accountId: string, now = Date.now()): void {
  const saved = readSessionNavigation(now)
  if (!saved || saved.accountId !== accountId) {
    clearSessionNavigation()
    return
  }
  try {
    sessionStorage.setItem(SESSION_NAVIGATION_KEY, JSON.stringify({ ...saved, pending: true, expiresAt: now + SESSION_RETURN_TTL_MS }))
  } catch { /* Best effort. */ }
}

export function acceptSessionAccount(accountId: string): void {
  const saved = readSessionNavigation()
  if (saved && saved.accountId !== accountId) clearSessionNavigation()
}

/** A single use return, consumed only after the authenticated account and its drafts are ready. */
export function takeSessionReturn(accountId: string): SessionDestination | null {
  const saved = readSessionNavigation()
  if (!saved?.pending) return null
  clearSessionNavigation()
  if (saved.accountId !== accountId) return null
  return { pathname: saved.pathname, search: saved.search, ...(saved.state ? { state: saved.state } : {}) }
}

export function getSessionReturnLabel(): string | null {
  const saved = readSessionNavigation()
  if (!saved?.pending) return null
  if (saved.pathname === '/review') return 'your meal review'
  if (saved.pathname === '/settings') return 'your settings'
  if (saved.pathname === '/onboarding') return 'your setup'
  if (saved.pathname === '/progress') return 'your insights'
  if (saved.pathname === '/coach') return 'AI Coach'
  if (saved.pathname === '/discover' || saved.pathname === '/log/saved') return 'your saved meals'
  if (saved.pathname.startsWith('/log') || saved.pathname.startsWith('/edit/')) return 'your meal'
  return 'your journal'
}

/** Browser paths include the optional hosting basename; stored paths are router-relative. */
export function currentSessionDestination(): SessionDestination | null {
  if (typeof window === 'undefined') return null
  const pathname = window.location.pathname.replace(/^\/app(?=\/|$)/, '') || '/'
  return safeSessionDestination(pathname, window.location.search, window.history.state?.usr)
}
