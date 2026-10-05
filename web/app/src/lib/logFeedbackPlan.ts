import { entryDayKey, localDayKey } from '@fud-ai/product/localDate'
import { FIRST_PIECE, wardrobePiece, type WardrobePiece } from '@fud-ai/product/wardrobe'
import type { FoodEntry, GamificationState, XpEvent } from '../types'
import type { DayRingProgress } from './dayRing'
import type { SoundCue } from './feel'
import { awardsSince, type LogReceipt } from './logReceipt'

export type FeedbackKind = 'first-meal' | 'wardrobe' | 'milestone' | 'ring' | 'first-of-day' | 'ordinary' | 'quiet'
export type FeedbackTier = 'full' | 'second' | 'repeat'

export interface LogFeedbackPlan {
  kind: FeedbackKind
  tier: FeedbackTier
  headline: string
  detail?: string
  announcement: string
  awards: XpEvent[]
  pieces: WardrobePiece[]
  cue: SoundCue | null
  mascotEvent: 'log_success' | 'milestone' | null
  maxMotionMs: 0 | 120 | 240 | 480 | 720
  ringClosed: boolean
  levelUp: number | null
}

export function planLogFeedback(input: {
  receipt: LogReceipt
  entries: readonly FoodEntry[]
  gamification: GamificationState
  newPieces: readonly WardrobePiece[]
  firstMealJourney: boolean
  paused: boolean
  ring: { before: DayRingProgress; after: DayRingProgress }
  ringAckedToday: boolean
  now: Date
}): LogFeedbackPlan {
  const { receipt, entries, gamification } = input
  const today = localDayKey(input.now)
  const dayLogs = entries.filter(entry => entryDayKey(entry) === today).length
  const tier: FeedbackTier = dayLogs < 2 ? 'full' : dayLogs === 2 ? 'second' : 'repeat'
  const awards = awardsSince(receipt, gamification)
  const loggedAnnouncement = `Logged ${receipt.name}.`

  if (input.paused) return {
    kind: 'quiet', tier, headline: 'Logged.', announcement: loggedAnnouncement,
    awards, pieces: [], cue: 'tap', mascotEvent: null, maxMotionMs: 0,
    ringClosed: false, levelUp: null,
  }

  const firstMeal = !gamification.ownedCosmeticIds.includes(FIRST_PIECE)
    && (input.firstMealJourney || entries.filter(entry => entry.id !== receipt.id).length === 0)
  const pieces = [...input.newPieces]
  const handedOver = firstMeal ? wardrobePiece(FIRST_PIECE) : undefined
  if (handedOver) pieces.unshift(handedOver)
  const milestone = awards.find(award => award.key.startsWith('streak-'))
  const ringClosed = !input.ring.before.complete && input.ring.after.complete && !input.ringAckedToday
  const kind: FeedbackKind = firstMeal ? 'first-meal'
    : input.newPieces.length > 0 ? 'wardrobe'
    : milestone ? 'milestone'
    : ringClosed ? 'ring'
    : tier === 'full' ? 'first-of-day'
    : 'ordinary'
  const detail = kind === 'wardrobe' ? `New for Momo: ${pieces.map(piece => piece.name).join(', ')}`
    : kind === 'milestone' ? milestone?.label
    : kind === 'ring' ? 'Your chosen logging steps are complete.'
    : undefined
  const maxMotionMs = tier === 'repeat' ? 120
    : tier === 'second' ? 240
    : kind === 'first-meal' || kind === 'wardrobe' ? 720
    : 480
  const cue: SoundCue = tier === 'repeat' ? 'tap'
    : tier === 'second' ? 'select'
    : kind === 'milestone' ? 'badge'
    : 'log-confirm'
  const mascotEvent = tier !== 'full' ? null
    : pieces.length > 0 || kind === 'milestone' ? 'milestone'
    : kind === 'ring' || kind === 'first-of-day' ? 'log_success'
    : null
  const levelUp = gamification.pendingLevelUp
  const sentences = [loggedAnnouncement]
  if (detail) sentences.push(/[.!?]$/.test(detail) ? detail : `${detail}.`)
  if (levelUp !== null) sentences.push(`Level ${levelUp}.`)

  return {
    kind, tier, headline: firstMeal ? 'First meal in.' : 'Logged.', detail,
    announcement: sentences.join(' '), awards, pieces, cue, mascotEvent,
    maxMotionMs, ringClosed, levelUp,
  }
}
