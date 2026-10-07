import type { GamificationState, XpEvent } from '../types'

export interface LogReceipt {
  id: string
  calories: number
  name: string
  awardedFrom: number
}

export function makeLogReceipt(
  entry: { id: string; calories: number; name: string },
  awardedKeysBefore: number,
): LogReceipt {
  return { id: entry.id, calories: entry.calories, name: entry.name, awardedFrom: awardedKeysBefore }
}

/** Match the appended ledger keys, even when the visible feed is newest-first. */
export function awardsSince(
  receipt: LogReceipt,
  gamification: Pick<GamificationState, 'awardedKeys' | 'xpEvents'>,
): XpEvent[] {
  return gamification.awardedKeys.slice(receipt.awardedFrom).flatMap(key => {
    const event = gamification.xpEvents.find(event => event.key === key)
    return event ? [event] : []
  })
}
