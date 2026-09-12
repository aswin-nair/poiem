import { useRef, type CSSProperties } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { PlateArt } from './PlateArt'
import type { MealId } from './meals'
import { SectionHead } from './SectionHead'

interface LoggedDay { day: string; meal: MealId; kcal: number; entries: number }
interface OffDay { day: string; off: true }
type WeekDay = LoggedDay | OffDay

const WEEK: readonly WeekDay[] = [
  { day: 'Mon', meal: 'yogurt', kcal: 1840, entries: 4 },
  { day: 'Tue', meal: 'bowl', kcal: 2060, entries: 3 },
  { day: 'Wed', off: true },
  { day: 'Thu', meal: 'toast', kcal: 1720, entries: 3 },
  { day: 'Fri', meal: 'pizza', kcal: 2280, entries: 5 },
  { day: 'Sat', off: true },
  { day: 'Sun', meal: 'bowl', kcal: 1950, entries: 4 },
]
/** kcal that fills a day's meter. */
const METER_SCALE = 2400

function isLogged(day: WeekDay): day is LoggedDay {
  return !('off' in day)
}

const LOGGED = WEEK.filter(isLogged)
const AVERAGE = Math.round(LOGGED.reduce((sum, day) => sum + day.kcal, 0) / LOGGED.length)

/** Each day also stamps in on its own, so a phone that stacks the week sees every day arrive. */
function Day({ day, index }: { day: WeekDay; index: number }) {
  const row = useRef<HTMLLIElement>(null)
  const arrived = useInView(row, { once: true, amount: 0.6 })
  const style = { '--i': index } as CSSProperties
  const state = arrived ? ' is-in' : ''
  return isLogged(day) ? (
    <li ref={row} className={`wp-day${state}`} style={style}>
      <p className="wp-day-name">{day.day}</p>
      <PlateArt meal={day.meal} className="wp-day-plate" />
      <p className="wp-day-kcal"><strong className="tabular">{day.kcal.toLocaleString('en-US')}</strong>kcal</p>
      <p className="wp-day-note">{day.entries} entries</p>
      <span className="wp-day-meter" aria-hidden="true"><span style={{ '--fill': day.kcal / METER_SCALE } as CSSProperties} /></span>
    </li>
  ) : (
    <li ref={row} className={`wp-day is-off${state}`} style={style}>
      <p className="wp-day-name">{day.day}</p>
      <span className="wp-day-plate wp-day-empty" aria-hidden="true" />
      <p className="wp-day-kcal"><strong>Day off</strong>Not logged</p>
      <p className="wp-day-note">Nothing to catch up on</p>
      <span className="wp-day-meter" aria-hidden="true" />
    </li>
  )
}

/** A sample week as a ruled board: logged days stamp in, days off stay part of the week. */
export function WeekBlocks() {
  const board = useRef<HTMLDivElement>(null)
  const inView = useInView(board, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()

  return (
    <section className="wp-section wp-band-acid" id="week" aria-labelledby="week-title">
      <div className="wp-wrap">
        <SectionHead index="03" label="Your week" titleId="week-title" title={<>A real week.<br /><span>Days off included.</span></>} note="Sample week" />
        <div ref={board} className="wp-week-board">
          <div className="wp-week-scroll" tabIndex={0} role="region" aria-label="Sample week, Monday to Sunday">
            <ol className={`wp-week ${inView || reduced ? 'is-playing' : 'is-armed'}`} aria-label="Sample week">
              {WEEK.map((day, i) => <Day key={day.day} day={day} index={i} />)}
            </ol>
          </div>
          <ul className="wp-week-summary">
            <li><strong className="tabular">{String(LOGGED.length).padStart(2, '0')}</strong><span>Days logged</span></li>
            <li><strong className="tabular">{String(WEEK.length - LOGGED.length).padStart(2, '0')}</strong><span>Days off</span></li>
            <li><strong className="tabular">{AVERAGE.toLocaleString('en-US')}</strong><span>Average kcal on logged days</span></li>
          </ul>
        </div>
      </div>
    </section>
  )
}
