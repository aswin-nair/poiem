/**
 * Logging rewards attach to actions and consistency, never food outcomes.
 * Legacy currency and quest fields stay in stored state only for migration.
 * Momo's wardrobe lives in `@fud-ai/product/wardrobe`.
 */

import {
  ENAMEL_CAPS,
  ENAMEL_XP,
  FREE_FREEZE_STREAK,
  applyEnamelLogAwards as applySharedLogAwards,
  applyNote as applySharedNote,
  applyWaterChange as applySharedWater,
  grantFreeFreezeAtStreak as grantSharedFreeze,
  methodOf,
  ticketNumber,
  type LogMethod,
} from '@fud-ai/product/enamelAwards'
import type { FoodEntry, GamificationState } from '../types'
import { levelFromXp } from './xp'

export {
  ENAMEL_CAPS,
  ENAMEL_XP,
  FREE_FREEZE_STREAK,
  methodOf,
  ticketNumber,
}
export type { LogMethod }

function clock() {
  return {
    uuid: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  }
}

function withLevel(gamification: GamificationState): GamificationState {
  return { ...gamification, level: levelFromXp(gamification.xp) }
}

export function applyEnamelLogAwards(
  gamification: GamificationState,
  entry: FoodEntry,
  existing: FoodEntry[],
): GamificationState {
  return withLevel(applySharedLogAwards(gamification, entry, existing, clock()))
}

export function applyWaterChange(
  gamification: GamificationState,
  date: string,
  glasses: number,
): GamificationState {
  return withLevel(applySharedWater(gamification, date, glasses, clock()))
}

export function applyNote(gamification: GamificationState, date: string): GamificationState {
  return withLevel(applySharedNote(gamification, date, clock()))
}

export function grantFreeFreezeAtStreak(gamification: GamificationState, streak: number): GamificationState {
  return grantSharedFreeze(gamification, streak)
}

export function markBrokenIfNeeded(
  gamification: GamificationState,
  previousStreak: number,
  nextStreak: number,
  today: string,
): GamificationState {
  if (nextStreak === 0 && previousStreak > 0 && !gamification.brokenOn) {
    return { ...gamification, brokenOn: today, brokenFrom: previousStreak }
  }
  if (nextStreak > 0) return { ...gamification, brokenOn: null, brokenFrom: 0 }
  return gamification
}
