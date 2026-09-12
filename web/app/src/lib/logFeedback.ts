import type { FoodEntry, XpEvent } from '../types'
import { localDayKey } from './dates'

/**
 * The full "Logged." moment is kept for the day's first meal and for real
 * milestones. Every other log confirms with a toast and Undo, so the fourth
 * meal of the day costs no extra tap.
 */
export function shouldCelebrateLog({
  entries,
  entryId,
  awards,
  now = new Date(),
}: {
  entries: readonly FoodEntry[]
  entryId?: string
  awards: readonly XpEvent[]
  now?: Date
}): boolean {
  if (awards.some(award => award.key.startsWith('streak-'))) return true
  const today = localDayKey(now)
  return !entries.some(entry => entry.id !== entryId && localDayKey(entry.timestamp) === today)
}
