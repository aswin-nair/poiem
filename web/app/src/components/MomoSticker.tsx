import { useApp } from '../store/AppContext'
import { Momo } from './Momo'
import type { Mood } from '../mascot/behaviors'
import type { MomoExpression } from '../mascot/expressions'

/** Decorative, stationary artwork. Respects Hide Momo and does not add dialogue. */
export function MomoSticker({ mood = 'cozy', pose = 'still', expression }: { mood?: Mood; pose?: string; expression?: MomoExpression }) {
  const { state } = useApp()
  if (state.gamification.mascotActivity === 'off') return null
  return (
    <span className="momo-sticker" aria-hidden="true">
      <Momo mood={mood} pose={pose} expression={expression} outfit={state.gamification.outfit} />
    </span>
  )
}
