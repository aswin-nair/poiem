export const MAX_NOTIFICATIONS_PER_DAY = 2

export const NOTIFICATION_KINDS = ['routine'] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export interface NotificationEligibilityInput {
  loggedToday: boolean
  firstLogHours: readonly number[]
  localHour: number
  trackingPaused?: boolean
  sentKinds: readonly NotificationKind[]
}

/**
 * Copy must never mention calories, weight, or moral food language, and must
 * never frame a reminder as a loss or apply pressure (streaks, losing, missing,
 * deadlines, urgency). The words are matched as whole words or phrases.
 */
const BANNED_NOTIFICATION_COPY = new RegExp(
  `\\b(?:${[
    // Nutrition and moral food language.
    'calorie',
    'kcal',
    'weight',
    'over',
    'under',
    'deficit',
    'disappointed',
    'broken your promise',
    // Loss and pressure framing.
    'streak',
    'lose',
    'lost',
    'losing',
    'alive',
    'freeze',
    'frozen',
    'miss',
    'missed',
    'missing',
    'last chance',
    'running out',
    'expire',
    'expires',
    'expired',
    'hurry',
    "don't break",
    'don’t break',
  ].join('|')})\\b`,
  'i',
)

export function bannedNotificationCopy(text: string): boolean {
  return BANNED_NOTIFICATION_COPY.test(text)
}

export function routineHour(firstLogHours: readonly number[]): number {
  if (firstLogHours.length < 5) return 19
  const sorted = [...firstLogHours].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
  return Math.min(22, Math.max(8, Math.round(median + 0.5)))
}

export function canSendNotification(
  kind: NotificationKind,
  sentKinds: readonly NotificationKind[],
): boolean {
  if (sentKinds.length >= MAX_NOTIFICATIONS_PER_DAY) return false
  return !sentKinds.includes(kind)
}

/**
 * Decide whether the single routine nudge may fire. It never reads a streak or
 * a freeze: only whether today has a log, the person's usual first-log hour,
 * and the two-a-day ceiling. Delivery stays in the platform adapter.
 */
export function eligibleNotificationKinds(
  input: NotificationEligibilityInput,
): NotificationKind[] {
  if (input.trackingPaused) return []
  if (input.loggedToday) return []
  if (input.localHour < routineHour(input.firstLogHours)) return []
  if (!canSendNotification('routine', input.sentKinds)) return []
  return ['routine']
}
