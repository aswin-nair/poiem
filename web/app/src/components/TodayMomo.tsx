import { useState } from 'react'
import { useFeel } from '../hooks/useHaptic'
import { MOMO_POKES, type TodayGreeting } from '../lib/todayGreeting'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'
import { IconFlame } from './icons'

/**
 * Momo says hello at the top of Today, dressed in his current outfit. A tap
 * gets a playful line and a little bop; nothing moves or talks on its own.
 */
export function TodayMomo({ greeting, outfit, roasts, onRoast }: {
  greeting: TodayGreeting
  outfit?: MomoOutfit
  roasts: boolean
  onRoast: () => void
}) {
  const feel = useFeel()
  const [pokes, setPokes] = useState(0)
  const current = pokes === 0 ? greeting : MOMO_POKES[(pokes - 1) % MOMO_POKES.length]

  return (
    <aside className="k-momo" aria-label="A note from Momo">
      <button
        type="button"
        className="k-momo-poke"
        aria-label="Say something, Momo"
        onClick={() => { feel('tap'); setPokes(count => count + 1) }}
      >
        <span className="k-momo-cutout" key={pokes}>
          <Momo expression={current.expression} pose={pokes ? current.pose : 'still'} outfit={outfit} />
        </span>
      </button>
      <div className="k-momo-note">
        <p className="k-momo-hello">{greeting.hello}</p>
        <p className="k-momo-line" aria-live="polite" aria-atomic="true">{current.line}</p>
        {roasts && (
          <button type="button" className="k-text-button k-momo-roast" onClick={onRoast}>
            Roast me <IconFlame size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
