import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { journalDayFromNavState, localDayKey } from './dates'

describe('journalDayFromNavState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 10, 30))
  })
  afterEach(() => { vi.useRealTimers() })

  it('reads a past date as local midnight without changing the calendar day', () => {
    const date = journalDayFromNavState({ journalDay: '2026-09-18' })
    expect(date).toBeInstanceOf(Date)
    expect(localDayKey(date!)).toBe('2026-09-18')
    expect(date!.getHours()).toBe(0)
    expect(date!.getMinutes()).toBe(0)
    expect(date!.getSeconds()).toBe(0)
  })

  it('allows today and a real leap day', () => {
    expect(localDayKey(journalDayFromNavState({ journalDay: '2026-10-06' })!)).toBe('2026-10-06')
    expect(localDayKey(journalDayFromNavState({ journalDay: '2024-02-29' })!)).toBe('2024-02-29')
  })

  it.each([
    undefined, null, '2026-09-18', 1, [], {},
    { journalDay: null }, { journalDay: 20260918 },
    { journalDay: '2026-9-18' }, { journalDay: '2026-09-18T12:00:00' },
    { journalDay: '2026-02-29' }, { journalDay: '2026-04-31' },
    { journalDay: '2026-00-18' }, { journalDay: '2026-13-18' },
    { journalDay: '2026-10-07' },
  ])('rejects malformed, rolled-over or future navigation state: %j', state => {
    expect(journalDayFromNavState(state)).toBeUndefined()
  })
})
