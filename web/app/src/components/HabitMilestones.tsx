import { IconCheck, IconTrophy } from './icons'
import { HABIT_MILESTONES } from '../lib/habitMilestones'

/** Lifetime logged days: breaks never erase progress, and calories are not a score. */
export function HabitMilestones({ loggedDays }: { loggedDays: number }) {
  const count = Math.max(0, Math.floor(loggedDays))
  const next = HABIT_MILESTONES.find(day => day > count)
  return <section className="habit-milestones" aria-label="Logging milestones">
    <div className="habit-heading">
      <span className="habit-emblem"><IconTrophy size={26} /></span>
      <div><h2>Small steps. Real progress.</h2>
        <p>{next ? `${count} logged ${count === 1 ? 'day' : 'days'} · next milestone: ${next}` : `${count} logged days. Look how far you’ve come.`}</p>
      </div>
    </div>
    <ol className="habit-path">
      {HABIT_MILESTONES.map(day => <li key={day} className={count >= day ? 'is-achieved' : ''}>
        <span className="habit-node">{count >= day ? <IconCheck size={20} /> : day}</span>
        <span>{day === 1 ? 'First log' : `${day} days`}</span>
        <span className="sr-only">{count >= day ? ' achieved' : ' not yet reached'}</span>
      </li>)}
    </ol>
    <p className="habit-footnote">Every logged day counts. Breaks don’t reset these milestones.</p>
  </section>
}
