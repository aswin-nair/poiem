import { eligibleNotificationKinds } from '@fud-ai/domain/notifications'
import { entryDayKey, localDayKey } from '@fud-ai/product'
import type { AppState } from '@/state/types'

export function plannedNotifications(state: AppState, now = new Date()) {
  const today = localDayKey(now)
  const loggedToday = state.foodEntries.some(entry => entryDayKey(entry) === today)
  return eligibleNotificationKinds({
    loggedToday,
    firstLogHours: state.foodEntries.map(entry => new Date(entry.timestamp).getHours()),
    localHour: now.getHours(),
    trackingPaused: state.profile.trackingPaused,
    sentKinds: [],
  })
}

export async function syncNotifications(state: AppState): Promise<number> {
  return plannedNotifications(state).length
}
