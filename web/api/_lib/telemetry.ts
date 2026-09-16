import { AsyncLocalStorage } from 'node:async_hooks'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  buildTelemetryEnvelope,
  deliverRemoteTelemetry,
  durationBucket,
  isRemoteTelemetryEnabled,
  resultClassForStatus,
  type ApiResultClass,
} from './contracts.js'
import { applyIdentityHeaders, releaseId, requestIdFrom, serverError } from './http.js'

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

interface ApiObservation {
  requestId: string
  route: string
  method: string
  startedAt: number
  emitted: boolean
}

const observation = new AsyncLocalStorage<ApiObservation>()

const API_ROUTES = new Set([
  '/api/health',
  '/api/ready',
  '/api/state',
  '/api/account',
  '/api/entities',
  '/api/migrations',
  '/api/gemini',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/apple',
  '/api/auth/logout',
  '/api/auth/logout-all',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/change-password',
  '/api/cron/retention',
  '/api/ai',
  '/api/admin',
])

function environment(): 'dev' | 'staging' | 'production' | 'test' {
  const raw = (process.env.VERCEL_ENV || process.env.NODE_ENV || 'dev').toLowerCase()
  if (raw === 'production' || raw === 'preview') return raw === 'production' ? 'production' : 'staging'
  if (raw === 'test') return 'test'
  return 'dev'
}

function errorClassFor(status: number, resultClass: ApiResultClass): string | undefined {
  if (resultClass === 'ok') return undefined
  if (status === 401 || status === 403) return 'auth_failure'
  if (resultClass === 'rate_limited') return 'rate_limited'
  if (resultClass === 'conflict') return 'conflict'
  if (resultClass === 'unavailable') return 'unavailable'
  if (resultClass === 'server_error') return 'unhandled'
  return 'validation'
}

function emitApiEnvelope(input: {
  requestId: string
  route: string
  method: string
  status: number
  startedAt: number
}): void {
  const durationMs = Math.max(0, Date.now() - input.startedAt)
  const resultClass = resultClassForStatus(input.status)
  const built = buildTelemetryEnvelope({
    event: {
      name: 'api_request',
      request_id: input.requestId,
      route: input.route,
      method: input.method,
      status: input.status,
      duration_ms: Math.min(durationMs, 120_000),
      duration_bucket: durationBucket(durationMs),
      result_class: resultClass,
      release: releaseId(),
      ...(errorClassFor(input.status, resultClass)
        ? { error_class: errorClassFor(input.status, resultClass) }
        : {}),
    },
    eventId: input.requestId,
    environment: environment(),
    release: releaseId(),
    platform: 'api',
    appSurface: input.route,
  })
  if (!built.ok) return
  console.error(JSON.stringify(built.value))
  if (isRemoteTelemetryEnabled(process.env.ENABLE_REMOTE_TELEMETRY)) {
    deliverRemoteTelemetry(built.value)
  }
}

export function emitApiRequestLog(status: number): void {
  const store = observation.getStore()
  if (!store || store.emitted) return
  store.emitted = true
  emitApiEnvelope({
    requestId: store.requestId,
    route: store.route,
    method: store.method,
    status,
    startedAt: store.startedAt,
  })
}

export function emitStandaloneApiRequest(input: {
  requestId: string
  route: '/api/gemini'
  method: string
  status: number
  startedAt: number
}): void {
  const method = HTTP_METHODS.has(input.method) ? input.method : 'GET'
  emitApiEnvelope({ ...input, method })
}

export function emitManagedAiInvoked(requestId: string, status: number, route: '/api/gemini' | '/api/ai' = '/api/gemini'): void {
  const built = buildTelemetryEnvelope({
    event: { name: 'managed_ai_invoked', request_id: requestId, status },
    eventId: requestId,
    environment: environment(),
    release: releaseId(),
    platform: 'api',
    appSurface: route,
  })
  if (!built.ok) return
  console.error(JSON.stringify(built.value))
}

export function withApiTelemetry(
  route: string,
  handler: (req: VercelRequest, res: VercelResponse) => unknown,
) {
  if (!API_ROUTES.has(route)) {
    throw new RangeError(`Unknown API route template: ${route}`)
  }

  return async function observedHandler(req: VercelRequest, res: VercelResponse) {
    const requestId = requestIdFrom(req)
    // Make the generated ID available to handlers that emit a secondary
    // operational event for the same request.
    if (req.headers) req.headers['x-request-id'] = requestId
    applyIdentityHeaders(res, requestId)
    const rawMethod = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET'
    const method = HTTP_METHODS.has(rawMethod) ? rawMethod : 'GET'
    const store: ApiObservation = {
      requestId,
      route,
      method,
      startedAt: Date.now(),
      emitted: false,
    }

    return observation.run(store, async () => {
      try {
        return await handler(req, res)
      } catch (err) {
        if (res.statusCode == null || res.statusCode < 400) {
          serverError(res, err)
          return undefined
        }
        throw err
      } finally {
        if (typeof res.statusCode === 'number') emitApiRequestLog(res.statusCode)
      }
    })
  }
}
