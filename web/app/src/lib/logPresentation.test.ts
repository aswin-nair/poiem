import { FIRST_PIECE, wardrobePiece, type WardrobePiece } from '@fud-ai/product/wardrobe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FoodEntry, MealType } from '../types'
import { dayRingProgress } from './dayRing'
import { applyEnamelLogAwards } from './enamelEconomy'
import { planLogFeedback, type FeedbackKind, type FeedbackTier, type LogFeedbackPlan } from './logFeedbackPlan'
import {
  ANNOUNCE_DELAY_MS, RING_CHECK_MS, levelUpToToast, movesFocusOnExit, presentLogFeedback,
  ringCheckMs, scheduleAnnouncement,
} from './logPresentation'
import { makeLogReceipt } from './logReceipt'
import { defaultGamification } from './storage'

const now = new Date(2026, 9, 5, 19)
function meal(id: string, mealType: MealType, hour: number, offset = 0): FoodEntry {
  return {
    id, name: mealType === 'dinner' ? 'Dinner' : 'Earlier', calories: 500, protein: 25, carbs: 60, fat: 15,
    timestamp: new Date(2026, 9, 5 + offset, hour).toISOString(), mealType, source: 'manual',
  }
}
function piece(id: string): WardrobePiece {
  const found = wardrobePiece(id)
  if (!found) throw new Error(`Missing piece ${id}`)
  return found
}
const whisk = piece('whisk')
const pencil = piece('pencil')
const yesterday = meal('yesterday', 'lunch', 12, -1)
const earlierToday: Record<FeedbackTier, FoodEntry[]> = {
  full: [yesterday],
  second: [yesterday, meal('breakfast', 'breakfast', 8)],
  repeat: [yesterday, meal('breakfast', 'breakfast', 8), meal('lunch', 'lunch', 13)],
}
const notComplete = dayRingProgress([], 0, 'detailed')
const complete = dayRingProgress([{ mealType: 'dinner', source: 'manual' }], 0, 'light')

/**
 * A real plan from the planner: the ledger comes from the app's own log awards,
 * so the awards carry the labels people actually see ("Logged a meal",
 * "Three mains logged"), plus an optional logged-day milestone.
 */
function plan(tier: FeedbackTier, over: {
  firstMeal?: boolean; newPieces?: WardrobePiece[]; milestone?: boolean; ringCloses?: boolean
  levelUp?: number; paused?: boolean
} = {}): LogFeedbackPlan {
  const before = over.firstMeal && tier === 'full' ? [] : earlierToday[tier]
  const entry = meal('dinner', 'dinner', 19)
  let gamification = applyEnamelLogAwards(
    { ...defaultGamification(), ownedCosmeticIds: over.firstMeal ? [] : [FIRST_PIECE] },
    entry,
    before,
  )
  if (over.milestone) gamification = {
    ...gamification,
    awardedKeys: [...gamification.awardedKeys, 'streak-7'],
    xpEvents: [{ id: 's7', key: 'streak-7', xp: 50, label: '7-day streak', timestamp: entry.timestamp }, ...gamification.xpEvents],
  }
  gamification = { ...gamification, pendingLevelUp: over.levelUp ?? null }
  return planLogFeedback({
    receipt: makeLogReceipt(entry, 0),
    entries: [...before, entry],
    gamification,
    newPieces: over.newPieces ?? [],
    firstMealJourney: Boolean(over.firstMeal),
    paused: Boolean(over.paused),
    ring: { before: notComplete, after: over.ringCloses ? complete : notComplete },
    ringAckedToday: false,
    now,
  })
}

const TIERS: FeedbackTier[] = ['full', 'second', 'repeat']
const SCENARIOS: { name: string; kind: FeedbackKind; tiers: FeedbackTier[]; make: (tier: FeedbackTier, levelUp?: number) => LogFeedbackPlan }[] = [
  { name: 'first meal', kind: 'first-meal', tiers: TIERS, make: (tier, levelUp) => plan(tier, { firstMeal: true, levelUp }) },
  { name: 'wardrobe piece', kind: 'wardrobe', tiers: TIERS, make: (tier, levelUp) => plan(tier, { newPieces: [whisk], milestone: true, ringCloses: true, levelUp }) },
  { name: 'milestone', kind: 'milestone', tiers: TIERS, make: (tier, levelUp) => plan(tier, { milestone: true, ringCloses: true, levelUp }) },
  { name: 'ring', kind: 'ring', tiers: TIERS, make: (tier, levelUp) => plan(tier, { ringCloses: true, levelUp }) },
  { name: 'first log of the day', kind: 'first-of-day', tiers: ['full'], make: (tier, levelUp) => plan(tier, { levelUp }) },
  { name: 'ordinary log', kind: 'ordinary', tiers: ['second', 'repeat'], make: (tier, levelUp) => plan(tier, { levelUp }) },
  { name: 'paused log', kind: 'quiet', tiers: TIERS, make: (tier, levelUp) => plan(tier, { paused: true, newPieces: [whisk], milestone: true, levelUp: levelUp ?? 4 }) },
]
const CARD_KINDS: FeedbackKind[] = ['first-meal', 'wardrobe', 'milestone', 'ring', 'first-of-day']

describe('presentLogFeedback', () => {
  it('builds the scenarios it claims to (the planner picks each kind at each tier)', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        expect(scenario.make(tier), `${scenario.name} at ${tier}`).toMatchObject({ kind: scenario.kind, tier })
      }
    }
  })

  it('shows a card for every special kind at every tier, and a toast for the rest', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        const view = presentLogFeedback(scenario.make(tier), 'Dinner')
        expect(view.surface, `${scenario.name} at ${tier}`).toBe(CARD_KINDS.includes(scenario.kind) ? 'card' : 'toast')
      }
    }
  })

  it('keeps the motion cap of a card chosen at a lower tier', () => {
    expect(plan('second', { newPieces: [whisk] }).maxMotionMs).toBe(240)
    expect(plan('repeat', { ringCloses: true }).maxMotionMs).toBe(120)
    expect(presentLogFeedback(plan('repeat', { ringCloses: true }), 'Dinner').surface).toBe('card')
  })

  it('shows Momo only for the first meal and a wardrobe piece', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        const view = presentLogFeedback(scenario.make(tier), 'Dinner')
        expect(view.showMomo, `${scenario.name} at ${tier}`).toBe(scenario.kind === 'first-meal' || scenario.kind === 'wardrobe')
      }
    }
  })

  it('says each fact once: a third-log dinner that unlocks the Whisk', () => {
    const view = presentLogFeedback(plan('repeat', { newPieces: [whisk] }), 'Dinner')
    expect(view).toEqual({
      surface: 'card',
      headline: 'Logged.',
      lines: ['New for Momo: Whisk', 'Logged a meal · +10 XP', 'Three mains logged · +20 XP'],
      showMomo: true,
      toastText: 'Logged Dinner',
    })
  })

  it('never repeats a line, a piece name or the detail in any scenario', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        const source = scenario.make(tier)
        const view = presentLogFeedback(source, 'Dinner')
        const text = [view.headline, ...view.lines].join('\n')
        expect(new Set(view.lines).size, `${scenario.name} at ${tier}`).toBe(view.lines.length)
        for (const each of source.pieces) expect(text.split(each.name).length - 1, each.name).toBeLessThanOrEqual(1)
        if (source.detail) {
          expect(view.lines[0]).toBe(source.detail)
          expect(text.split(source.detail).length - 1, source.detail).toBe(1)
        }
      }
    }
  })

  it('leads with the milestone and does not list it again as an award', () => {
    const view = presentLogFeedback(plan('full', { milestone: true }), 'Dinner')
    expect(view.lines).toEqual(['7-day streak', 'Logged a meal · +10 XP', 'First log of the day · +5 XP'])
  })

  it('names Momo’s first piece once on the first meal', () => {
    const view = presentLogFeedback(plan('full', { firstMeal: true, newPieces: [pencil] }), 'Dinner')
    expect(view.headline).toBe('First meal in.')
    expect(view.lines.slice(0, 2)).toEqual(['Momo’s first piece: Blossom clip', 'New for Momo: Pencil'])
  })

  it('ends a card with the level-up', () => {
    const view = presentLogFeedback(plan('full', { ringCloses: true, levelUp: 3 }), 'Dinner')
    expect(view.lines[0]).toBe('Your chosen logging steps are complete.')
    expect(view.lines.at(-1)).toBe('Level 3.')
  })

  it('keeps every toast to the food it logged', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        expect(presentLogFeedback(scenario.make(tier), 'Dinner').toastText).toBe('Logged Dinner')
      }
    }
    expect(presentLogFeedback(plan('repeat'), ' Rice. ').toastText).toBe('Logged Rice.')
  })

  it('puts the level in the toast of a log that has one: one line, one fact each', () => {
    for (const scenario of SCENARIOS) {
      for (const tier of scenario.tiers) {
        const view = presentLogFeedback(scenario.make(tier, 4), 'Dinner')
        const label = `${scenario.name} at ${tier}`
        if (scenario.kind === 'quiet') {
          // Paused tracking drops the level in the planner, so its toast stays the bare fact.
          expect(view.toastText, label).toBe('Logged Dinner')
        } else if (view.surface === 'toast') {
          expect(view.toastText, label).toBe('Logged Dinner. Level 4.')
        } else {
          // A card carries the level as its own last line and its toast text is unchanged.
          expect(view.toastText, label).toBe('Logged Dinner')
          expect(view.lines.at(-1), label).toBe('Level 4.')
        }
      }
    }
  })

  it('adds nothing to a toast without a level, and takes the level from the plan, not the food', () => {
    expect(presentLogFeedback(plan('second'), 'Dinner').toastText).toBe('Logged Dinner')
    expect(presentLogFeedback(plan('repeat', { levelUp: 12 }), '  Rice bowl ').toastText).toBe('Logged Rice bowl. Level 12.')
  })

  it('does not double the full stop of a food name that ends in one', () => {
    expect(presentLogFeedback(plan('repeat', { levelUp: 3 }), ' Rice. ').toastText).toBe('Logged Rice. Level 3.')
    expect(presentLogFeedback(plan('repeat'), ' Rice. ').toastText).toBe('Logged Rice.')
  })

  it.each(['Rice…', 'Rice...'])('keeps the existing punctuation in %s when adding a level', name => {
    expect(presentLogFeedback(plan('repeat', { levelUp: 3 }), ` ${name} `).toastText).toBe(`Logged ${name} Level 3.`)
  })

  it('presents nothing but the fact while paused', () => {
    for (const tier of TIERS) {
      const view = presentLogFeedback(plan(tier, { paused: true, newPieces: [whisk], milestone: true, levelUp: 4 }), 'Dinner')
      expect(view).toEqual({ surface: 'toast', headline: 'Logged.', lines: [], showMomo: false, toastText: 'Logged Dinner' })
    }
  })
})

describe('ringCheckMs', () => {
  it('plays the ring check whenever the ring closes, capped by the log', () => {
    expect(ringCheckMs(plan('full', { ringCloses: true }), false)).toBe(RING_CHECK_MS)
    expect(ringCheckMs(plan('second', { ringCloses: true }), false)).toBe(240)
    expect(ringCheckMs(plan('repeat', { ringCloses: true, newPieces: [whisk] }), false)).toBe(120)
  })

  it('is still for reduced motion and absent when the ring did not close', () => {
    expect(ringCheckMs(plan('full', { ringCloses: true }), true)).toBe(0)
    expect(ringCheckMs(plan('full'), false)).toBeNull()
    expect(ringCheckMs(plan('full', { ringCloses: true, paused: true }), false)).toBeNull()
  })
})

describe('levelUpToToast', () => {
  const quiet = { pendingLevel: 4, paused: false, receiptPending: false, sheetOpen: false, lastToasted: null }
  it('toasts a pending level when nothing else owns it', () => {
    expect(levelUpToToast(quiet)).toEqual({ toastLevel: 4, acknowledge: true })
  })
  it('toasts each level once, so a second effect run stays silent', () => {
    expect(levelUpToToast({ ...quiet, lastToasted: 4 })).toEqual({ toastLevel: null, acknowledge: true })
    expect(levelUpToToast({ ...quiet, pendingLevel: 5, lastToasted: 4 })).toEqual({ toastLevel: 5, acknowledge: true })
  })
  it('leaves the level to the log card while a receipt or the log sheet is open', () => {
    expect(levelUpToToast({ ...quiet, receiptPending: true })).toEqual({ toastLevel: null, acknowledge: false })
    expect(levelUpToToast({ ...quiet, sheetOpen: true })).toEqual({ toastLevel: null, acknowledge: false })
    expect(levelUpToToast({ ...quiet, lastToasted: 4, receiptPending: true })).toEqual({ toastLevel: null, acknowledge: false })
  })
  it('stays silent while paused or with nothing pending', () => {
    expect(levelUpToToast({ ...quiet, paused: true })).toEqual({ toastLevel: null, acknowledge: false })
    expect(levelUpToToast({ ...quiet, pendingLevel: null })).toEqual({ toastLevel: null, acknowledge: false })
  })
})

describe('movesFocusOnExit', () => {
  it('moves focus after Undo or Dismiss, and after the timeout only from inside the card', () => {
    expect(movesFocusOnExit('undo', true)).toBe(true)
    expect(movesFocusOnExit('dismiss', false)).toBe(true)
    expect(movesFocusOnExit('timeout', false)).toBe(false)
    expect(movesFocusOnExit('timeout', true)).toBe(true)
  })
})

describe('scheduleAnnouncement', () => {
  afterEach(() => { vi.useRealTimers() })
  it('fills the live region after it has mounted empty, not in the same task', () => {
    vi.useFakeTimers()
    const announce = vi.fn()
    scheduleAnnouncement(announce)
    expect(announce).not.toHaveBeenCalled()
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS - 1)
    expect(announce).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(announce).toHaveBeenCalledTimes(1)
  })
  it('never announces after the card has gone', () => {
    vi.useFakeTimers()
    const announce = vi.fn()
    const cancel = scheduleAnnouncement(announce)
    cancel()
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS * 4)
    expect(announce).not.toHaveBeenCalled()
  })
})
