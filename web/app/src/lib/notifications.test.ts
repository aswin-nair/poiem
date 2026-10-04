import { MAX_NOTIFICATIONS_PER_DAY, NOTIFICATION_KINDS } from '@fud-ai/domain/notifications'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { localDayKey } from './dates'
import {
  bannedNotificationCopy,
  evaluateNotifications,
  notificationsSentToday,
  routineHour,
} from './notifications'

/**
 * §2.6 caps the app at two notifications a day, and §8 asks for that to be
 * enforced in code rather than by convention — so these drive the real
 * evaluate path rather than asserting on the constant.
 *
 * Runs against stubs instead of jsdom: the module only needs localStorage and
 * Notification, and two small fakes are cheaper than a DOM.
 */

const sent: string[] = []

function installStubs() {
  const store = new Map<string, string>()

  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })

  class FakeNotification {
    static permission = 'granted'
    static requestPermission = async () => 'granted'
    constructor(_title: string, opts: { body: string }) {
      sent.push(opts.body)
    }
  }

  vi.stubGlobal('Notification', FakeNotification)
}

/** Evening, nothing logged: the state that allows the routine nudge. */
const RIPE = {
  loggedToday: false,
  firstLogHours: [] as number[],
  localHour: 20,
}

const NUDGE = 'Your journal is here whenever you’re ready.'

beforeEach(() => {
  sent.length = 0
  installStubs()
})

describe('the two-per-day cap', () => {
  it('sends the routine nudge once, never more', async () => {
    await evaluateNotifications(RIPE)
    expect(sent.length).toBe(1)

    // Called again the way an app open would call it.
    await evaluateNotifications(RIPE)
    await evaluateNotifications(RIPE)

    expect(sent.length).toBe(1)
    expect(notificationsSentToday()).toBe(1)
  })

  it('counts across repeated evaluation within the hour', async () => {
    for (let i = 0; i < 10; i++) await evaluateNotifications(RIPE)

    expect(sent.length).toBeLessThanOrEqual(MAX_NOTIFICATIONS_PER_DAY)
  })

  it('a stored log with legacy kinds does not crash and still respects the cap', async () => {
    localStorage.setItem(
      'fud-notify-log',
      JSON.stringify({ date: localDayKey(new Date()), kinds: ['save', 'freeze'] }),
    )

    await expect(evaluateNotifications(RIPE)).resolves.toBeUndefined()

    // The two legacy entries already fill the day's cap.
    expect(sent.length).toBe(0)
    expect(notificationsSentToday()).toBe(2)
  })

  it('a stored log with a single legacy kind still lets the routine nudge send once', async () => {
    localStorage.setItem(
      'fud-notify-log',
      JSON.stringify({ date: localDayKey(new Date()), kinds: ['save'] }),
    )

    await evaluateNotifications(RIPE)
    await evaluateNotifications(RIPE)

    // The legacy entry counts toward the cap, so the day ends at two.
    expect(sent.length).toBe(1)
    expect(notificationsSentToday()).toBe(2)
  })
})

describe('kinds', () => {
  it('has the routine nudge and nothing else', () => {
    expect(NOTIFICATION_KINDS).toEqual(['routine'])
  })
})

describe('suppression rules', () => {
  it('sends nothing while paused', async () => {
    await evaluateNotifications({ ...RIPE, trackingPaused: true })

    expect(sent).toEqual([])
    expect(notificationsSentToday()).toBe(0)
  })

  it('sends nothing once logged today', async () => {
    await evaluateNotifications({ ...RIPE, loggedToday: true })

    expect(sent).toEqual([])
  })

  it('waits for the routine hour', async () => {
    await evaluateNotifications({ ...RIPE, localHour: 10 })

    expect(sent).toEqual([])
  })
})

describe('routine hour', () => {
  it('defaults to 19:00 on thin data', () => {
    expect(routineHour([])).toBe(19)
    expect(routineHour([8, 9, 10, 11])).toBe(19)
  })

  it('schedules just after the median first log', () => {
    expect(routineHour([8, 8, 9, 9, 9, 10, 10])).toBe(10)
  })

  it('stays within waking hours', () => {
    expect(routineHour([1, 1, 1, 1, 1, 1, 1])).toBeGreaterThanOrEqual(8)
    expect(routineHour([23, 23, 23, 23, 23, 23, 23])).toBeLessThanOrEqual(22)
  })
})

describe('copy', () => {
  it('sends one constant, quiet body', async () => {
    await evaluateNotifications(RIPE)

    expect(sent).toEqual([NUDGE])
    expect(sent[0]).not.toMatch(/\d/)
    expect(sent[0]).not.toContain('!')
    expect(bannedNotificationCopy(sent[0]!)).toBe(false)
  })

  it('never mentions calories, weight or amounts', async () => {
    // Checked against the body the adapter really sent, not this file's own copy of it.
    await evaluateNotifications(RIPE)

    expect(sent.length).toBe(1)
    expect(bannedNotificationCopy(sent[0]!)).toBe(false)
  })

  it('rejects the copy the spec calls out as wrong', () => {
    expect(bannedNotificationCopy("You're 400 calories over today.")).toBe(true)
    expect(bannedNotificationCopy('Duo is disappointed in you.')).toBe(true)
    expect(bannedNotificationCopy("You've broken your promise to yourself.")).toBe(true)
  })

  it('rejects loss and pressure framing', () => {
    const lossFramed = [
      'Two minutes to keep your 12-day streak going.',
      "Your streak's still alive — log anything to keep it.",
      'Freeze used. Streak safe at 23.',
      'Last chance to log today',
      "Don't lose your progress",
      'You missed yesterday',
      'Hurry, time is running out',
    ]

    for (const text of lossFramed) expect(bannedNotificationCopy(text)).toBe(true)
  })

  it('never moralises about food', async () => {
    const banned = /\b(bad|cheat|guilty|earned|naughty|sinful|damage)\b/i
    await evaluateNotifications(RIPE)

    expect(sent.length).toBe(1)
    expect(sent[0]!).not.toMatch(banned)
  })
})
