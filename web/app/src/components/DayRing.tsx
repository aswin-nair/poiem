import { useId, type ReactNode } from 'react'
import type { DayRingProgress } from '../lib/dayRing'

// The streak-bearing log is the protected inner arc; optional ambition grows
// outward from it and can never make the inner promise look incomplete.
const SIZES = [52, 72, 92]
const COLORS = ['var(--k-action)', 'var(--k-sky-strong)', 'var(--k-role-text-muted)']

export function DayRing({ progress, justClosed = false, note }: { progress: DayRingProgress; justClosed?: boolean; note?: ReactNode }) {
  const titleId = `ring-title-${useId()}`
  return (
    <section className={`k-ring${justClosed ? ' is-just-closed' : ''}`} aria-labelledby={titleId}>
      <div className="k-ring-graphic">
        <svg viewBox="0 0 112 112" role="img" aria-label={`${progress.requiredComplete} of ${progress.requiredTotal} chosen steps complete`}>
          {progress.arcs.map((arc, index) => {
            const diameter = SIZES[index]!
            const radius = diameter / 2
            const circumference = Math.PI * diameter
            return (
              <g key={arc.id}>
                <circle className="k-ring-track" cx="56" cy="56" r={radius} />
                <circle
                  className={`k-ring-fill k-ring-fill-${arc.id}`}
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={COLORS[index]}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference * (1 - Math.min(1, arc.value))}
                />
              </g>
            )
          })}
        </svg>
        <div className="k-ring-center" aria-hidden="true">
          {progress.complete ? <strong className="k-ring-check">✓</strong> : <strong>{progress.requiredComplete}/{progress.requiredTotal}</strong>}
        </div>
      </div>
      <div className="k-ring-copy">
        <h2 id={titleId}>Your day <span className="sr-only">· {progress.requiredComplete} of {progress.requiredTotal} chosen logging steps complete</span></h2>
        <ul className="k-ring-legend">
          {progress.arcs.map((arc, index) => (
            <li key={arc.id} className={arc.value >= 1 ? 'done' : ''}>
              <span className="k-ring-dot" style={{ background: COLORS[index] }} aria-hidden="true" />
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
