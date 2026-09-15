import { randomUUID } from 'node:crypto'
import type { VercelRequest } from '@vercel/node'
import { asRows, getDb } from './db.js'
import { clientIp, privateBucketHash } from './rateLimit.js'
import { dailyGlobalMax, dailyIpMax, nextReset } from './plan.js'
import type { UsageTask } from '../../shared/aiPlans.js'

export class AiQuotaError extends Error {
  constructor(readonly code: string, readonly resetAt = nextReset()) { super('Managed AI capacity unavailable'); this.name = 'AiQuotaError' }
}
export async function reserveUsage(req: VercelRequest, user: string, task: UsageTask, limit: number): Promise<string> {
  const sql = getDb(), id = randomUUID()
  const ip = privateBucketHash(['managed-ai', 'ip', clientIp(req)])
  const rows = asRows<{ outcome: string }>(await sql`
    SELECT reserve_ai_usage(${id}::uuid, ${user}::uuid, ${task}, ${limit}, ${ip}, ${dailyGlobalMax()}, ${dailyIpMax()}) AS outcome
  `)
  if (rows[0]?.outcome !== 'ok') throw new AiQuotaError(rows[0]?.outcome ?? 'global_limit')
  return id
}
export async function reserveFallback(id: string): Promise<void> {
  const sql = getDb()
  const rows = asRows<{ outcome: string }>(await sql`SELECT reserve_ai_fallback(${id}::uuid, ${dailyGlobalMax()}, ${dailyIpMax()}) AS outcome`)
  if (rows[0]?.outcome !== 'ok') throw new AiQuotaError(rows[0]?.outcome ?? 'global_limit')
}
export async function finishUsage(id: string, success: boolean): Promise<boolean> {
  const sql = getDb()
  const rows = asRows<{ finished: boolean }>(await sql`SELECT finish_ai_usage(${id}::uuid, ${success}) AS finished`)
  return rows[0]?.finished === true
}
