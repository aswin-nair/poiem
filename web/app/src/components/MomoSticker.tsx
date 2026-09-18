import { useApp } from '../store/AppContext'
import { Momo } from './Momo'
import type { Mood } from '../mascot/behaviors'
import type { MomoExpression } from '../mascot/expressions'
import type { MomoOutfit } from '../types'

/** Decorative, stationary artwork. Respects Hide Momo and does not add dialogue. */
export function MomoSticker({ mood = 'cozy', pose = 'still', expression, outfit }: {
  mood?: Mood
  pose?: string
  expression?: MomoExpression
  /** Shows a look other than the one he's wearing, e.g. a piece before it's handed over. */
  outfit?: MomoOutfit
}) {
  const { state } = useApp()
  if (state.gamification.mascotActivity === 'off') return null
  return (
    <span className="momo-sticker" aria-hidden="true">
      <Momo mood={mood} pose={pose} expression={expression} outfit={outfit ?? state.gamification.outfit} />
    </span>
  )
}
