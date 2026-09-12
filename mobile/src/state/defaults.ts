import { localDayKey } from '@fud-ai/product'
import { levelFromXp } from '@fud-ai/domain/xp'
import type { AppState, GamificationState, UserProfile } from './types'

export function defaultProfile(): UserProfile {
  return {
    gender: 'other',
    birthday: '1990-01-01',
    heightCm: 170,
    weightKg: 70,
    activityLevel: 'moderate',
    goal: 'maintain',
    soundEnabled: true,
    hapticsEnabled: true,
    mascotMuted: false,
    mascotReducedMotion: false,
    trackingPaused: false,
    loggingCommitment: 'light',
  }
}

export function defaultGamification(now = new Date()): GamificationState {
  const today = localDayKey(now)
  return {
    xp: 0,
    level: 1,
    streakFreezes: 1,
    freezeUsedDates: [],
    freezeEarnedMonth: today.slice(0, 7),
    pauseStartedDate: null,
    pauseProtectedDates: [],
    xpEvents: [],
    awardedKeys: [],
    pendingLevelUp: null,
    seenBadgeIds: [],
    gems: 0,
    gemEvents: [],
    waterByDate: {},
    notesByDate: {},
    ownedCosmeticIds: [],
    equippedCosmeticId: null,
    outfit: {},
    repairsUsedMonth: '',
    mascotActivity: 'lively',
    brokenOn: null,
    brokenFrom: 0,
    startedAt: `${today}T12:00:00.000`,
  }
}

export function freshState(): AppState {
  return {
    onboarded: false,
    profile: defaultProfile(),
    foodEntries: [],
    weightEntries: [],
    exerciseEntries: [],
    favoriteMeals: [],
    chatMessages: [],
    aiSettings: { provider: 'openrouter', apiKey: '', model: 'google/gemini-2.0-flash-001' },
    gamification: defaultGamification(),
  }
}

export function withLevel(state: GamificationState): GamificationState {
  return { ...state, level: levelFromXp(state.xp) }
}
