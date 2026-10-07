import { describe, expect, it } from 'vitest'
import {
  MOMO_INTERLUDES, MOMO_INTERLUDE_IDLE_MS, MOMO_INTERLUDE_VISIBLE_MS,
  momoInterludeAllowed, momoInterludeBudget, momoInterludeDelay,
  momoInterludeRoute, nextMomoInterlude, readMomoInterludeLedger,
} from './momoInterludes'

describe('Momo interludes', () => {
  it('waits before the first visit and spaces later visits, with a quieter Calm cadence', () => {
    expect(momoInterludeDelay('lively', true, () => 0)).toBe(18_000)
    expect(momoInterludeDelay('lively', true, () => 1)).toBe(35_000)
    expect(momoInterludeDelay('lively', false, () => 0)).toBe(75_000)
    expect(momoInterludeDelay('lively', false, () => 1)).toBe(150_000)
    expect(momoInterludeDelay('calm', true, () => 0)).toBe(45_000)
    expect(momoInterludeDelay('calm', true, () => 1)).toBe(90_000)
    expect(momoInterludeDelay('calm', false, () => 0)).toBe(180_000)
    expect(momoInterludeDelay('calm', false, () => 1)).toBe(300_000)
    expect(MOMO_INTERLUDE_IDLE_MS).toBe(4_500)
    expect(MOMO_INTERLUDE_VISIBLE_MS).toBe(9_000)
  })

  it('limits session visits and honours mute, hide and tracking pause', () => {
    expect(momoInterludeBudget('lively')).toBe(4)
    expect(momoInterludeBudget('calm')).toBe(2)
    expect(momoInterludeBudget('off')).toBe(0)
    expect(momoInterludeAllowed({}, 'lively')).toBe(true)
    expect(momoInterludeAllowed({}, 'calm')).toBe(true)
    expect(momoInterludeAllowed({}, 'off')).toBe(false)
    expect(momoInterludeAllowed({ mascotMuted: true }, 'lively')).toBe(false)
    expect(momoInterludeAllowed({ trackingPaused: true }, 'lively')).toBe(false)
  })

  it('keeps focused workflows, Coach, auth and Support clear', () => {
    for (const route of ['/', '/progress', '/discover', '/about', '/journey']) expect(momoInterludeRoute(route), route).toBe(true)
    for (const route of ['/log', '/log/text', '/log/photo', '/log/saved', '/log/manual', '/review', '/edit/meal', '/settings', '/coach', '/login', '/forgot-password', '/reset-password', '/onboarding', '/support', '/admin', '/dev/components', '/welcome']) {
      expect(momoInterludeRoute(route), route).toBe(false)
    }
  })

  it('draws local jokes without replacement and only repeats after the pool cycles', () => {
    let ledger = { visits: 0, seen: [] as string[] }
    const lines: string[] = []
    for (let i = 0; i < MOMO_INTERLUDES.length; i++) {
      const next = nextMomoInterlude(ledger, () => 0)
      lines.push(next.entry.id)
      ledger = next.ledger
    }
    expect(new Set(lines).size).toBe(MOMO_INTERLUDES.length)
    expect(ledger.seen).toHaveLength(MOMO_INTERLUDES.length)
    const cycled = nextMomoInterlude(ledger, () => 0)
    expect(cycled.entry.id).toBe(lines[0])
    expect(cycled.ledger.seen).toEqual([lines[0]])
    expect(cycled.ledger.visits).toBe(MOMO_INTERLUDES.length + 1)
  })

  it('reads only bounded local session history and ignores foreign ids', () => {
    expect(readMomoInterludeLedger(null)).toEqual({ visits: 0, seen: [] })
    expect(readMomoInterludeLedger({ visits: -1, seen: ['unknown', 4, 'tabs', 'tabs'] })).toEqual({ visits: 0, seen: ['tabs'] })
    expect(readMomoInterludeLedger({ visits: 999, seen: 'not-an-array' })).toEqual({ visits: 4, seen: [] })
    expect(readMomoInterludeLedger({ visits: 2, seen: ['pockets'] })).toEqual({ visits: 2, seen: ['pockets'] })
  })

  it('keeps invalid random sources bounded', () => {
    expect(momoInterludeDelay('lively', true, () => -1)).toBe(18_000)
    expect(momoInterludeDelay('lively', true, () => 2)).toBe(35_000)
    expect(momoInterludeDelay('lively', true, () => Number.NaN)).toBe(26_500)
    expect(nextMomoInterlude({ visits: 0, seen: [] }, () => 1).entry.id).toBe(MOMO_INTERLUDES.at(-1)!.id)
  })
})
