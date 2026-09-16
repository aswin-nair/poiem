import {
  addDays,
  weekDatesContaining,
  sameDay,
  startOfWeek,
  narrowWeekday,
  localDayKey,
} from '../lib/dates'
import { IconChevronLeft, IconChevronRight } from './icons'

interface WeekStripProps {
  selectedDate: Date
  onSelect: (date: Date) => void
  /** local_date keys with at least one entry — shown as streak state. */
  loggedDays?: Set<string>
  /** local_date keys covered by a freeze, so a gap does not read as a miss. */
  frozenDays?: Set<string>
  /**
   * Previous and next week arrows. Today leaves them out so each day keeps a
   * 44px target on a small phone; its calendar reaches other weeks.
   */
  showWeekNav?: boolean
}

function isFutureDay(date: Date, today: Date): boolean {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  return d > t
}

export function WeekStrip({
  selectedDate,
  onSelect,
  loggedDays,
  frozenDays,
  showWeekNav = true,
}: WeekStripProps) {
  const today = new Date()
  const days = weekDatesContaining(selectedDate)

  const thisWeekStart = startOfWeek(today).getTime()
  const shownWeekStart = startOfWeek(selectedDate).getTime()
  const isCurrentWeek = shownWeekStart === thisWeekStart

  function goToPrevWeek() {
    onSelect(addDays(selectedDate, -7))
  }

  function goToNextWeek() {
    if (isCurrentWeek) return
    onSelect(addDays(selectedDate, 7))
  }

  return (
    <div className="week-strip-row">
      {showWeekNav && (
        <button
          type="button"
          className="week-nav-btn"
          onClick={goToPrevWeek}
          aria-label="Previous week"
        >
          <IconChevronLeft size={16} strokeWidth={2.4} />
        </button>
      )}

      <div className="week-strip">
        {days.map(d => {
          const isSelected = sameDay(d, selectedDate)
          const isToday = sameDay(d, today)
          const isFuture = isFutureDay(d, today)
          const key = localDayKey(d)
          const isLogged = loggedDays?.has(key) ?? false
          // A frozen day was covered, not missed — §10.2.
          const isFrozen = !isLogged && (frozenDays?.has(key) ?? false)
          const stateLabel = isLogged ? ', logged' : isFrozen ? ', freeze used' : ''

          return (
            <button
              key={d.toISOString()}
              type="button"
              className="week-day"
              disabled={isFuture}
              onClick={() => onSelect(d)}
              aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${stateLabel}`}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
            >
              <span className={`week-day-label${isSelected ? ' selected' : ''}`}>
                {narrowWeekday(d)}
              </span>
              <span
                className={[
                  'week-day-circle',
                  isSelected ? 'selected' : '',
                  isToday && !isSelected ? 'today' : '',
                ].filter(Boolean).join(' ')}
              >
                {d.getDate()}
              </span>
              <span className={`week-day-mark${isLogged ? ' is-logged' : isFrozen ? ' is-frozen' : ''}`} aria-hidden />

            </button>
          )
        })}
      </div>

      {showWeekNav && (
        <button
          type="button"
          className="week-nav-btn"
          onClick={goToNextWeek}
          disabled={isCurrentWeek}
          aria-label="Next week"
        >
          <IconChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}
