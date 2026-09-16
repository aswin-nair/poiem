import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  accessTokenForAccount,
  apiDeleteAccount,
  apiLoadState,
  apiLogout,
  apiLogoutAll,
  apiSaveState,
  clearAuthToken,
  clearLegacyAuthToken,
  saveAuthToken,
} from './apiClient'
import { freshState } from './storage'

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

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('session-bound state requests', () => {
  it('uses the captured account token instead of a replacement global token', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    const storage = memoryStorage()
    storage.setItem('fud-ai-auth-token', 'replacement-account-token')
    vi.stubGlobal('localStorage', storage)
    saveAuthToken('replacement-account-token')

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer captured-account-token')
      return new Response(JSON.stringify({ state: null, version: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiLoadState('captured-account-token')).resolves.toEqual({
      state: null,
      version: 0,
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sends the stable mutation ID and base version with a secret-free snapshot', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    vi.stubGlobal('localStorage', memoryStorage())
    const mutationId = '6a9b2cf3-d39c-4f0d-90d7-0c1b31a69635'
    const state = freshState()
    state.aiSettings.apiKey = 'sk-device-only'

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(Object.keys(body).sort()).toEqual(['baseVersion', 'mutationId', 'state'])
      expect(body.baseVersion).toBe(7)
      expect(body.mutationId).toBe(mutationId)
      expect(body.state).toMatchObject({ aiSettings: { apiKey: '' } })
      return new Response(JSON.stringify({ ok: true, version: 8 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiSaveState(state, 7, 'captured-account-token', mutationId)).resolves.toBe(8)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('turns a network failure into a retryable user-facing error', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down') }))

    await expect(apiLoadState('captured-account-token')).rejects.toMatchObject({
      status: 0,
      message: expect.stringMatching(/retry automatically/i),
    })
  })
})

function unsignedToken(sub: string, iat = 1): string {
  const payload = Buffer.from(JSON.stringify({ sub, iat })).toString('base64url')
  return `hdr.${payload}.sig`
}

describe('in-memory access tokens', () => {
  it('clears a legacy 30-day bearer from ordinary browser storage', () => {
    const storage = memoryStorage()
    storage.setItem('fud-ai-auth-token', 'legacy-30-day-token')
    vi.stubGlobal('localStorage', storage)
    saveAuthToken('short-lived-access')
    expect(localStorage.getItem('fud-ai-auth-token')).toBeNull()
    clearLegacyAuthToken()
    expect(localStorage.getItem('fud-ai-auth-token')).toBeNull()
  })

  it('adopts a refreshed token only when it still belongs to the same account', () => {
    const alice = '00000000-0000-4000-8000-000000000001'
    const bob = '00000000-0000-4000-8000-000000000002'
    const captured = unsignedToken(alice)
    const refreshed = unsignedToken(alice)
    saveAuthToken(refreshed)
    expect(accessTokenForAccount(alice, captured)).toBe(refreshed)
    saveAuthToken(unsignedToken(bob))
    expect(accessTokenForAccount(alice, captured)).toBe(captured)
    clearAuthToken()
    expect(accessTokenForAccount(alice, captured)).toBe(captured)
  })

  it('sends cookies and refreshes a captured token only for the same account', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    vi.stubGlobal('localStorage', memoryStorage())
    const alice = unsignedToken('00000000-0000-4000-8000-000000000001', 1)
    const aliceNext = unsignedToken('00000000-0000-4000-8000-000000000001', 2)
    const bob = unsignedToken('00000000-0000-4000-8000-000000000002', 3)
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.credentials).toBe('include')
      if (String(url).includes('action=refresh')) {
        return new Response(JSON.stringify({ token: aliceNext, user: { sub: '00000000-0000-4000-8000-000000000001' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const token = new Headers(init?.headers).get('Authorization')
      if (token === `Bearer ${alice}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      return new Response(JSON.stringify({ state: null, version: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiLoadState(alice)).resolves.toEqual({ state: null, version: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    fetchMock.mockClear()
    saveAuthToken(bob)
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('action=refresh')) {
        return new Response(JSON.stringify({ token: bob }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    })
    await expect(apiLoadState(alice)).rejects.toMatchObject({ status: 401 })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/state'))).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/state'))).toHaveLength(1)
  })
})

describe('account lifecycle requests', () => {
  it('targets the auth handler with a query action (no path rewrite required)', async () => {
    const { authApiPath } = await import('./apiClient')
    expect(authApiPath('google')).toBe('/api/auth?action=google')
  })
  it.each([
    ['logout', apiLogout, 'action=logout', 'POST'],
    ['logout-all', apiLogoutAll, 'action=logout-all', 'POST'],
  ] as const)('sends %s with the captured bearer', async (_name, action, path, method) => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain(path)
      expect(init?.method).toBe(method)
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer captured-token')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))

    await expect(action('captured-token')).resolves.toBeUndefined()
  })

  it('requires the explicit server confirmation value for account deletion', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain('/api/account')
      expect(init?.method).toBe('DELETE')
      expect(JSON.parse(String(init?.body))).toEqual({ confirmation: 'DELETE' })
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer captured-token')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))

    await expect(apiDeleteAccount('captured-token')).resolves.toBeUndefined()
  })
})
