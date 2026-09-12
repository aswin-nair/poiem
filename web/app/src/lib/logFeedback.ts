import type { FoodEntry, XpEvent } from '../types'
import { localDayKey } from './dates'

/**
 * The full "Logged." moment is kept for the day's first meal, for real
 * milestones, and for the rare log that brings Momo a new wardrobe piece.
 * Every other log confirms with a toast and Undo, so the fourth meal of the day
 * costs no extra tap.
 */
export function shouldCelebrateLog({
  entries,
  entryId,
  awards,
  newPieces = 0,
  now = new Date(),
}: {
  entries: readonly FoodEntry[]
  entryId?: string
  awards: readonly XpEvent[]
  newPieces?: number
  now?: Date
}): boolean {
  if (newPieces > 0) return true
  if (awards.some(award => award.key.startsWith('streak-'))) return true
  const today = localDayKey(now)
  return !entries.some(entry => entry.id !== entryId && localDayKey(entry.timestamp) === today)
}
