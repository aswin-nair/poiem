import { MEAL_LABELS, type FoodEntry, type MealType } from '../types'

export const MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

/** Today always shows these, even when empty, so the next meal has a place to go. */
export const CORE_MEALS: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface MealGroup {
  type: MealType
  label: string
  entries: FoodEntry[]
  calories: number
}

function mealTypeOf(entry: FoodEntry): MealType {
  return entry.mealType && entry.mealType in MEAL_LABELS ? entry.mealType : 'other'
}

/** The day's entries in meal order, each meal in the order it was eaten. */
export function groupEntriesByMeal(entries: readonly FoodEntry[]): MealGroup[] {
  return MEAL_ORDER
    .map(type => {
      const items = entries
        .filter(entry => mealTypeOf(entry) === type)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      return {
        type,
        label: MEAL_LABELS[type],
        entries: items,
        calories: Math.round(items.reduce((sum, entry) => sum + entry.calories, 0)),
      }
    })
    .filter(group => CORE_MEALS.includes(group.type) || group.entries.length > 0)
}

export interface CalorieBudget {
  consumed: number
  target: number
  remaining: number
  over: number
  /** Share of the target eaten, capped at 1 for drawing. */
  progress: number
}

/** Remaining and over are both reported plainly; being over is information, not a failure. */
export function calorieBudget(consumed: number, target: number): CalorieBudget {
  const eaten = Math.max(0, Math.round(consumed))
  const guide = Math.max(0, Math.round(target))
  return {
    consumed: eaten,
    target: guide,
    remaining: Math.max(0, guide - eaten),
    over: Math.max(0, eaten - guide),
    progress: guide > 0 ? Math.min(1, eaten / guide) : 0,
  }
}

export interface MacroBudget {
  current: number
  goal: number
  progress: number
  over: boolean
}

export function macroBudget(current: number, goal: number): MacroBudget {
  const have = Math.max(0, Math.round(current))
  const target = Math.max(0, Math.round(goal))
  return { current: have, goal: target, progress: target > 0 ? Math.min(1, have / target) : 0, over: target > 0 && have > target }
}

export function entryTime(entry: Pick<FoodEntry, 'timestamp'>): string {
  return new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
