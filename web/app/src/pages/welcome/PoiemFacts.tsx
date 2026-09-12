import { useRef, type CSSProperties } from 'react'
import { useInView } from 'motion/react'

const ROWS = [
  { label: 'Estimates you can edit', value: '100%' },
  { label: 'Ways to log', value: '4*' },
  { label: 'Foods off-limits', value: '0' },
  { label: 'Milestones reset by a day off', value: '0' },
  { label: 'Journal you can delete', value: '100%' },
] as const

/** The principles, set as a nutrition label for an ordinary day. It drops in, then fills row by row. */
export function PoiemFacts() {
  const label = useRef<HTMLElement>(null)
  const arrived = useInView(label, { once: true, amount: 0.35 })
  return (
    <section className="wp-section" id="principles" aria-labelledby="principles-title">
      <div className="wp-wrap wp-facts-grid">
        <div className="wp-facts-copy">
          <p className="wp-label">[04] Principles</p>
          <h2 id="principles-title">Built to support.<br /><span>Not to judge.</span></h2>
          <p className="wp-facts-lede">Poiem gives you the numbers without the lecture. Here is what goes into an ordinary day with it.</p>
        </div>
        <figure ref={label} className={`wp-facts wp-nl${arrived ? ' is-in' : ''}`} aria-labelledby="facts-title">
          <h3 id="facts-title" className="wp-facts-title">Poiem Facts</h3>
          <p className="wp-nl-serving"><span>Serving size</span><span>1 ordinary day</span></p>
          <span className="wp-nl-rule is-thick" aria-hidden="true" />
          <p className="wp-nl-amount">Amount per day</p>
          <p className="wp-nl-kcal"><span>Food guilt</span>{' '}<strong className="tabular">0<small>g</small></strong></p>
          <span className="wp-nl-rule is-medium" aria-hidden="true" />
          <dl className="wp-facts-rows">
            {ROWS.map((row, i) => (
              <div key={row.label} style={{ '--i': i } as CSSProperties}><dt>{row.label}</dt><dd className="tabular">{row.value}</dd></div>
            ))}
          </dl>
          <span className="wp-nl-rule is-thick" aria-hidden="true" />
          <figcaption className="wp-nl-note">* Photo, description, manual entry or a saved meal. Poiem is a food journal for adults, not medical advice.</figcaption>
        </figure>
      </div>
    </section>
  )
}
