import type { FoodEntry, MealType } from '../types'
import { localDayKey } from './dates'

/** How far back "usual" looks, and how many separate days make something a habit. */
export const USUAL_WINDOW_DAYS = 30
export const USUAL_MIN_DAYS = 2

const DAY_MS = 86_400_000

/**
 * The meal a person most often has in a slot, for a quiet "log it again" on an empty one.
 * It reads only what they have already logged: the same name on at least two different
 * days within the last 30, the most frequent winning and the most recent breaking a tie.
 * It returns their latest log of it, so the portion is the one they last used. There is no
 * usual for Other, and nothing here looks at calories or targets.
 */
export function usualMeal(entries: readonly FoodEntry[], slot: MealType, now: Date = new Date()): FoodEntry | null {
  if (slot === 'other') return null
  const since = now.getTime() - USUAL_WINDOW_DAYS * DAY_MS

  const byName = new Map<string, { days: Set<string>; latest: FoodEntry }>()
  for (const entry of entries) {
    if (entry.mealType !== slot) continue
    const name = entry.name.trim().toLowerCase()
    if (!name) continue
    const at = new Date(entry.timestamp).getTime()
    if (!Number.isFinite(at) || at < since || at > now.getTime()) continue

    const found = byName.get(name)
    const day = entry.localDate ?? localDayKey(entry.timestamp)
    if (!found) {
      byName.set(name, { days: new Set([day]), latest: entry })
      continue
    }
    found.days.add(day)
    if (entry.timestamp > found.latest.timestamp) found.latest = entry
  }

  let best: { days: number; latest: FoodEntry } | null = null
  for (const { days, latest } of byName.values()) {
    if (days.size < USUAL_MIN_DAYS) continue
    if (!best || days.size > best.days || (days.size === best.days && latest.timestamp > best.latest.timestamp)) {
      best = { days: days.size, latest }
    }
  }
  return best?.latest ?? null
}
