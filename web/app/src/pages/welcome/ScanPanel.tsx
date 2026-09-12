import { useRef, useState, type CSSProperties } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { useCountUp } from '../../hooks/useCountUp'
import { layoutCallouts, leaderPath, STAGE } from './callouts'
import { PlateArt } from './PlateArt'
import { mealKcal, SAMPLE_MEALS } from './meals'
import { useMediaQuery } from './useMediaQuery'

const GRID_STEP = 40
const VERTICALS = Array.from({ length: Math.floor(STAGE.width / GRID_STEP) }, (_, i) => GRID_STEP / 2 + i * GRID_STEP)
const HORIZONTALS = Array.from({ length: Math.floor(STAGE.height / GRID_STEP) }, (_, i) => GRID_STEP / 2 + i * GRID_STEP)
/** Phones crop the drawing to the plate and list the foods underneath instead of labelling them. */
const COMPACT_VIEW = `${STAGE.plateX - 20} ${STAGE.plateY - 20} ${STAGE.plateSize + 40} ${STAGE.plateSize + 40}`
const MACROS = [['Protein', 'protein'], ['Carbs', 'carbs'], ['Fat', 'fat']] as const

const pad = (value: number) => String(value).padStart(2, '0')
const order = (index: number) => ({ '--i': index }) as CSSProperties

/** The hero: a sample plate is read into labelled foods and a calorie total. */
export function ScanPanel() {
  const [index, setIndex] = useState(0)
  const [hot, setHot] = useState<number | null>(null)
  const compact = useMediaQuery('(max-width: 640px)')
  const figure = useRef<HTMLElement>(null)
  // On a phone the plate sits below the headline. Read it when it arrives on screen, not while it's out of sight.
  const inView = useInView(figure, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()
  const play = inView || Boolean(reduced)
  const meal = SAMPLE_MEALS[index]
  const total = mealKcal(meal)
  const kcal = useCountUp(play ? total : 0, 650)
  const callouts = layoutCallouts(meal.items)

  return (
    <figure ref={figure} className="wp-scan" data-play={play}>
      <figcaption className="wp-meta-row">
        <span>Sample plate {pad(index + 1)} / {pad(SAMPLE_MEALS.length)}</span>
        <span>{meal.name}</span>
      </figcaption>

      {/* Keyed by meal so the scan replays each time a plate is chosen. */}
      <div className="wp-scan-stage" key={`${meal.id}-${compact ? 'compact' : 'wide'}`}>
        <svg className="wp-scan-svg" viewBox={compact ? COMPACT_VIEW : `0 0 ${STAGE.width} ${STAGE.height}`} aria-hidden="true" focusable="false">
          <g className="wp-scan-grid">
            {VERTICALS.map((x, i) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2={STAGE.height} style={order(i)} />)}
            {HORIZONTALS.map((y, i) => <line key={`h${y}`} x1="0" y1={y} x2={STAGE.width} y2={y} style={order(i + VERTICALS.length)} />)}
          </g>
          <PlateArt meal={meal.id} x={STAGE.plateX} y={STAGE.plateY} width={STAGE.plateSize} height={STAGE.plateSize} />
          {!compact && (
            <g className="wp-scan-leaders">
              {callouts.map(callout => (
                <g key={callout.item.label} className={hot === callout.index ? 'is-hot' : undefined} style={order(callout.index)}>
                  <path className="wp-scan-halo" d={leaderPath(callout)} />
                  <path d={leaderPath(callout)} />
                </g>
              ))}
            </g>
          )}
          {callouts.map(callout => (
            <g key={callout.item.label} transform={`translate(${callout.marker.x} ${callout.marker.y})`}>
              <g className={`wp-scan-marker${hot === callout.index ? ' is-hot' : ''}`} style={order(callout.index)}>
                <circle r="17" />
                <text>{callout.index + 1}</text>
              </g>
            </g>
          ))}
        </svg>
        {!compact && (
          <ul className="wp-scan-tags">
            {callouts.map(callout => (
              <li
                key={callout.item.label}
                className={`is-${callout.side}${hot === callout.index ? ' is-hot' : ''}`}
                style={{ left: `${(callout.anchor.x / STAGE.width) * 100}%`, top: `${(callout.anchor.y / STAGE.height) * 100}%`, '--i': callout.index } as CSSProperties}
                onPointerEnter={() => setHot(callout.index)}
                onPointerLeave={() => setHot(null)}
              >
                <strong>{callout.item.label}</strong>{' '}<span className="tabular">{callout.item.kcal} kcal</span>
              </li>
            ))}
          </ul>
        )}
        <span className="wp-scan-sweep" />
      </div>

      {compact && (
        <ol className="wp-scan-legend" key={meal.id}>
          {meal.items.map((item, i) => (
            <li key={item.label} style={order(i)}><span className="wp-scan-num">{i + 1}</span><span>{item.label}</span><span className="tabular">{item.kcal} kcal</span></li>
          ))}
        </ol>
      )}

      <div className="wp-scan-total">
        <strong className="tabular" aria-hidden="true">{kcal}</strong>
        <span aria-hidden="true">kcal<br />estimated</span>
        <ul className="wp-scan-macros" aria-label="Macros">
          {MACROS.map(([label, key]) => <li key={key}><span>{label}</span>{' '}<strong className="tabular">{meal[key]} g</strong></li>)}
        </ul>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{`${meal.name}: about ${total} kcal.`}</p>
      </div>

      <div className="wp-scan-picker" role="group" aria-label="Scan a sample meal">
        {SAMPLE_MEALS.map((option, i) => (
          <button key={option.id} type="button" aria-pressed={i === index} onClick={() => { setIndex(i); setHot(null) }}>
            <PlateArt meal={option.id} className="wp-scan-thumb" />
            <span>{option.short}</span>
          </button>
        ))}
      </div>
      <p className="wp-scan-invitation"><span aria-hidden="true">↳</span> Pick a plate. Watch the ingredients add up.<span className="wp-sample-note">Illustrated examples</span></p>
    </figure>
  )
}
