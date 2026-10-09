import { entryDayKey } from '@fud-ai/product/localDate'
import type { FoodEntry } from '../types'
import { addDays, localDayKey, startOfDay } from './dates'

export interface InsightDay {
  dayKey: string
  label: string
  logged: boolean
  mealCount: number
  value: number
  protein: number
  carbs: number
  fat: number
}

/** A missing log has no known intake; a saved zero still counts as a logged day. */
export function insightDays(entries: readonly FoodEntry[], days: number, ref = new Date()): InsightDay[] {
  const end = startOfDay(ref)
  const byDay = new Map<string, FoodEntry[]>()
  for (const entry of entries) {
    const key = entryDayKey(entry)
    const items = byDay.get(key) ?? []
    items.push(entry)
    byDay.set(key, items)
  }
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(end, index - days + 1)
    const dayKey = localDayKey(date)
    const items = byDay.get(dayKey) ?? []
    return {
      dayKey,
      label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      logged: items.length > 0,
      mealCount: items.length,
      value: items.reduce((sum, entry) => sum + entry.calories, 0),
      protein: items.reduce((sum, entry) => sum + entry.protein, 0),
      carbs: items.reduce((sum, entry) => sum + entry.carbs, 0),
      fat: items.reduce((sum, entry) => sum + entry.fat, 0),
    }
  })
}

export function insightSummary(days: readonly InsightDay[]) {
  const logged = days.filter(day => day.logged)
  return {
    loggedDays: logged.length,
    meals: logged.reduce((sum, day) => sum + day.mealCount, 0),
    averageCalories: logged.length ? Math.round(logged.reduce((sum, day) => sum + day.value, 0) / logged.length) : null,
  }
}

export function insightDayLabel(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function insightPeriod(days: readonly InsightDay[]): string {
  if (!days.length) return ''
  const label = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return `${label(days[0].dayKey)} – ${label(days[days.length - 1].dayKey)}`
}
