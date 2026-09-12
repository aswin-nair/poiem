import { useId, useState } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Momo } from '../../components/Momo'

const LINES = [
  { text: 'Your lunch called. It wants a fan club.', expression: 'curious', pose: 'look_around' },
  { text: 'I’m a dumpling with a job. Follow your dreams.', expression: 'proud', pose: 'bow' },
  { text: 'Plot twist: the snack was part of the plot.', expression: 'caught_snacking', pose: 'wave_at_user' },
  { text: 'My hobbies? Supporting you. Being delicious.', expression: 'happy', pose: 'tiny_dance' },
  { text: 'I brought the enthusiasm. You bring the fork.', expression: 'celebrating', pose: 'happy_hop' },
] as const

/** A visitor invites the joke. No automatic announcements or repeat timers. */
export function MomoAside() {
  const [line, setLine] = useState(0)
  const description = useId()
  const current = LINES[line % LINES.length]
  return (
    <aside className="wp-momo-aside" aria-label="Meet Momo">
      <button className="wp-momo-poke" type="button" onClick={() => setLine(value => value + 1)} aria-label="Say something, Momo" aria-describedby={description}>
        <span className="wp-momo-cutout" key={line}>
          <Momo expression={current.expression} pose={line ? current.pose : 'still'} />
        </span>
        <Sparkles className="wp-momo-spark" size={18} aria-hidden="true" />
      </button>
      <div className="wp-momo-note">
        <span className="wp-momo-byline">Momo / your hype dumpling</span>
        <p aria-live="polite" aria-atomic="true">{current.text}</p>
        <span id={description} className="wp-momo-invite">Tap Momo for a little nonsense <ArrowUpRight size={13} aria-hidden="true" /></span>
      </div>
    </aside>
  )
}
