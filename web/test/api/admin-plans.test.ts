import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ sql: vi.fn() }))
vi.mock('../../api/_lib/db.js', () => ({
  getDb: () => db.sql,
  asRows: (result: unknown) => result,
}))

vi.mock('../../api/_lib/adminOps.js', () => ({
  ensureAdminOpsSchema: vi.fn(async () => undefined),
}))

import { commitPlanConfig, parseUserPlanUpdate } from '../../api/_lib/adminPlans.js'
import { AiInputError } from '../../api/_lib/aiProvider.js'

const config = {
  plan: 'free' as const,
  provider: 'openrouter' as const,
  model: 'google/gemma-4-31b-it',
  fallback_models: [] as string[],
  daily_food: 20,
  daily_coach: 0,
}

describe('atomic admin writes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks, updates, and audits the plan in one statement', async () => {
    db.sql.mockResolvedValue([{ id: 'audit-1' }])
    await commitPlanConfig({ ...config, daily_food: 25 }, '00000000-0000-4000-8000-000000000001')
    expect(db.sql).toHaveBeenCalledTimes(1)
    const query = (db.sql.mock.calls[0][0] as readonly string[]).join(' ')
    expect(query).toContain('FOR UPDATE')
    expect(query).toContain('UPDATE ai_plan_config')
    expect(query).toContain('INSERT INTO admin_audit')
    expect(query).toContain('to_jsonb(locked)')
  })

  it('reports failure when the write does not insert an audit row', async () => {
    db.sql.mockResolvedValue([])
    await expect(commitPlanConfig(config, '00000000-0000-4000-8000-000000000001'))
      .rejects.toBeInstanceOf(AiInputError)
  })

  it('rejects an entitlement payload before touching the database', () => {
    expect(() => parseUserPlanUpdate({ userId: 'nope', plan: 'premium', status: 'active' })).toThrow(AiInputError)
  })
})
