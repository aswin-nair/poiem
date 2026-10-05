import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react'
import { useReducedMotion } from 'motion/react'
import type { LogFeedbackPlan } from '../lib/logFeedbackPlan'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'

/** A receipt, never a gate: no focus movement, dialog, delayed text or award queue. */
export function LogMoment({ plan, foodName, outfit, showMomo, onUndo, onDone }: {
  plan: LogFeedbackPlan
  foodName: string
  outfit?: MomoOutfit
  showMomo: boolean
  onUndo?: () => void
  onDone: () => void
}): ReactElement {
  const reduced = useReducedMotion()
  const done = useRef(onDone)
  done.current = onDone
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hovered = useRef(false)
  const focused = useRef(false)
  const remaining = useRef(10_000)
  const started = useRef(0)
  function pause() {
    if (timer.current !== undefined) {
      clearTimeout(timer.current)
      timer.current = undefined
      remaining.current = Math.max(0, remaining.current - (Date.now() - started.current))
    }
  }
  function resume() {
    if (hovered.current || focused.current) return
    pause()
    started.current = Date.now()
    timer.current = setTimeout(() => done.current(), remaining.current)
  }
  useEffect(() => {
    resume()
    return pause
  }, []) // the receipt key owns the lifetime; changing callbacks cannot restart Undo
  const motionMs = reduced ? 0 : plan.maxMotionMs
  return (
    <aside
      className={`k-log-moment${motionMs === 0 ? ' is-static' : ''}`}
      aria-label={`Log confirmation for ${foodName}`}
      data-mascot-avoid
      style={{ '--k-moment-ms': `${motionMs}ms` } as CSSProperties}
      onMouseEnter={() => { hovered.current = true; pause() }}
      onMouseLeave={() => { hovered.current = false; resume() }}
      onFocus={() => { focused.current = true; pause() }}
      onBlur={event => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        focused.current = false
        resume()
      }}
    >
      <div className="k-log-moment-copy">
        <h2>{plan.headline}</h2>
        <p>{foodName}</p>
        {plan.detail && <p>{plan.detail}</p>}
        {plan.pieces.length > 0 && <p className="k-log-moment-piece">{plan.kind === 'first-meal' ? 'Momo’s first piece: ' : 'New for Momo: '}{plan.pieces.map(piece => piece.name).join(', ')}</p>}
        {plan.awards.length > 0 && <ul>{plan.awards.map(award => <li key={award.key}>{award.label}</li>)}</ul>}
        {plan.levelUp !== null && <p>Level {plan.levelUp}.</p>}
      </div>
      {showMomo && motionMs > 0 && <span className="k-log-moment-momo" aria-hidden><Momo outfit={outfit} pose="still" expression="proud" steam={false} /></span>}
      <div className="k-log-moment-actions">
        {onUndo && <button type="button" className="k-text-button" onClick={onUndo}>Undo</button>}
        <button type="button" className="k-text-button" onClick={onDone}>Dismiss</button>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{plan.announcement}</span>
    </aside>
  )
}
