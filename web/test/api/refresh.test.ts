import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request, response } from './helpers.js'

const mocks = vi.hoisted(() => {
  class RefreshReplayError extends Error {}
  class RefreshNotFoundError extends Error {}
  class RateLimitExceeded extends Error {
    retryAfterSeconds = 60
  }
  return {
    rotate: vi.fn(),
    sign: vi.fn(),
    rate: vi.fn(),
    RefreshReplayError,
    RefreshNotFoundError,
    RateLimitExceeded,
  }
})

vi.mock('../../api/_lib/sessions.js', () => ({
  rotateRefreshToken: mocks.rotate,
  RefreshReplayError: mocks.RefreshReplayError,
  RefreshNotFoundError: mocks.RefreshNotFoundError,
}))
vi.mock('../../api/_lib/jwt.js', () => ({
  signSession: mocks.sign,
}))
vi.mock('../../api/_lib/rateLimit.js', () => ({
  enforceAuthRateLimit: mocks.rate,
  RateLimitExceeded: mocks.RateLimitExceeded,
}))
vi.mock('../../api/_lib/ensureAuthSchema.js', () => ({
  prepareAuth: async () => true,
}))

import refreshHandler from '../../api/_auth/refresh.js'

const USER = {
  sub: '00000000-0000-4000-8000-000000000001',
  email: 'person@example.com',
  name: 'Person',
  provider: 'email' as const,
}

describe('refresh rotation', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://configured.example/test')
    mocks.rate.mockResolvedValue(undefined)
    mocks.sign.mockResolvedValue('short-lived-access')
    mocks.rotate.mockResolvedValue({
      id: '10000000-0000-4000-8000-000000000001',
      familyId: '20000000-0000-4000-8000-000000000002',
      expiresAt: new Date('2026-09-19T00:00:00.000Z'),
      refreshToken: 'rotated-refresh',
      user: USER,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('rotates the cookie and returns a short-lived access token', async () => {
    const res = response()
    await refreshHandler(request({
      method: 'POST',
      headers: { cookie: 'fud_refresh=current-refresh-token' },
    }) as never, res as never)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ token: 'short-lived-access', user: USER })
    expect(mocks.rotate).toHaveBeenCalledWith('current-refresh-token')
    expect(res.headers.get('set-cookie')).toContain('fud_refresh=rotated-refresh')
    expect(res.headers.get('set-cookie')).toContain('HttpOnly')
    expect(res.headers.get('set-cookie')).toContain('SameSite=Lax')
    expect(JSON.stringify(res.body)).not.toContain('rotated-refresh')
  })

  it('revokes the family after a replay and does not issue an access token', async () => {
    mocks.rotate.mockRejectedValue(new mocks.RefreshReplayError())
    const res = response()
    await refreshHandler(request({
      method: 'POST',
      headers: { cookie: 'fud_refresh=replayed-refresh-token' },
    }) as never, res as never)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
    expect(mocks.sign).not.toHaveBeenCalled()
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it.each(['rate limit lookup', 'session lookup'])(
    'preserves the refresh cookie when %s has a temporary server failure',
    async (step) => {
      const failure = new Error('Temporary account service failure')
      if (step === 'rate limit lookup') mocks.rate.mockRejectedValue(failure)
      else mocks.rotate.mockRejectedValue(failure)
      const res = response()
      await refreshHandler(request({
        method: 'POST',
        headers: { cookie: 'fud_refresh=current-refresh-token' },
      }) as never, res as never)

      expect(res.statusCode).toBe(500)
      expect(res.body).toEqual({ error: 'Internal server error' })
      expect(res.headers.get('set-cookie')).toBeUndefined()
      expect(mocks.sign).not.toHaveBeenCalled()
    },
  )

  it('preserves the refresh cookie when the caller must wait before retrying', async () => {
    mocks.rate.mockRejectedValue(new mocks.RateLimitExceeded())
    const res = response()
    await refreshHandler(request({
      method: 'POST',
      headers: { cookie: 'fud_refresh=current-refresh-token' },
    }) as never, res as never)

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'Too many requests. Try again later.' })
    expect(res.headers.get('retry-after')).toBe('60')
    expect(res.headers.get('set-cookie')).toBeUndefined()
    expect(mocks.rotate).not.toHaveBeenCalled()
  })

  it('still clears an inactive refresh cookie', async () => {
    mocks.rotate.mockRejectedValue(new mocks.RefreshNotFoundError())
    const res = response()
    await refreshHandler(request({
      method: 'POST',
      headers: { cookie: 'fud_refresh=inactive-refresh-token' },
    }) as never, res as never)

    expect(res.statusCode).toBe(401)
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(mocks.sign).not.toHaveBeenCalled()
  })

  it.each([
    { label: 'missing cookie', headers: {}, body: undefined },
    { label: 'invalid cookie', headers: { cookie: 'fud_refresh=short' }, body: undefined },
    {
      label: 'invalid JSON',
      headers: { cookie: 'fud_refresh=current-refresh-token' },
      body: '{invalid',
    },
  ])('still clears the cookie for $label', async ({ headers, body }) => {
    const res = response()
    await refreshHandler(request({ method: 'POST', headers, body }) as never, res as never)

    expect(res.statusCode).toBe(401)
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(mocks.rotate).not.toHaveBeenCalled()
    expect(mocks.sign).not.toHaveBeenCalled()
  })
})
