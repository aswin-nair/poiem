import type { FoodEntry, MealType } from '../types'
import { localDayKey } from './dates'

export interface InsightStory {
  id: 'time' | 'weekday' | 'variety'
  text: string
}

/** Fewer logged days than this say nothing: a pattern needs a little history to be one. */
export const STORY_MIN_LOGGED_DAYS = 5
const TIME_MIN_DAYS = 4
const WEEKDAY_MIN_DAYS = 3
const VARIETY_MIN_FOODS = 8

const SLOTS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

const dayOf = (entry: FoodEntry) => entry.localDate ?? localDayKey(entry.timestamp)

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * A few plain observations about how someone logs, computed from their own entries. They are
 * about the habit, never the numbers: no calories, macros or goals, and nothing that scolds.
 * Fewer than five logged days returns nothing.
 */
export function insightStories(entries: readonly FoodEntry[], options: { locale?: string | string[] } = {}): InsightStory[] {
  const loggedDays = new Set(entries.map(dayOf))
  if (loggedDays.size < STORY_MIN_LOGGED_DAYS) return []
  const stories: InsightStory[] = []

  // The slot they log on the most days, and when in the day that usually is.
  let best: { label: string; days: number; minutes: number[] } | null = null
  for (const { type, label } of SLOTS) {
    const slotEntries = entries.filter(entry => entry.mealType === type)
    const days = new Set(slotEntries.map(dayOf)).size
    if (days < TIME_MIN_DAYS) continue
    if (!best || days > best.days) {
      best = { label, days, minutes: slotEntries.map(entry => { const at = new Date(entry.timestamp); return at.getHours() * 60 + at.getMinutes() }) }
    }
  }
  if (best) {
    const rounded = Math.round(median(best.minutes) / 5) * 5
    const clock = new Date(2026, 0, 1, Math.floor(rounded / 60) % 24, rounded % 60)
    const time = clock.toLocaleTimeString(options.locale, { hour: 'numeric', minute: '2-digit' })
    stories.push({ id: 'time', text: `${best.label} is usually around ${time}.` })
  }

  // The weekday they log on most often, when one clearly leads the rest.
  const perWeekday = new Map<number, Set<string>>()
  for (const day of loggedDays) {
    const [year, month, date] = day.split('-').map(Number)
    if (!year || !month || !date) continue
    const weekday = new Date(year, month - 1, date).getDay()
    perWeekday.set(weekday, (perWeekday.get(weekday) ?? new Set()).add(day))
  }
  const ranked = [...perWeekday.entries()].map(([weekday, days]) => ({ weekday, count: days.size })).sort((a, b) => b.count - a.count)
  if (ranked[0] && ranked[0].count >= WEEKDAY_MIN_DAYS && ranked[0].count > (ranked[1]?.count ?? 0)) {
    // 2026-01-04 is a Sunday, so day 0 maps to it.
    const name = new Date(2026, 0, 4 + ranked[0].weekday).toLocaleDateString(options.locale, { weekday: 'long' })
    stories.push({ id: 'weekday', text: `You log most often on ${name}s.` })
  }

  // How many different foods they have tried: variety celebrated, never counted against them.
  const foods = new Set(entries.map(entry => entry.name.trim().toLowerCase()).filter(Boolean))
  if (foods.size >= VARIETY_MIN_FOODS) stories.push({ id: 'variety', text: `You’ve logged ${foods.size} different foods.` })

  return stories
}
