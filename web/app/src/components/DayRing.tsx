import { useId, type CSSProperties, type ReactNode } from 'react'
import type { DayRingArc, DayRingProgress } from '../lib/dayRing'

// The streak-bearing log is the protected inner arc; optional ambition grows
// outward from it and can never make the inner promise look incomplete.
const SIZES = [52, 72, 92]

/**
 * A step the person chose is drawn in ink, an optional one in muted ink: both
 * hold 3:1 against the section in light and dark (DayRing.test.tsx measures
 * them from tokens.css), which the persimmon and sky fills did not.
 */
const arcColor = (arc: DayRingArc) => arc.required ? 'var(--k-role-text)' : 'var(--k-role-text-muted)'

export function DayRing({ progress, justClosed = false, closeMs = 240, note }: {
  progress: DayRingProgress
  /** The ring closed just now: the check plays once, for `closeMs` (the log's motion cap, 0 when still). */
  justClosed?: boolean
  closeMs?: number
  note?: ReactNode
}) {
  const titleId = `ring-title-${useId()}`
  return (
    <section
      className={`k-ring${justClosed ? ' is-just-closed' : ''}`}
      aria-labelledby={titleId}
      style={justClosed ? { '--k-ring-check-ms': `${closeMs}ms` } as CSSProperties : undefined}
    >
      <div className="k-ring-graphic">
        {/* The one place the step count is read: the visible centre and legend are its picture. */}
        <svg viewBox="0 0 112 112" role="img" aria-label={`${progress.requiredComplete} of ${progress.requiredTotal} chosen steps complete`}>
          {/* A circle's stroke starts at 3 o'clock; a static quarter turn starts every arc at 12. */}
          <g transform="rotate(-90 56 56)">
            {progress.arcs.map((arc, index) => {
              const diameter = SIZES[index]!
              const radius = diameter / 2
              const circumference = Math.PI * diameter
              const value = Math.min(1, arc.value)
              return (
                <g key={arc.id}>
                  <circle className="k-ring-track" cx="56" cy="56" r={radius} />
                  <circle
                    className={`k-ring-fill k-ring-fill-${arc.id}${value > 0 ? '' : ' is-empty'}`}
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke={arcColor(arc)}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * (1 - value)}
                  />
                </g>
              )
            })}
          </g>
        </svg>
        <div className="k-ring-center" aria-hidden="true">
          {progress.complete ? <strong className="k-ring-check">✓</strong> : <strong>{progress.requiredComplete}/{progress.requiredTotal}</strong>}
        </div>
      </div>
      <div className="k-ring-copy">
        <h2 id={titleId}>Your day</h2>
        <ul className="k-ring-legend">
          {progress.arcs.map(arc => (
            <li key={arc.id} className={arc.value >= 1 ? 'is-done' : undefined}>
              <span className="k-ring-dot" style={{ background: arcColor(arc) }} aria-hidden="true" />
              <span>{arc.label}</span>
              <small>{arc.current}/{arc.total}{!arc.required ? ' · optional' : ''}</small>
            </li>
          ))}
        </ul>
      </div>
      {note}
    </section>
  )
}
