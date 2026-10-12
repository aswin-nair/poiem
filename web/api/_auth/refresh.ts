import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withApiTelemetry } from '../_lib/telemetry.js'
import { clearRefreshCookie, setRefreshCookie } from '../_lib/cookies.js'
import { prepareAuth } from '../_lib/ensureAuthSchema.js'
import { InvalidJsonError, json, methodNotAllowed, readJson, serverError, unauthorized } from '../_lib/http.js'
import { signSession } from '../_lib/jwt.js'
import { readPresentedRefreshToken, resolveSessionTransport } from '../_lib/mobileClient.js'
import { enforceAuthRateLimit, RateLimitExceeded } from '../_lib/rateLimit.js'
import { RefreshNotFoundError, RefreshReplayError, rotateRefreshToken } from '../_lib/sessions.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res)
  if (!await prepareAuth(res)) return

  try {
    await enforceAuthRateLimit(req, 'refresh')
    const body = await readJson<{ client?: string; refreshToken?: string }>(req)
    const presented = readPresentedRefreshToken(req, body)
    if (!presented) {
      clearRefreshCookie(res, req)
      return unauthorized(res)
    }
    const rotated = await rotateRefreshToken(presented)
    const token = await signSession(rotated.user, rotated.id)
    if (resolveSessionTransport(req, body) === 'mobile') {
      return json(res, 200, { token, user: rotated.user, refreshToken: rotated.refreshToken })
    }
    setRefreshCookie(res, rotated.refreshToken, rotated.expiresAt, req)
    return json(res, 200, { token, user: rotated.user })
  } catch (err) {
    if (err instanceof RefreshReplayError || err instanceof RefreshNotFoundError || err instanceof InvalidJsonError) {
      clearRefreshCookie(res, req)
      return unauthorized(res)
    }
    if (err instanceof RateLimitExceeded) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      return json(res, 429, { error: 'Too many requests. Try again later.' })
    }
    // A temporary server failure does not prove that the refresh token is
    // invalid. Keep its cookie so the browser can retry after recovery.
    return serverError(res, err)
  }
}
export default withApiTelemetry('/api/auth/refresh', handler)
