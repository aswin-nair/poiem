import { authTokenSubject, type AuthUser } from './auth'
import type { AppState } from '../types'
import { apiBaseUrl, isCloudBackend } from './dataBackend'
import { stateWithoutPrivateSecrets } from './storage'

const LEGACY_TOKEN_KEY = 'fud-ai-auth-token'
const API_TIMEOUT_MS = 12_000
const NO_REFRESH_PATHS = new Set([
  '/api/auth/refresh',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
])

let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function saveAuthToken(token: string): void {
  accessToken = token
  clearLegacyAuthToken()
}

export function loadAuthToken(): string | null {
  return accessToken
}

export function clearAuthToken(): void {
  accessToken = null
  clearLegacyAuthToken()
}

export function clearLegacyAuthToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Private mode or a blocked storage write must not keep a 30-day bearer.
  }
}

/** Prefer a refreshed in-memory token only when it still belongs to this account. */
export function accessTokenForAccount(userId: string, captured?: string | null): string | null {
  const live = loadAuthToken()
  if (live && authTokenSubject(live) === userId) return live
  if (captured && authTokenSubject(captured) === userId) return captured
  return null
}

export async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const result = await apiFetch<{ token?: string }>('/api/auth/refresh', { method: 'POST' })
      if (typeof result.token !== 'string' || !result.token) return false
      saveAuthToken(result.token)
      return true
    } catch {
      return false
    }
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  sessionToken?: string,
  allowRefresh = true,
  timeoutMs = API_TIMEOUT_MS,
): Promise<T> {
  const base = apiBaseUrl()
  const url = `${base}${path}`
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = sessionToken === undefined ? loadAuthToken() : sessionToken
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  const abortFromCaller = () => controller.abort()
  init.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (init.signal?.aborted) controller.abort()
  let res: Response
  let data: ({ error?: string } & T)
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include', signal: controller.signal })
    try {
      data = await res.json() as { error?: string } & T
    } catch (error) {
      if (controller.signal.aborted) throw error
      data = {} as { error?: string } & T
    }
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out. Check your connection and try again.', 0)
    }
    throw new ApiError('Could not reach the server. Your saved changes will retry automatically.', 0)
  } finally {
    globalThis.clearTimeout(timeout)
    init.signal?.removeEventListener('abort', abortFromCaller)
  }

  if (
    res.status === 401
    && allowRefresh
    && !NO_REFRESH_PATHS.has(path)
    && await tryRefreshAccessToken()
  ) {
    const next = loadAuthToken()
    const sameAccount = Boolean(
      token
      && next
      && authTokenSubject(token)
      && authTokenSubject(token) === authTokenSubject(next),
    )
    if (next && (sessionToken === undefined || sameAccount)) {
      return apiFetch<T>(path, init, sessionToken === undefined ? undefined : next, false, timeoutMs)
    }
  }

  if (!res.ok) {
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export async function apiRegister(name: string, email: string, password: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiGoogleAuth(credential: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export async function apiRefreshSession(): Promise<{ token: string; user: AuthUser } | null> {
  try {
    const result = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/refresh', {
      method: 'POST',
    })
    if (typeof result.token !== 'string' || !result.user?.sub) return null
    saveAuthToken(result.token)
    return result
  } catch {
    clearAuthToken()
    return null
  }
}

export async function apiForgotPassword(email: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function apiResetPassword(token: string, password: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function apiLoadState(
  sessionToken: string,
): Promise<{ state: unknown | null; version: number }> {
  if (!isCloudBackend()) return { state: null, version: 0 }
  const result = await apiFetch<{ state: unknown | null; version: number }>(
    '/api/state',
    {},
    sessionToken,
  )
  if (!Number.isSafeInteger(result.version) || result.version < 0) {
    throw new ApiError('The account state version is invalid.', 0)
  }
  return result
}

export async function apiLogout(sessionToken: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' }, sessionToken)
}

export async function apiLogoutAll(sessionToken: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/auth/logout-all', { method: 'POST' }, sessionToken)
}

export async function apiDeleteAccount(sessionToken: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation: 'DELETE' }),
  }, sessionToken)
}

export async function apiSaveState(
  state: AppState,
  baseVersion: number,
  sessionToken: string,
  mutationId: string,
): Promise<number> {
  if (!isCloudBackend()) return baseVersion
  const result = await apiFetch<{ version: number }>('/api/state', {
    method: 'PUT',
    body: JSON.stringify({
      state: stateWithoutPrivateSecrets(state),
      baseVersion,
      mutationId,
    }),
  }, sessionToken)
  if (!Number.isSafeInteger(result.version) || result.version <= baseVersion) {
    throw new ApiError('The saved account version is invalid.', 0)
  }
  return result.version
}

export async function apiHealth(): Promise<{ live: boolean; requestId: string; release: string }> {
  return apiFetch('/api/health')
}

export async function apiReady(): Promise<{ ready: boolean; requestId: string; release: string }> {
  return apiFetch('/api/ready')
}
