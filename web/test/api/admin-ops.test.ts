import { describe, expect, it } from 'vitest'
import { deriveAdminUsage } from '../../api/_lib/adminOps.js'

describe('admin usage snapshot', () => {
  it('counts recorded fallback attempts instead of leftover reservation math', () => {
    const expiredUnfinished = deriveAdminUsage({
      foodUsed: 1,
      coachUsed: 0,
      successes: 1,
      failures: 0,
      attempts: 4,
      fallbackAttempts: 0,
      budgetLimit: 2000,
      day: '2026-09-17',
    })
    expect(expiredUnfinished.fallbacks).toBe(0)
    expect(expiredUnfinished.attempts).toBe(4)

    const withFallbacks = deriveAdminUsage({
      foodUsed: 1,
      coachUsed: 0,
      successes: 1,
      failures: 1,
      attempts: 4,
      fallbackAttempts: 2,
      budgetLimit: 2000,
      day: '2026-09-17',
    })
    expect(withFallbacks.fallbacks).toBe(2)
  })
})
