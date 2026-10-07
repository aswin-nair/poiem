import { describe, expect, it } from 'vitest'
import type { XpEvent } from '../types'
import { awardsSince, makeLogReceipt } from './logReceipt'

const entry = { id: 'meal-new', name: 'Lunch', calories: 400 }
const award = (key: string, timestamp = '1999-01-01T00:00:00.000Z'): XpEvent => ({
  id: `event-${key}`, key, xp: 10, label: key, timestamp,
})

describe('log receipts', () => {
  it('awardsSince returns exactly the keys appended after the receipt', () => {
    const first = award('first-new')
    const second = award('second-new')
    const ledger = {
      awardedKeys: ['old', 'first-new', 'missing-from-feed', 'second-new'],
      xpEvents: [second, award('unrelated', '2026-10-05T12:00:00.000Z'), first, award('old')],
    }

    expect(awardsSince(makeLogReceipt(entry, 1), ledger)).toEqual([first, second])
  })

  it('awardsSince tolerates an awardedFrom beyond the ledger', () => {
    expect(awardsSince(makeLogReceipt(entry, 20), {
      awardedKeys: ['old'], xpEvents: [award('old')],
    })).toEqual([])
  })

  it('makeLogReceipt carries the id, name, calories and count', () => {
    expect(makeLogReceipt(entry, 7)).toEqual({ ...entry, awardedFrom: 7 })
  })
})
