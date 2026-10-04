import {
  bannedNotificationCopy as sharedBannedNotificationCopy,
  eligibleNotificationKinds,
  routineHour as sharedRoutineHour,
  type NotificationKind,
} from '@fud-ai/domain/notifications'
import { localDayKey } from './dates'

/**
 * One quiet routine nudge, hard-capped at two notifications a day. Per §2.6 / Phase 8.
 * Copy never mentions calories, weight, how much someone ate, a streak, or
 * anything that could be lost by not logging.
 */

const LOG_KEY = 'fud-notify-log'
const MAX_PER_DAY = 2

type NotifyKind = NotificationKind

// Typed over every kind, so adding a kind to the policy is a type error until
// it has quiet, loss-free copy here.
const COPY: Record<NotifyKind, string> = {
  routine: 'Your journal is here whenever you’re ready.',
}

// A log written before the loss-framed reminders were retired may still hold
// the old `save` and `freeze` kinds. They are read as plain strings so they
// keep counting toward the day's cap.
type NotifyLog = { date: string; kinds: string[] }

function todayKey(): string {
  return localDayKey(new Date())
}

function readLog(): NotifyLog {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? 'null') as NotifyLog | null
    if (raw && raw.date === todayKey() && Array.isArray(raw.kinds)) return raw
  } catch { /* ignore */ }
  return { date: todayKey(), kinds: [] }
}

function writeLog(log: NotifyLog): void {
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
}

export function notificationsSentToday(): number {
  return readLog().kinds.length
}

export function clearNotificationHistory(): void {
  localStorage.removeItem(LOG_KEY)
}

function canSend(kind: NotifyKind): boolean {
  const log = readLog()
  if (log.kinds.length >= MAX_PER_DAY) return false
  if (log.kinds.includes(kind)) return false
  return true
}

function record(kind: NotifyKind): void {
  const log = readLog()
  log.kinds.push(kind)
  writeLog(log)
}

export function bannedNotificationCopy(text: string): boolean {
  return sharedBannedNotificationCopy(text)
}

async function deliver(kind: NotifyKind): Promise<boolean> {
  if (!canSend(kind)) return false
  if (typeof Notification === 'undefined') return false
  if (Notification.permission !== 'granted') return false

  if (bannedNotificationCopy(COPY[kind])) return false

  try {
    new Notification('Poiem', { body: COPY[kind], silent: true })
    record(kind)
    return true
  } catch {
    return false
  }
}

/** Median first-log hour over the last 14 days, or 19:00 when data is thin. */
export function routineHour(firstLogHours: number[]): number {
  return sharedRoutineHour(firstLogHours)
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Evaluates the one routine nudge. Call on app open and when the hour changes.
 * `loggedToday` and a pause both suppress it; nothing else about the journal
 * (no streak, no freezes) is read.
 */
export async function evaluateNotifications(input: {
  loggedToday: boolean
  firstLogHours: number[]
  localHour: number
  trackingPaused?: boolean
}): Promise<void> {
  const kinds = eligibleNotificationKinds({
    loggedToday: input.loggedToday,
    firstLogHours: input.firstLogHours,
    localHour: input.localHour,
    trackingPaused: input.trackingPaused,
    // The stored log is plain strings (it may hold legacy kinds); the policy
    // only ever counts them, so the narrower type is safe here.
    sentKinds: readLog().kinds as NotificationKind[],
  })

  for (const kind of kinds) {
    await deliver(kind)
  }
}
