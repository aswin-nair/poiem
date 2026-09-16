import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from './_lib/authenticate.js'
import { prepareAuth } from './_lib/ensureAuthSchema.js'
import { InvalidSessionError } from './_lib/jwt.js'
import { InvalidJsonError, json, readJson, serverError, requestIdFrom } from './_lib/http.js'
import { emitManagedAiInvoked } from './_lib/telemetry.js'
import { consumeTokenBucket, clientIp, privateBucketHash } from './_lib/rateLimit.js'
import { effectivePlan, getAiStatus, loadPlanConfig, loadPlanUser, managedAiEnabled, nextReset } from './_lib/plan.js'
import { AiQuotaError, finishUsage, reserveUsage } from './_lib/aiQuota.js'
import { AiInputError, AiProviderError, callManagedProvider, validateManagedPayload } from './_lib/aiProvider.js'
import { withApiTelemetry } from './_lib/telemetry.js'
import type { ManagedTask } from '../shared/aiPlans.js'

export function aiAction(req: VercelRequest, prefix = 'ai'): string {
  if (typeof req.query?.action === 'string') return req.query.action
  return (req.url ?? '').split('?')[0].match(new RegExp('^/api/' + prefix + '/([a-z-]+)$'))?.[1] ?? ''
}
async function handler(req: VercelRequest, res: VercelResponse) {
  const action = aiAction(req)
  if (action !== 'status' && action !== 'analyze') return json(res, 404, { error: 'Not found' })
  if (req.method !== (action === 'status' ? 'GET' : 'POST')) return json(res, 405, { error: 'Method not allowed' })
  if (!await prepareAuth(res)) return
  let reservation: string | undefined
  let completed = false
  try {
    if (!await consumeTokenBucket(privateBucketHash(['ai', 'ip', clientIp(req)]), { capacity: 60, refillPerSecond: 1 })) {
      res.setHeader('Retry-After', '60')
      return json(res, 429, { code: 'rate_limit', error: 'Too many requests. Try again shortly.' })
    }
    const session = await authenticateRequest(req)
    if (action === 'status') return json(res, 200, await getAiStatus(session.sub))
    if (!managedAiEnabled()) return json(res, 503, { code: 'managed_disabled', error: 'Account AI is temporarily unavailable. You can still log manually.' })
    if (Number(req.headers['content-length'] ?? 0) > 3_200_000 || Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})) > 3_200_000) {
      return json(res, 413, { code: 'payload_too_large', error: 'Photo or description is too large.' })
    }
    const body = await readJson<{ task?: unknown; payload?: unknown }>(req)
    if (!['food_text', 'food_photo', 'coach'].includes(String(body.task))) throw new AiInputError('Unsupported AI task')
    const task = body.task as ManagedTask
    const payload = validateManagedPayload(task, body.payload)
    const user = await loadPlanUser(session.sub), plan = effectivePlan(user)
    if (task === 'coach' && plan !== 'premium') return json(res, 403, { code: 'premium_required', error: 'Coach requires Premium or your own API key.' })
    const config = await loadPlanConfig(plan)
    reservation = await reserveUsage(req, session.sub, task === 'coach' ? 'coach' : 'food', task === 'coach' ? config.daily_coach : config.daily_food)
    const text = await callManagedProvider(config, task, payload, reservation)
    if (!await finishUsage(reservation, true)) throw new AiQuotaError('expired')
    completed = true
    emitManagedAiInvoked(requestIdFrom(req), 200, '/api/ai')
    return json(res, 200, { text })
  } catch (error) {
    if (error instanceof InvalidSessionError) return json(res, 401, { code: 'sign_in_required', error: 'Create a free account or sign in to scan food.' })
    if (error instanceof AiInputError || error instanceof InvalidJsonError) return json(res, 400, { code: 'invalid_input', error: error instanceof AiInputError ? error.message : 'Invalid JSON body' })
    if (error instanceof AiQuotaError) {
      const global = error.code === 'global_limit' || error.code === 'expired'
      const resetAt = error.resetAt || nextReset()
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((Date.parse(resetAt) - Date.now()) / 1000))))
      return json(res, global ? 503 : 429, { code: error.code, resetAt,
        error: global ? 'Account AI has reached its daily capacity. Please try again after the reset.'
          : error.code === 'user_limit' ? 'Your daily AI allowance is used up. Upgrade your plan or try again after the reset.'
          : 'This network has reached its daily AI allowance. Please try again after the reset.' })
    }
    if (error instanceof AiProviderError) return json(res, 502, { code: 'provider_unavailable', error: 'AI could not complete this request. Your daily allowance was not used.' })
    return serverError(res, error)
  } finally {
    if (reservation && !completed) {
      try { await finishUsage(reservation, false) } catch { /* Expiring reservations recover after worker/database failures. */ }
    }
  }
}
export default withApiTelemetry('/api/ai', handler)
