import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from './_lib/authenticate.js'
import { prepareAuth } from './_lib/ensureAuthSchema.js'
import { InvalidSessionError } from './_lib/jwt.js'
import { InvalidJsonError, json, readJson, serverError } from './_lib/http.js'
import { effectivePlan, loadPlanConfig, loadPlanUser } from './_lib/plan.js'
import { AiInputError, AiProviderError, liveModels, validatePlanConfig } from './_lib/aiProvider.js'
import { commitPlanConfig, commitUserPlan, lookupPlanUser } from './_lib/adminPlans.js'
import { listAdminAudit, loadAdminUsage } from './_lib/adminOps.js'
import { enforceAccountActionRateLimit, RateLimitExceeded } from './_lib/rateLimit.js'
import { withApiTelemetry } from './_lib/telemetry.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!await prepareAuth(res)) return
  try {
    const session = await authenticateRequest(req)
    const admin = await loadPlanUser(session.sub)
    if (admin.is_admin !== true) return json(res, 403, { error: 'Administrator access required' })
    await enforceAccountActionRateLimit(req, session.sub, 'admin')
    const action = typeof req.query?.action === 'string' ? req.query.action : (req.url ?? '').split('?')[0].match(/^\/api\/admin\/([a-z-]+)$/)?.[1]
    if (action === 'models' && req.method === 'GET') return json(res, 200, { models: await liveModels() })
    if (action === 'plans' && req.method === 'GET') return json(res, 200, { plans: await Promise.all([loadPlanConfig('free'), loadPlanConfig('premium')]) })
    if (action === 'usage' && req.method === 'GET') return json(res, 200, { usage: await loadAdminUsage() })
    if (action === 'audit' && req.method === 'GET') return json(res, 200, { audit: await listAdminAudit() })
    if (action === 'user' && req.method === 'GET') {
      const query = req.query?.query
      if (typeof query !== 'string' || !query.trim() || query.length > 254) throw new AiInputError('Enter an exact email or user ID')
      const user = await lookupPlanUser(query)
      return json(res, 200, { user: user ? { ...user, effectivePlan: effectivePlan(user as never) } : null })
    }
    if (req.method === 'PUT' && (action === 'plans' || action === 'user')) {
      if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})) > 12000) return json(res, 413, { error: 'Request is too large' })
      const body = await readJson<unknown>(req)
      if (action === 'plans') {
        if (!body || typeof body !== 'object' || !('plan' in body) || (body.plan !== 'free' && body.plan !== 'premium')) {
          throw new AiInputError('Invalid plan, provider or daily limits')
        }
        let catalogue = null
        try { catalogue = await liveModels() } catch { catalogue = null }
        const previous = await loadPlanConfig(body.plan)
        const config = await validatePlanConfig(body, { catalogue, previous })
        await commitPlanConfig(config, session.sub)
      } else {
        await commitUserPlan(body, session.sub)
      }
      return json(res, 200, { ok: true })
    }
    return json(res, action === 'plans' || action === 'models' || action === 'user' || action === 'usage' || action === 'audit' ? 405 : 404, { error: 'Unsupported admin action or method' })
  } catch (error) {
    if (error instanceof InvalidSessionError) return json(res, 401, { error: 'Sign in required' })
    if (error instanceof AiInputError || error instanceof InvalidJsonError) return json(res, 400, { error: error instanceof AiInputError ? error.message : 'Invalid JSON body' })
    if (error instanceof RateLimitExceeded) { res.setHeader('Retry-After', String(error.retryAfterSeconds)); return json(res, 429, { error: 'Too many admin requests. Try again shortly.' }) }
    if (error instanceof AiProviderError) return json(res, 503, { error: 'The model catalogue is unavailable. Plan and account controls are still available.' })
    return serverError(res, error)
  }
}
export default withApiTelemetry('/api/admin', handler)
