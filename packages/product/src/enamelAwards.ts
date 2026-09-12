import { entryDayKey } from './localDate'

export const ENAMEL_XP = {
  PHOTO: 15,
  MANUAL: 10,
  FIRST_OF_DAY: 5,
  THREE_MAINS: 20,
  WATER: 2,
  NOTE: 5,
} as const

export const ENAMEL_CAPS = {
  WATER: 8,
  NOTES: 3,
  FREEZES: 2,
} as const

export const FREE_FREEZE_STREAK = 7

export type LogMethod = 'manual' | 'photo' | 'repeat' | 'other'

export interface AwardEvent {
  id: string
  key: string
  xp: number
  label: string
  timestamp: string
}

export interface AwardLedger {
  xp: number
  awardedKeys: string[]
  xpEvents: AwardEvent[]
  waterByDate: Record<string, number>
  notesByDate: Record<string, number>
  streakFreezes: number
  ownedCosmeticIds: string[]
  equippedCosmeticId: string | null
}

export interface AwardClock {
  uuid: () => string
  now: () => string
}

const MAIN_SLOTS = ['breakfast', 'lunch', 'dinner'] as const

export function methodOf(entry: { source: string }): LogMethod {
  if (entry.source === 'snapFood') return 'photo'
  if (entry.source === 'recent' || entry.source === 'quickAdd') return 'repeat'
  if (entry.source === 'manual' || entry.source === 'textInput') return 'manual'
  return 'other'
}

export function ticketNumber(entries: { timestamp: string; localDate?: string }[]): number {
  return new Set(entries.map(entryDayKey)).size
}

function pushXp(
  events: AwardEvent[],
  awarded: Set<string>,
  key: string,
  xp: number,
  label: string,
  timestamp: string,
  uuid: () => string,
): number {
  if (awarded.has(key) || xp <= 0) return 0
  awarded.add(key)
  events.unshift({ id: uuid(), key, xp, label, timestamp })
  return xp
}

export function applyEnamelLogAwards<T extends AwardLedger>(
  gamification: T,
  entry: { id: string; source: string; mealType: string; timestamp: string; localDate?: string },
  existing: { timestamp: string; localDate?: string; mealType: string }[],
  clock: AwardClock,
): T {
  const date = entryDayKey(entry)
  const timestamp = clock.now()
  const awarded = new Set(gamification.awardedKeys)
  const events = [...gamification.xpEvents]
  let xp = 0
  const method = methodOf(entry)

  if (method === 'photo') {
    xp += pushXp(events, awarded, `enamel-photo-${entry.id}`, ENAMEL_XP.PHOTO, 'Photo log', timestamp, clock.uuid)
  } else if (method === 'manual') {
    xp += pushXp(events, awarded, `enamel-manual-${entry.id}`, ENAMEL_XP.MANUAL, 'Logged a meal', timestamp, clock.uuid)
  }

  const sameDayBefore = existing.filter(item => entryDayKey(item) === date)
  if (sameDayBefore.length === 0) {
    xp += pushXp(events, awarded, `enamel-first-${date}`, ENAMEL_XP.FIRST_OF_DAY, 'First log of the day', timestamp, clock.uuid)
  }

  const slots = new Set([...sameDayBefore, entry].map(item => item.mealType))
  if (MAIN_SLOTS.every(slot => slots.has(slot))) {
    xp += pushXp(events, awarded, `enamel-mains-${date}`, ENAMEL_XP.THREE_MAINS, 'Three mains logged', timestamp, clock.uuid)
  }

  return {
    ...gamification,
    xp: gamification.xp + xp,
    xpEvents: events.slice(0, 50),
    awardedKeys: [...awarded],
  }
}

export function applyWaterChange<T extends AwardLedger>(
  gamification: T,
  date: string,
  glasses: number,
  clock: AwardClock,
): T {
  const nextCount = Math.max(0, Math.min(ENAMEL_CAPS.WATER, Math.round(glasses)))
  const prev = Math.max(0, Math.min(ENAMEL_CAPS.WATER, gamification.waterByDate[date] ?? 0))
  const awarded = new Set(gamification.awardedKeys)
  const events = [...gamification.xpEvents]
  const timestamp = clock.now()
  let xp = 0

  if (nextCount > prev) {
    for (let i = prev + 1; i <= nextCount; i++) {
      xp += pushXp(events, awarded, `enamel-water-${date}-${i}`, ENAMEL_XP.WATER, 'Water logged', timestamp, clock.uuid)
    }
  }

  return {
    ...gamification,
    waterByDate: { ...gamification.waterByDate, [date]: nextCount },
    xp: gamification.xp + xp,
    xpEvents: events.slice(0, 50),
    awardedKeys: [...awarded],
  }
}

export function applyNote<T extends AwardLedger>(
  gamification: T,
  date: string,
  clock: AwardClock,
): T {
  const prev = gamification.notesByDate[date] ?? 0
  if (prev >= ENAMEL_CAPS.NOTES) return gamification
  const nextCount = prev + 1
  const awarded = new Set(gamification.awardedKeys)
  const events = [...gamification.xpEvents]
  const xp = pushXp(
    events,
    awarded,
    `enamel-note-${date}-${nextCount}`,
    ENAMEL_XP.NOTE,
    'Kitchen note',
    clock.now(),
    clock.uuid,
  )
  return {
    ...gamification,
    notesByDate: { ...gamification.notesByDate, [date]: nextCount },
    xp: gamification.xp + xp,
    xpEvents: events.slice(0, 50),
    awardedKeys: [...awarded],
  }
}

export function grantFreeFreezeAtStreak<T extends AwardLedger>(gamification: T, streak: number): T {
  if (streak < FREE_FREEZE_STREAK) return gamification
  if (gamification.awardedKeys.includes('enamel-free-freeze-7')) return gamification
  return {
    ...gamification,
    streakFreezes: Math.min(ENAMEL_CAPS.FREEZES, gamification.streakFreezes + 1),
    awardedKeys: [...gamification.awardedKeys, 'enamel-free-freeze-7'],
  }
}
