/** A factual progress bar. Past the goal it changes colour; it never turns red or says "too much". */
export function Meter({
  label,
  value,
  max,
  tone = 'ink',
  over = false,
  valueText,
  className = '',
}: {
  label: string
  value: number
  max: number
  tone?: 'ink' | 'acid'
  over?: boolean
  valueText?: string
  className?: string
}) {
  const progress = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <span
      className={`k-meter k-meter-${tone}${over ? ' is-over' : ''} ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(Math.min(Math.max(0, value), max))}
      aria-valuetext={valueText}
    >
      <span className="k-meter-fill" style={{ width: `${progress * 100}%` }} />
    </span>
  )
}
