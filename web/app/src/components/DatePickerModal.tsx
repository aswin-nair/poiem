import { useRef, useState } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { monthGridWeeks, sameDay, startOfDay } from '../lib/dates'
import { IconChevronLeft, IconChevronRight, IconClose } from './icons'
import { feel } from '../lib/feel'

interface DatePickerModalProps {
  selectedDate: Date
  onSelect: (date: Date) => void
  onClose: () => void
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isFutureDay(date: Date, today: Date): boolean {
  return date.getTime() > today.getTime()
}

export function DatePickerModal({ selectedDate, onSelect, onClose }: DatePickerModalProps) {
  /* Every dismissal path — backdrop, the X, Escape — goes through here, so the
     modal cannot close silently down one route and audibly down another.
     Picking a date is a choice, not a dismissal, so it gets its own cue. */
  const dismiss = () => {
    feel('close')
    onClose()
  }
  const choose = (d: Date) => {
    if (!sameDay(d, selectedDate)) feel('select')
    onSelect(d)
    onClose()
  }
  const dialogRef = useRef<HTMLDivElement>(null)
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const today = startOfDay()
  const weeks = monthGridWeeks(viewMonth)
  const isCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth()
  useDialogFocus(dialogRef, dismiss)

  function prevMonth() {
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <div className="date-modal-overlay" onClick={dismiss} role="presentation">
      <div
        ref={dialogRef}
        className="date-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Choose a date"
      >
        <div className="date-modal-header">
          <button type="button" className="date-modal-nav" onClick={prevMonth} aria-label="Previous month">
            <IconChevronLeft size={17} strokeWidth={2.3} />
          </button>
          <span className="date-modal-title">
            {viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            className="date-modal-nav"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            <IconChevronRight size={17} strokeWidth={2.3} />
          </button>
          <button type="button" className="date-modal-close" onClick={dismiss} aria-label="Close">
            <IconClose size={15} strokeWidth={2.3} />
          </button>
        </div>

        <div className="date-modal-weekdays">
          {WEEKDAY_LABELS.map((w, i) => <span key={i}>{w}</span>)}
        </div>

        <div className="date-modal-grid">
          {weeks.map((week, wi) => week.map((d, di) => {
            if (!d) return <span key={`${wi}-${di}`} className="date-modal-cell empty" aria-hidden />
            const future = isFutureDay(d, today)
            const selected = sameDay(d, selectedDate)
            const isToday = sameDay(d, today)
            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                className={`date-modal-cell${selected ? ' selected' : ''}${isToday && !selected ? ' today' : ''}`}
                disabled={future}
                onClick={() => choose(d)}
                aria-label={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                aria-pressed={selected}
                aria-current={isToday ? 'date' : undefined}
              >
                {d.getDate()}
              </button>
            )
          }))}
        </div>

        <button
          type="button"
          className="date-modal-today-btn"
          onClick={() => choose(startOfDay())}
        >
          Jump to today
        </button>
      </div>
    </div>
  )
}
