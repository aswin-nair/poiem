import { useEffect, useId, useRef, useState } from 'react'
import { useFeel } from '../hooks/useHaptic'
import {
  MOMO_PLAY_ACTIONS, MOMO_PLAY_DURATION_MS, MOMO_PLAY_WELCOME, momoPlayBeat,
  type MomoPlayActionId, type MomoPlayBeat,
} from '../lib/momoPlay'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'
import { IconChevronDown, IconSparkles } from './icons'

type Performance = { action: MomoPlayActionId; beat: MomoPlayBeat; take: number; animate: boolean }

/** An invitation to play, opened and performed only by the person using it. */
export function MomoPlayroom({ still, outfit }: { still: boolean; outfit?: MomoOutfit }) {
  const id = useId()
  const feel = useFeel()
  const toggle = useRef<HTMLButtonElement>(null)
  const finish = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const counts = useRef<Record<MomoPlayActionId, number>>({ 'high-five': 0, face: 0, dance: 0 })
  const take = useRef(0)
  const [open, setOpen] = useState(false)
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [line, setLine] = useState(MOMO_PLAY_WELCOME)

  useEffect(() => {
    const stopOnHide = () => {
      if (document.visibilityState !== 'hidden') return
      clearTimeout(finish.current)
      setPerformance(null)
    }
    document.addEventListener('visibilitychange', stopOnHide)
    return () => {
      clearTimeout(finish.current)
      document.removeEventListener('visibilitychange', stopOnHide)
    }
  }, [])

  useEffect(() => {
    if (!still) return
    clearTimeout(finish.current)
    setPerformance(null)
  }, [still])

  function close() {
    clearTimeout(finish.current)
    setPerformance(null)
    setOpen(false)
    setLine(MOMO_PLAY_WELCOME)
    feel('close')
    toggle.current?.focus()
  }

  function play(action: MomoPlayActionId) {
    const beat = momoPlayBeat(action, counts.current[action]++)
    clearTimeout(finish.current)
    setLine(beat.line)
    setPerformance({ action, beat, take: ++take.current, animate: !still })
    feel('poke')
    finish.current = setTimeout(() => setPerformance(null), MOMO_PLAY_DURATION_MS)
  }

  return (
    <div className={`k-momo-playroom${still ? ' is-still' : ''}`}>
      <button
        ref={toggle}
        type="button"
        className="k-momo-play-toggle"
        aria-expanded={open}
        aria-controls={`${id}-stage`}
        data-action-play="off"
        onClick={() => {
          if (open) close()
          else { setOpen(true); feel('open') }
        }}
      >
        <IconSparkles size={18} />
        <span>Play with Momo</span>
        <IconChevronDown size={18} />
      </button>
      <div id={`${id}-stage`} className="k-momo-play-content" hidden={!open}>
        {open && <>
          <div className="k-momo-play-stage" aria-hidden="true">
            <span className="k-momo-play-stage-label">Very small theatre</span>
            <span className="k-momo-play-star is-left">✦</span>
            <span className="k-momo-play-star is-right">✦</span>
            <span
              key={performance?.take ?? 'rest'}
              className={`k-momo-play-actor${performance?.animate ? ` is-${performance.action}` : ''}`}
            >
              <Momo
                expression={performance?.beat.expression ?? 'happy'}
                pose={performance?.beat.pose ?? 'still'}
                steam={false}
                outfit={outfit}
              />
            </span>
          </div>
          <p className="k-momo-play-line" role="status" aria-live="polite" aria-atomic="true">{line}</p>
          <div className="k-momo-play-actions" role="group" aria-label="Play with Momo">
            {MOMO_PLAY_ACTIONS.map(action => (
              <button key={action.id} type="button" data-action-play="off" onClick={() => play(action.id)}>
                {action.label}
              </button>
            ))}
          </div>
          <button type="button" className="k-momo-play-close" data-action-play="off" onClick={close}>Close playtime</button>
        </>}
      </div>
    </div>
  )
}
