import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  localDateInZone,
  localHourInZone,
} from '@fud-ai/domain'
import { eligibleNotificationKinds } from '@fud-ai/domain'
import { planFreeze } from '@fud-ai/domain'
import { defaultMealSlot } from '@fud-ai/domain'
import { describe, expect, it } from 'vitest'

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(
    fileURLToPath(new URL(`../../../packages/domain/fixtures/${name}`, import.meta.url)),
    'utf8',
  )) as T
}

describe('shared policy fixtures on the API process', () => {
  it('assigns the same meal slots', () => {
    const fixture = loadFixture<{ cases: Array<{ hour: number; slot: string }> }>('meals.v1.json')
    for (const testCase of fixture.cases) {
      expect(defaultMealSlot(testCase.hour)).toBe(testCase.slot)
    }
  })

  it('plans the same freezes', () => {
    const fixture = loadFixture<{
      cases: Array<{
        loggedDates: string[]
        freezeDates: string[]
        today: string
        available: number
        cover: string[]
        protectedStreak: number
      }>
    }>('freezes.v1.json')
    for (const testCase of fixture.cases) {
      expect(planFreeze(
        testCase.loggedDates,
        testCase.freezeDates,
        testCase.today,
        testCase.available,
      )).toEqual({
        cover: testCase.cover,
        protectedStreak: testCase.protectedStreak,
      })
    }
  })

  it('keeps notification eligibility identical', () => {
    const fixture = loadFixture<{
      schemaVersion: number
      cases: Array<{ input: Parameters<typeof eligibleNotificationKinds>[0]; kinds: string[] }>
    }>('notifications.v2.json')
    expect(fixture.schemaVersion).toBe(2)
    for (const testCase of fixture.cases) {
      expect(eligibleNotificationKinds(testCase.input)).toEqual(testCase.kinds)
    }
  })

  it('resolves DST and travel instants in an explicit zone', () => {
    const fixture = loadFixture<{
      cases: Array<{ instant: string; timeZone: string; date: string; hour: number }>
    }>('calendar.v1.json')
    for (const testCase of fixture.cases) {
      const instant = new Date(testCase.instant)
      expect(localDateInZone(instant, testCase.timeZone)).toBe(testCase.date)
      expect(localHourInZone(instant, testCase.timeZone)).toBe(testCase.hour)
    }
  })
})
