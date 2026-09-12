import { useRef } from 'react'
import { useInView } from 'motion/react'
import { ArrowUpRight, Cookie, Pause, Play, Salad, Utensils } from 'lucide-react'

/** Continuous decorative motion has an explicit pause and stops offscreen. */
export function FoodTicker({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  const strip = useRef<HTMLDivElement>(null)
  const inView = useInView(strip, { amount: 0.1 })
  return (
    <div ref={strip} className="wp-food-ticker" data-running={inView && !paused}>
      <p className="sr-only">Real food. Real life. Room for seconds. Log your way.</p>
      <div className="wp-ticker-window" aria-hidden="true">
        <div className="wp-ticker-track">
          {[0, 1].map(copy => <div className="wp-ticker-copy" key={copy}>
            <span>Real food.</span><Salad />
            <span className="wp-ticker-outline">Real life.</span><Utensils />
            <span>Room for seconds.</span><Cookie />
            <span className="wp-ticker-outline">Log your way.</span><ArrowUpRight />
          </div>)}
        </div>
      </div>
      <button className="wp-ticker-toggle" type="button" onClick={onToggle} aria-label={paused ? 'Play decorative motion' : 'Pause decorative motion'}>
        {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        <span>{paused ? 'Play' : 'Pause'}</span>
      </button>
    </div>
  )
}
