import { WARDROBE, type WardrobePiece } from '@fud-ai/product/wardrobe'
import { HABIT_MILESTONES } from './habitMilestones'

export interface ProgressNote {
  kind: 'outfit' | 'milestone' | 'complete'
  text: string
}

/** One future logged-day goal; a break cannot change the journal's real count. */
export function progressNote(input: { loggedDays: number; ownedPieceIds: readonly string[] }): ProgressNote {
  const { loggedDays, ownedPieceIds } = input
  const milestone = HABIT_MILESTONES.find(day => day > loggedDays)
  let nextPiece: WardrobePiece | undefined
  let pieceTarget = Infinity
  for (const piece of WARDROBE) {
    if (piece.unlock.kind === 'loggedDays'
      && piece.unlock.days > loggedDays
      && piece.unlock.days < pieceTarget
      && !ownedPieceIds.includes(piece.id)) {
      nextPiece = piece
      pieceTarget = piece.unlock.days
    }
  }
  const count = `${loggedDays} logged ${loggedDays === 1 ? 'day' : 'days'}`
  if (nextPiece && pieceTarget <= (milestone ?? Infinity)) return {
    kind: 'outfit', text: `${count} · Momo’s ${nextPiece.name} unlocks at ${pieceTarget} logged days`,
  }
  if (milestone !== undefined) return {
    kind: 'milestone', text: `${count} · next milestone at ${milestone} logged ${milestone === 1 ? 'day' : 'days'}`,
  }
  return { kind: 'complete', text: `${loggedDays} logged days. Look how far you’ve come.` }
}
