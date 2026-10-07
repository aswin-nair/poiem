import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { eligibleNotificationKinds, type NotificationEligibilityInput } from '@fud-ai/domain/notifications'
import { describe, expect, it } from 'vitest'

const fixture = JSON.parse(readFileSync(
  resolve(process.cwd(), '../../packages/domain/fixtures/notifications.v2.json'),
  'utf8',
)) as {
  schemaVersion: number
  cases: Array<{
    id: string
    input: NotificationEligibilityInput
    kinds: string[]
  }>
}

describe('shared notifications.v2 web adapter', () => {
  it('uses the supported fixture schema', () => {
    expect(fixture.schemaVersion).toBe(2)
  })

  it.each(fixture.cases)('$id', testCase => {
    expect(eligibleNotificationKinds(testCase.input)).toEqual(testCase.kinds)
  })
})
