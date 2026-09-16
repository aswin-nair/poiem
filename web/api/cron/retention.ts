import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, isDbConfigured } from '../_lib/db.js'
import { json, methodNotAllowed, unauthorized } from '../_lib/http.js'
import { withApiTelemetry } from '../_lib/telemetry.js'
import type {
  DeletionOrphanCounts,
  RetentionCleanupCounts,
} from '../_lib/retention.js'
import { formatDeletionOrphans, formatRetentionCleanup } from '../_lib/retention.js'

// The job SQL lives in the shared JS module used by the operator CLI.
// @ts-expect-error JS retention jobs have no project-local types.
import { runRetentionJobs } from '../../scripts/retention-jobs.mjs'

function bearer(req: VercelRequest): string {
  const value = req.headers.authorization ?? req.headers.Authorization
  return typeof value === 'string' ? value : ''
}

function cronConfigured(): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? ''
  return secret.length >= 16 && isDbConfigured()
}

function cronAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? ''
  return secret.length >= 16 && bearer(req) === `Bearer ${secret}`
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res)
    return
  }
  if (!cronConfigured()) {
    json(res, 503, { error: 'Retention cron is not configured' })
    return
  }
  if (!cronAuthorized(req)) {
    unauthorized(res)
    return
  }

  try {
    const db = getDb()
    const result = await runRetentionJobs(db) as {
      cleanup: RetentionCleanupCounts
      orphans: DeletionOrphanCounts
    }
    json(res, 200, {
      ok: true,
      cleanup: result.cleanup,
      orphans: result.orphans,
    })
    console.error(JSON.stringify({
      event: 'retention_cron',
      cleanup: formatRetentionCleanup(result.cleanup),
      orphans: formatDeletionOrphans(result.orphans),
    }))
  } catch (error) {
    console.error(JSON.stringify({ event: 'retention_cron_error', error: error instanceof Error ? error.name : 'unknown' }))
    json(res, 500, { error: 'Retention job failed' })
  }
}

export default withApiTelemetry('/api/cron/retention', handler)
