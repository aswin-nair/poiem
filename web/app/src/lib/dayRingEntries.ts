import type { DayRingEntry } from '@fud-ai/product/dayRing'
import type { FoodEntry } from '../types'

/** The ring sees logging context only, never nutrition values. */
export function dayRingEntries(entries: readonly FoodEntry[]): DayRingEntry[] {
  return entries.map(entry => ({
    mealType: entry.mealType,
    source: entry.source,
    detailAdded: entry.detailAdded,
  }))
}
