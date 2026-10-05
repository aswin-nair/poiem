import { useRef } from 'react'

import { feel, type SoundCue } from '../lib/feel'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { IconClose } from './icons'

export const PORTIONS = [0.5, 1, 1.5, 2] as const
export type Portion = (typeof PORTIONS)[number]

/**
 * Pick a portion multiplier for a meal you are logging again.
 *
 * Opened by press-and-hold, and equally by the context-menu gesture, so it is
 * not gated behind a gesture some people cannot perform. A plain tap on the
 * row still logs a single portion — this only ever adds a choice.
 */
export function PortionSheet({
  name,
  calories,
  onPick,
  onClose,
  cue = 'select',
}: {
  name: string
  calories: number
  onPick: (multiplier: Portion) => void
  onClose: () => void
  cue?: SoundCue | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dismiss = () => { feel('close'); onClose() }
  useDialogFocus(ref, dismiss)

  return (
    <div
      className="portion-overlay"
      role="presentation"
      onClick={dismiss}
    >
      <div
        ref={ref}
        className="portion-sheet"
        role="dialog"
        aria-modal
        aria-labelledby="portion-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="portion-header">
          <p className="portion-title" id="portion-title">Portion for {name}</p>
          <button type="button" className="portion-close" onClick={dismiss} aria-label="Close portion choices">
            <IconClose size={16} strokeWidth={2.4} />
          </button>
        </div>
        <p className="portion-sub">How much of it?</p>
        <div className="portion-options">
          {PORTIONS.map(p => (
            <button
              key={p}
              type="button"
              className={`portion-option${p === 1 ? ' is-default' : ''}`}
              onClick={() => { if (cue) feel(cue); onPick(p) }}
            >
              <span className="portion-mult">{p}×</span>
              <span className="portion-kcal tabular">{Math.round(calories * p)} kcal</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
