import { FIRST_PIECE, wardrobePiece } from '@fud-ai/product/wardrobe'
import { describe, expect, it } from 'vitest'
import type { FoodEntry, GamificationState, XpEvent } from '../types'
import { dayRingProgress } from './dayRing'
import { makeLogReceipt } from './logReceipt'
import { planLogFeedback } from './logFeedbackPlan'
import { defaultGamification } from './storage'

const now = new Date(2026, 9, 5, 13)
const at = (hour: number, offset = 0) => new Date(2026, 9, 5 + offset, hour).toISOString()
function meal(id: string, hour = 12, offset = 0): FoodEntry {
  return {
    id, name: 'Lunch', calories: 400, protein: 20, carbs: 50, fat: 10,
    timestamp: at(hour, offset), mealType: 'lunch', source: 'manual',
  }
}
function piece(id: string) {
  const value = wardrobePiece(id)
  if (!value) throw new Error(`Missing fixture piece ${id}`)
  return value
}
const pencil = piece('pencil')
const scarf = piece('scarf')
const firstPiece = piece(FIRST_PIECE)
const logged = meal('new')
const award = (key: string, label = key): XpEvent => ({
  id: key, key, label, xp: 10, timestamp: '1999-01-01T00:00:00.000Z',
})
const g = (over: Partial<GamificationState> = {}): GamificationState => ({
  ...defaultGamification(), ownedCosmeticIds: [FIRST_PIECE], ...over,
})
const ring = (complete: boolean) => dayRingProgress(complete ? [{ mealType: 'lunch', source: 'manual' }] : [], 0, 'light')
type FeedbackInput = Parameters<typeof planLogFeedback>[0]
function input(over: Partial<FeedbackInput> = {}): FeedbackInput {
  return {
    receipt: makeLogReceipt(logged, 0), entries: [meal('yesterday', 12, -1), logged],
    gamification: g(), newPieces: [], firstMealJourney: false, paused: false,
    ring: { before: ring(false), after: ring(false) }, ringAckedToday: false, now,
    ...over,
  }
}
function withMilestone(over: Partial<FeedbackInput> = {}): FeedbackInput {
  const milestone = award('streak-7', 'Seven logged days')
  return input({
    gamification: g({ awardedKeys: [milestone.key], xpEvents: [milestone] }),
    ring: { before: ring(false), after: ring(true) }, ...over,
  })
}

describe('log feedback planner', () => {
  it('first meal ever', () => {
    const plan = planLogFeedback(input({ entries: [logged], gamification: g({ ownedCosmeticIds: [] }) }))
    expect(plan).toMatchObject({
      kind: 'first-meal', tier: 'full', headline: 'First meal in.', announcement: 'Logged Lunch.',
      pieces: [firstPiece], cue: 'log-confirm', mascotEvent: 'milestone', maxMotionMs: 720,
    })
    expect(plan.detail).toBeUndefined()
  })

  it('first meal rule uses ownership of the first piece, not an empty journal', () => {
    expect(planLogFeedback(input({ entries: [logged] })).kind).toBe('first-of-day')
    expect(planLogFeedback(input({ entries: [logged], firstMealJourney: true })).kind).toBe('first-of-day')
    expect(planLogFeedback(input({ gamification: g({ ownedCosmeticIds: [] }) })).kind).toBe('first-of-day')
    expect(planLogFeedback(input({ firstMealJourney: true, gamification: g({ ownedCosmeticIds: [] }) })).kind).toBe('first-meal')
  })

  it('wardrobe outranks milestone and ring', () => {
    const plan = planLogFeedback(withMilestone({ newPieces: [pencil, scarf] }))
    expect(plan).toMatchObject({
      kind: 'wardrobe', detail: 'New for Momo: Pencil, Scarf', pieces: [pencil, scarf],
      ringClosed: true, maxMotionMs: 720, mascotEvent: 'milestone', cue: 'log-confirm',
      announcement: 'Logged Lunch. New for Momo: Pencil, Scarf.',
    })
    expect(plan.awards.map(event => event.key)).toEqual(['streak-7'])
  })

  it('milestone outranks ring', () => {
    const plan = planLogFeedback(withMilestone())
    expect(plan).toMatchObject({
      kind: 'milestone', detail: 'Seven logged days', ringClosed: true,
      mascotEvent: 'milestone', maxMotionMs: 480, cue: 'badge',
      announcement: 'Logged Lunch. Seven logged days.',
    })
  })

  it('ring closes only on an incomplete-to-complete transition', () => {
    for (const before of [false, true]) {
      for (const after of [false, true]) {
        const plan = planLogFeedback(input({ ring: { before: ring(before), after: ring(after) } }))
        expect(plan.ringClosed).toBe(!before && after)
        expect(plan.kind).toBe(!before && after ? 'ring' : 'first-of-day')
        if (plan.ringClosed) expect(plan).toMatchObject({
          detail: 'Your chosen logging steps are complete.',
          announcement: 'Logged Lunch. Your chosen logging steps are complete.',
          maxMotionMs: 480, cue: 'log-confirm', mascotEvent: 'log_success',
        })
      }
    }
  })

  it('ring acknowledged today is not replayed', () => {
    const plan = planLogFeedback(input({ ring: { before: ring(false), after: ring(true) }, ringAckedToday: true }))
    expect(plan).toMatchObject({ kind: 'first-of-day', ringClosed: false })
  })

  it('second log caps motion at 240 and keeps every reward', () => {
    const plan = planLogFeedback(withMilestone({ entries: [meal('breakfast', 8), logged], newPieces: [pencil, scarf] }))
    expect(plan).toMatchObject({
      kind: 'wardrobe', tier: 'second', maxMotionMs: 240, cue: 'select',
      mascotEvent: null, ringClosed: true, pieces: [pencil, scarf],
    })
    expect(plan.awards.map(event => event.key)).toEqual(['streak-7'])
  })

  it('third log caps motion at 120 even when a piece, a milestone and the ring coincide', () => {
    const plan = planLogFeedback(withMilestone({ entries: [meal('breakfast', 8), meal('snack', 10), logged], newPieces: [pencil] }))
    expect(plan).toMatchObject({
      kind: 'wardrobe', tier: 'repeat', maxMotionMs: 120, cue: 'tap',
      mascotEvent: null, ringClosed: true, pieces: [pencil],
    })
    expect(plan.awards.map(event => event.key)).toEqual(['streak-7'])
  })

  it('one cue per action and the milestone cue replaces the confirm', () => {
    const kinds = [
      input({ entries: [logged], gamification: g({ ownedCosmeticIds: [] }) }),
      input({ newPieces: [pencil] }), withMilestone(),
      input({ ring: { before: ring(false), after: ring(true) } }), input(),
    ]
    expect(kinds.map(value => planLogFeedback(value).cue)).toEqual([
      'log-confirm', 'log-confirm', 'badge', 'log-confirm', 'log-confirm',
    ])
    for (const value of kinds) {
      expect(planLogFeedback({ ...value, entries: [meal('earlier', 8), logged] }).cue).toBe('select')
      expect(planLogFeedback({ ...value, entries: [meal('earlier', 8), meal('another', 10), logged] }).cue).toBe('tap')
    }
  })

  it('the first meal hands over the first piece ahead of any other piece', () => {
    const plan = planLogFeedback(withMilestone({
      entries: [logged], gamification: g({ ownedCosmeticIds: [] }), newPieces: [pencil, scarf],
    }))
    expect(plan.kind).toBe('first-meal')
    expect(plan.pieces).toEqual([firstPiece, pencil, scarf])
  })

  it('paused is quiet and factual', () => {
    const milestone = award('streak-7')
    const plan = planLogFeedback(withMilestone({
      paused: true, entries: [logged], newPieces: [pencil], firstMealJourney: true,
      gamification: g({ ownedCosmeticIds: [], pendingLevelUp: 2, awardedKeys: [milestone.key], xpEvents: [milestone] }),
    }))
    expect(plan).toEqual({
      kind: 'quiet', tier: 'full', headline: 'Logged.', announcement: 'Logged Lunch.',
      awards: [milestone], pieces: [], cue: 'tap', mascotEvent: null,
      maxMotionMs: 0, ringClosed: false, levelUp: null,
    })
  })

  it('level-up is carried', () => {
    const plan = planLogFeedback(input({ gamification: g({ pendingLevelUp: 2 }) }))
    expect(plan.levelUp).toBe(2)
    expect(plan.announcement).toBe('Logged Lunch. Level 2.')
    expect(planLogFeedback(input()).levelUp).toBeNull()
  })

  it('calories and targets do not change the plan', () => {
    // Targets are not an input at all (the planner takes no profile), so only the food numbers vary here.
    const lower = input()
    const higher = {
      ...lower, receipt: { ...lower.receipt, calories: 4000 },
      entries: lower.entries.map(entry => ({ ...entry, calories: 4000, protein: 200, carbs: 500, fat: 150 })),
    }
    expect(planLogFeedback(higher)).toEqual(planLogFeedback(lower))
  })

  it('first-of-day at tier full', () => {
    expect(planLogFeedback(input())).toMatchObject({
      kind: 'first-of-day', tier: 'full', maxMotionMs: 480, mascotEvent: 'log_success',
      cue: 'log-confirm', headline: 'Logged.', announcement: 'Logged Lunch.', ringClosed: false,
    })
  })

  it('paused is quiet at tiers second and repeat', () => {
    const second = planLogFeedback(input({ paused: true, entries: [meal('earlier', 8), logged] }))
    const repeat = planLogFeedback(withMilestone({
      paused: true, newPieces: [pencil], entries: [meal('earlier', 8), meal('another', 10), logged],
      gamification: g({ pendingLevelUp: 3, awardedKeys: ['streak-7'], xpEvents: [award('streak-7')] }),
    }))
    for (const [plan, tier] of [[second, 'second'], [repeat, 'repeat']] as const) {
      expect(plan).toMatchObject({
        kind: 'quiet', tier, headline: 'Logged.', announcement: 'Logged Lunch.', pieces: [],
        cue: 'tap', mascotEvent: null, maxMotionMs: 0, ringClosed: false, levelUp: null,
      })
      expect(plan.detail).toBeUndefined()
    }
  })

  it('a detail plus a level-up combine into one announcement', () => {
    const plan = planLogFeedback(withMilestone({
      gamification: g({ pendingLevelUp: 3, awardedKeys: ['streak-7'], xpEvents: [award('streak-7', 'Seven logged days')] }),
    }))
    expect(plan).toMatchObject({ kind: 'milestone', levelUp: 3 })
    expect(plan.announcement).toBe('Logged Lunch. Seven logged days. Level 3.')
  })

  it('a food name that ends in punctuation is not given a second full stop', () => {
    const named = (name: string, over: Partial<FeedbackInput> = {}) => {
      const entry = { ...logged, name }
      return planLogFeedback(input({ receipt: makeLogReceipt(entry, 0), entries: [meal('yesterday', 12, -1), entry], ...over }))
    }
    expect(named('Rice.').announcement).toBe('Logged Rice.')
    expect(named('Pho!').announcement).toBe('Logged Pho!')
    expect(named('Rice. ').announcement).toBe('Logged Rice.')
    expect(named(' Rice').announcement).toBe('Logged Rice.')
    expect(named('Rice.', { ring: { before: ring(false), after: ring(true) } }).announcement)
      .toBe('Logged Rice. Your chosen logging steps are complete.')
    expect(named('Rice.', { gamification: g({ pendingLevelUp: 2 }) }).announcement).toBe('Logged Rice. Level 2.')
    for (const name of ['Rice.', 'Pho!', 'Rice. ']) {
      const plan = named(name)
      expect(plan.headline).toBe('Logged.')
      expect(plan.announcement).not.toMatch(/[.!?]\./)
    }
  })

  it('counts the current local day and preserves stamped entry dates', () => {
    const stamp = '2026-10-05'
    const current = { ...logged, timestamp: at(12, -1), localDate: stamp }
    const previous = { ...meal('other', 8), localDate: '2026-10-04' }
    expect(planLogFeedback(input({ entries: [previous, current] })).tier).toBe('full')
    expect(planLogFeedback(input({ entries: [current, { ...meal('earlier', 8, -1), localDate: stamp }] })).tier).toBe('second')
  })

  it('ordinary later logs use only the repeat acknowledgement', () => {
    expect(planLogFeedback(input({ entries: [meal('earlier', 8), logged] }))).toMatchObject({
      kind: 'ordinary', headline: 'Logged.', tier: 'second', mascotEvent: null,
      announcement: 'Logged Lunch.', pieces: [], awards: [], maxMotionMs: 240,
    })
  })
})
