import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { useReducedMotion } from 'motion/react'
import type { LogFeedbackPlan } from '../lib/logFeedbackPlan'
import { movesFocusOnExit, presentLogFeedback, scheduleAnnouncement } from '../lib/logPresentation'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'

const VISIBLE_MS = 10_000

/**
 * A receipt, never a gate: no dialog, focus trap, delayed text or award queue.
 * It never takes focus. Undo and Dismiss, and a timeout while focus is inside,
 * report `moveFocus` so the page can put focus somewhere stable.
 */
export function LogMoment({ plan, foodName, outfit, showMomo, onUndo, onDone }: {
  plan: LogFeedbackPlan
  foodName: string
  outfit?: MomoOutfit
  /** The person's own Momo settings allow a small Momo here. */
  showMomo: boolean
  onUndo?: () => void
  onDone: (moveFocus: boolean) => void
}): ReactElement {
  const reduced = useReducedMotion()
  const view = presentLogFeedback(plan, foodName)
  const card = useRef<HTMLElement>(null)
  const done = useRef(onDone)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hovered = useRef(false)
  const focused = useRef(false)
  const remaining = useRef(VISIBLE_MS)
  const started = useRef(0)
  // The live region mounts empty and is filled a moment later, so it is announced once.
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => { done.current = onDone })
  useEffect(() => scheduleAnnouncement(() => setAnnouncement(plan.announcement)), [plan.announcement])

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
    timer.current = setTimeout(() => {
      const inside = Boolean(card.current?.contains(document.activeElement))
      done.current(movesFocusOnExit('timeout', inside))
    }, remaining.current)
  }
  useEffect(() => {
    resume()
    return pause
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- the receipt key owns the lifetime; changing callbacks cannot restart Undo

  const motionMs = reduced ? 0 : plan.maxMotionMs
  const firstPiece = plan.pieces[0]
  // The try-on: a new piece arrives worn on the card's Momo before anyone dresses him.
  const wearing = firstPiece ? { ...outfit, [firstPiece.slot]: firstPiece.id } : outfit
  return (
    <aside
      ref={card}
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
        <h2>{view.headline}</h2>
        <p className="k-log-moment-food">{foodName}</p>
        {view.lines.map(line => <p key={line}>{line}</p>)}
      </div>
      {showMomo && view.showMomo && motionMs > 0 && (
        <span className="k-log-moment-momo" aria-hidden="true"><Momo outfit={wearing} pose="still" expression="proud" steam={false} /></span>
      )}
      <div className="k-log-moment-actions">
        {onUndo && <button type="button" className="k-text-button" onClick={() => { onUndo(); onDone(movesFocusOnExit('undo', true)) }}>Undo</button>}
        <button type="button" className="k-text-button" onClick={() => onDone(movesFocusOnExit('dismiss', true))}>Dismiss</button>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
    </aside>
  )
}
