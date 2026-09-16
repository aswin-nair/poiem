import { useEffect, useRef, useState } from 'react'

import { track } from '../lib/analytics'
import { useCountUp } from '../hooks/useCountUp'
import { prefersReducedMotion } from '../lib/tokens'
import type { WardrobePiece } from '@fud-ai/product/wardrobe'
import type { MomoOutfit, XpEvent } from '../types'
import { Momo } from './Momo'
import { useFeel } from '../hooks/useHaptic'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { PressableButton } from './PressableButton'

export interface LogCelebrationProps {
  foodName: string
  streak: number
  awards: XpEvent[]
  outfit?: MomoOutfit
  /** Wardrobe pieces unlocked since the last reveal. Momo arrives wearing the first. */
  pieces?: WardrobePiece[]
  firstMeal?: boolean
  onDone: () => void
}

/** A new piece earns Momo a little longer on stage. */
const PIECE_REVEAL_MS = 1400

export function LogCelebration({
  foodName,
  streak,
  awards,
  outfit,
  pieces = [],
  firstMeal = false,
  onDone,
}: LogCelebrationProps) {
  const [reduced] = useState(() => prefersReducedMotion())
  const [shown, setShown] = useState(false)
  const [visibleCount, setVisibleCount] = useState(reduced ? awards.length : 0)
  const feel = useFeel()
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(dialogRef, onDone)
  const visibleAwards = awards.slice(0, visibleCount)
  const revealedXp = visibleAwards.reduce((sum, award) => sum + award.xp, 0)
  const countedXp = useCountUp(revealedXp)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), reduced ? 0 : 20)
    return () => clearTimeout(t)
  }, [reduced])

  useEffect(() => {
    if (reduced || awards.length === 0) return
    let count = 0
    const timer = setInterval(() => {
      count += 1
      setVisibleCount(count)
      feel('select')
      if (count >= awards.length) clearInterval(timer)
    }, 420)
    return () => clearInterval(timer)
  }, [awards.length, feel, reduced])

  useEffect(() => {
    const reveal = pieces.length ? PIECE_REVEAL_MS : 0
    const ms = (reduced ? 1800 : Math.max(2300, awards.length * 420 + 1600)) + reveal
    const t = setTimeout(() => {
      track({ name: 'log_celebration_completed' })
      onDone()
    }, ms)
    return () => clearTimeout(t)
  }, [awards.length, pieces.length, onDone, reduced])

  const firstPiece = pieces[0]
  const wearing = firstPiece ? { ...outfit, [firstPiece.slot]: firstPiece.id } : outfit

  return (
    <div
      ref={dialogRef}
      className={`celebrate-overlay${shown ? ' is-shown' : ''}`}
      role="dialog"
      aria-modal
      aria-live="polite"
      aria-label="Meal logged"
    >
      <div className="celebrate-burst" aria-hidden />
      <div className="celebrate-inner">
        <div className="celebrate-momo" aria-hidden>
          <div style={{ width: 112, height: 112 }}><Momo mood="excited" outfit={wearing} /></div>
        </div>
        <h2 className="celebrate-title">{firstMeal ? 'First meal in.' : 'Logged.'}</h2>
        <p className="celebrate-sub">{foodName}</p>
        {firstMeal && <p className="celebrate-first">Momo saved your first plate. Tap it on Today if you want to correct anything.</p>}
        {pieces.length > 0 && (
          <p className="celebrate-piece">
            <span className="k-eyebrow">New for Momo</span>
            {pieces.map(piece => piece.name).join(', ')}
          </p>
        )}

        {awards.length > 0 && (
          <ul className="celebrate-awards" aria-label="Rewards revealed">
            {visibleAwards.map(award => (
              <li key={award.key}>
                <span>{award.label}</span>
                <strong className="tabular">+{award.xp} XP</strong>
              </li>
            ))}
          </ul>
        )}

        <div className="celebrate-stats">
          <div className="celebrate-stat">
            <span className="celebrate-stat-value tabular">+{countedXp}</span>
            <span className="celebrate-stat-label">XP revealed</span>
          </div>
          <div className="celebrate-stat">
            <span className="celebrate-stat-value tabular">{streak}</span>
            <span className="celebrate-stat-label">
              {streak === 1 ? 'day streak' : 'day streak'}
            </span>
          </div>
        </div>
        <PressableButton label="Continue" variant="secondary" onClick={onDone} />
      </div>
    </div>
  )
}
