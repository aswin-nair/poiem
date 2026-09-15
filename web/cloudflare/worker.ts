import { json } from '../api/_lib/http.js'
import { APP_SECURITY_HEADERS } from '../shared/browserSecurityHeaders.js'
import { runVercelHandler, type VercelHandler } from './vercelAdapter.js'

import account from '../api/account.js'
import auth from '../api/auth.js'
import retention from '../api/cron/retention.js'
import entities from '../api/entities.js'
// @ts-expect-error The managed-AI handler is plain JavaScript without type declarations.
import gemini from '../api/gemini.js'
import health from '../api/health.js'
import migrations from '../api/migrations.js'
import ready from '../api/ready.js'
import state from '../api/state.js'
import ai from '../api/ai.js'
import admin from '../api/admin.js'

/*
 * Poiem on Cloudflare: one Worker serves the app, the API and the daily job.
 *
 *   /              -> the public Poiem welcome page
 *   /api/...       -> the existing API handlers, through the Vercel adapter
 *   /app, /app/... -> the product application
 *   anything else  -> static files at the root of the build (brand kit, icons)
 */

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  ASSETS: AssetFetcher
}

interface ScheduledEventLike {
  cron: string
  scheduledTime: number
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void
}

const APP_PREFIX = '/app'

export const API_ROUTES: Readonly<Record<string, VercelHandler>> = {
  '/api/account': account,
  '/api/auth': auth,
  '/api/cron/retention': retention,
  '/api/entities': entities,
  '/api/gemini': gemini as VercelHandler,
  '/api/health': health,
  '/api/migrations': migrations,
  '/api/ready': ready,
  '/api/state': state,
  '/api/ai': ai,
  '/api/admin': admin,
}

export function matchApiRoute(pathname: string): { handler: VercelHandler; params: Record<string, string> } | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const exact = API_ROUTES[path]
  if (exact) return { handler: exact, params: {} }
  // Vercel rewrote /api/auth/:action to /api/auth?action=:action.
  const authAction = /^\/api\/auth\/([A-Za-z0-9-]+)$/.exec(path)
  if (authAction) return { handler: API_ROUTES['/api/auth'], params: { action: authAction[1] } }
  const aiAction = /^\/api\/ai\/([A-Za-z0-9-]+)$/.exec(path)
  if (aiAction) return { handler: API_ROUTES['/api/ai'], params: { action: aiAction[1] } }
  const adminAction = /^\/api\/admin\/([A-Za-z0-9-]+)$/.exec(path)
  if (adminAction) return { handler: API_ROUTES['/api/admin'], params: { action: adminAction[1] } }
  return null
}

const notFound: VercelHandler = (_req, res) => json(res, 404, { error: 'Not found' })

function withAppHeaders(response: Response): Response {
  const next = new Response(response.body, response)
  for (const { key, value } of APP_SECURITY_HEADERS) next.headers.set(key, value)
  return next
}

/** A path whose last segment has no file extension is an in-app route. */
function isClientRoute(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? ''
  return !last.includes('.')
}

export async function serveApp(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const assetPath = url.pathname.slice(APP_PREFIX.length) || '/'
  let response = await env.ASSETS.fetch(new Request(new URL(`${assetPath}${url.search}`, url), request))
  if (response.status === 404 && isClientRoute(assetPath)) {
    // /app/login, /app/progress and the rest have no file: they all load the
    // single-page app, which then routes on the client.
    response = await env.ASSETS.fetch(new Request(new URL('/', url), request))
  }
  return withAppHeaders(response)
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const route = matchApiRoute(pathname)
    return route
      ? runVercelHandler(route.handler, request, route.params)
      : runVercelHandler(notFound, request)
  }
  if (pathname === '/') {
    const response = await env.ASSETS.fetch(new Request(new URL('/', url), request))
    return withAppHeaders(response)
  }
  if (pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`)) return serveApp(request, env)
  return env.ASSETS.fetch(request)
}

/**
 * The daily retention job. It goes through the same handler Vercel's cron
 * called, so the CRON_SECRET check and the result logging stay in one place.
 */
export async function runRetention(origin = process.env.APP_ORIGIN || 'https://poiem.app'): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim() ?? ''
  const request = new Request(new URL('/api/cron/retention', origin), {
    method: 'POST',
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
  const response = await runVercelHandler(retention, request)
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'retention_cron_failed', status: response.status }))
  }
  return response
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env)
  },
  async scheduled(_event: ScheduledEventLike, _env: Env, ctx: ExecutionContextLike): Promise<void> {
    ctx.waitUntil(runRetention())
  },
}
