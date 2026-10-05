import type { FeedbackKind, LogFeedbackPlan } from './logFeedbackPlan'

/** What Today shows for one accepted log: the moment card or the ordinary toast, never both. */
export interface LogPresentation {
  surface: 'card' | 'toast'
  headline: string
  /** Each fact once: the detail first, then any other piece names, the awards with their XP, then the level. */
  lines: string[]
  /** A small Momo on the card, only for the first meal and a new wardrobe piece. */
  showMomo: boolean
  /** The toast, when there is one, names the food, plus "Level N." when the log gained a level. */
  toastText: string
}

/**
 * The card is chosen by kind, whatever the tier: a second or third log that
 * unlocks a piece, crosses a milestone or closes the ring still gets its card,
 * and the planner's `maxMotionMs` (240 at the second log, 120 after) keeps it calm.
 */
const CARD_KINDS: ReadonlySet<FeedbackKind> = new Set(['first-meal', 'wardrobe', 'milestone', 'ring'])
const MOMO_KINDS: ReadonlySet<FeedbackKind> = new Set(['first-meal', 'wardrobe'])

export function presentLogFeedback(plan: LogFeedbackPlan, foodName: string): LogPresentation {
  const surface = CARD_KINDS.has(plan.kind) || (plan.kind === 'first-of-day' && plan.tier === 'full') ? 'card' : 'toast'
  const logged = `Logged ${foodName.trim()}`
  // A plain log's toast is one line with a level-up folded in; a card carries the level as its own line.
  const toastText = surface === 'toast' && plan.levelUp !== null
    ? `${logged}${/[.!?]$/.test(logged) ? '' : '.'} Level ${plan.levelUp}.`
    : logged
  if (plan.kind === 'quiet') return { surface, headline: plan.headline, lines: [], showMomo: false, toastText }

  const lines: string[] = []
  if (plan.detail) lines.push(plan.detail)
  // A wardrobe plan already names its pieces in the detail; the first meal names its handover here.
  if (plan.kind === 'first-meal' && plan.pieces.length > 0) {
    const [handover, ...others] = plan.pieces
    lines.push(`Momo’s first piece: ${handover.name}`)
    if (others.length) lines.push(`New for Momo: ${others.map(piece => piece.name).join(', ')}`)
  }
  for (const award of plan.awards) {
    if (award.label === plan.detail) continue
    lines.push(`${award.label} · +${award.xp} XP`)
  }
  if (plan.levelUp !== null) lines.push(`Level ${plan.levelUp}.`)

  return { surface, headline: plan.headline, lines: [...new Set(lines)], showMomo: MOMO_KINDS.has(plan.kind), toastText }
}

/** The Day ring's check acknowledgement is 240 ms at most. */
export const RING_CHECK_MS = 240

/**
 * How long the ring's check may move after this log: the ring closing plays on
 * every tier, never longer than the log's own cap, and still under reduced motion.
 * Null when the ring did not close.
 */
export function ringCheckMs(plan: Pick<LogFeedbackPlan, 'ringClosed' | 'maxMotionMs'>, reduced: boolean): number | null {
  if (!plan.ringClosed) return null
  return reduced ? 0 : Math.min(RING_CHECK_MS, plan.maxMotionMs)
}

/**
 * The level Today should toast on its own, or null. A log's card owns its
 * "Level N." line, so nothing is toasted while a receipt is still on its way in
 * or the log sheet is open (a quick add commits the new level a moment before
 * its navigation lands), and each level is toasted once, however often the
 * effect runs.
 */
export function levelUpToToast(input: {
  pendingLevel: number | null
  paused: boolean
  receiptPending: boolean
  sheetOpen: boolean
  lastToasted: number | null
}): number | null {
  const { pendingLevel } = input
  if (pendingLevel === null || input.paused || input.receiptPending || input.sheetOpen) return null
  return pendingLevel === input.lastToasted ? null : pendingLevel
}

export type MomentExit = 'undo' | 'dismiss' | 'timeout'

/**
 * Undo and Dismiss unmount the button that has focus, so focus moves to a
 * stable landmark. A card that leaves on its own moves focus only if focus was
 * inside it.
 */
export function movesFocusOnExit(exit: MomentExit, focusInside: boolean): boolean {
  return exit !== 'timeout' || focusInside
}

/** Some screen readers ignore a live region that arrives already filled, so it mounts empty first. */
export const ANNOUNCE_DELAY_MS = 50

/** Calls `announce` once the empty live region has mounted; the returned function cancels it. */
export function scheduleAnnouncement(announce: () => void, delayMs = ANNOUNCE_DELAY_MS): () => void {
  const timer = setTimeout(announce, delayMs)
  return () => clearTimeout(timer)
}
