import type { MomoExpression } from '../mascot/expressions'

export interface MomoLine {
  line: string
  expression: MomoExpression
  pose: string
}

export interface TodayGreeting extends MomoLine {
  hello: string
}

interface GreetingInput {
  hour: number
  name?: string
  mealsToday: number
  over: boolean
  isToday: boolean
}

type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

const HELLO: Record<PartOfDay, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Hey there' }

const INVITES: Record<PartOfDay, string> = {
  morning: 'Breakfast o’clock? Whatever you had counts.',
  afternoon: 'What’s been on the plate today?',
  evening: 'Dinner plans? I’m all ears.',
  night: 'Late snack? Everything belongs here.',
}

/** Momo's opener on Today. Warm and specific to the moment, never a verdict on the numbers. */
export function todayGreeting({ hour, name, mealsToday, over, isToday }: GreetingInput): TodayGreeting {
  const part = partOfDay(hour)
  const first = name?.trim().split(/\s+/)[0]
  const hello = `${HELLO[part]}${first ? `, ${first}` : ''}!`
  if (!isToday) return { hello, line: 'A page from your food story. No grades attached.', expression: 'proud', pose: 'still' }
  if (over) return { hello, line: 'Big food day. Tomorrow’s a fresh plate.', expression: 'happy', pose: 'wave_at_user' }
  if (mealsToday > 0) return { hello, line: 'You showed up. That’s the part worth celebrating.', expression: 'proud', pose: 'tiny_dance' }
  return { hello, line: INVITES[part], expression: 'curious', pose: 'look_around' }
}

/** Lines for a deliberate tap on Momo. Nothing here plays on its own. */
export const MOMO_POKES: readonly MomoLine[] = [
  { line: 'I’m a dumpling with a job. The job is cheering.', expression: 'proud', pose: 'bow' },
  { line: 'Plot twist: the snack was part of the plot.', expression: 'caught_snacking', pose: 'wave_at_user' },
  { line: 'Water counts as a hobby. Just saying.', expression: 'happy', pose: 'tiny_dance' },
  { line: 'You bring the fork. I bring the enthusiasm.', expression: 'celebrating', pose: 'happy_hop' },
]
