function ChartDataTable({
  caption,
  rows,
  unit = '',
}: {
  caption: string
  rows: { label: string; value: number }[]
  unit?: string
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">{unit ? `Value (${unit})` : 'Value'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface LineChartProps {
  points: { label: string; value: number }[]
  unit?: string
  goal?: number
  color?: string
}

export function LineChart({ points, unit = '', goal, color = 'var(--coral)' }: LineChartProps) {
  if (points.length === 0) {
    return <p className="chart-empty">No data yet</p>
  }

  const values = points.map(p => p.value)
  const min = Math.min(...values, goal ?? values[0]) * 0.98
  const max = Math.max(...values, goal ?? values[0]) * 1.02
  const range = max - min || 1
  const w = 320
  const h = 120
  const pad = 8

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2)
    return { x, y, ...p }
  })

  const polyline = coords.map(c => `${c.x},${c.y}`).join(' ')
  const goalY = goal != null ? h - pad - ((goal - min) / range) * (h - pad * 2) : null

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="line-chart" aria-hidden>
        {goalY != null && (
          <line x1={pad} y1={goalY} x2={w - pad} y2={goalY} stroke="var(--k-ink)" strokeDasharray="4 4" strokeWidth="1" />
        )}
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
        {coords.map(c => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3.5" fill={color} />
        ))}
      </svg>
      <div className="chart-labels">
        {points.map(p => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
      <div className="chart-latest">
        Latest: <strong>{points[points.length - 1].value.toFixed(1)}{unit}</strong>
      </div>
      <ChartDataTable caption="Chart values" rows={points} unit={unit} />
    </div>
  )
}

interface BarChartProps {
  bars: { label: string; value: number }[]
  goal?: number
}

export function BarChart({ bars, goal }: BarChartProps) {
  if (bars.length === 0) return <p className="chart-empty">No data yet</p>
  const max = Math.max(...bars.map(b => b.value), goal ?? 0, 1)

  return (
    <div className="bar-chart">
      {bars.map(b => {
        const pct = (b.value / max) * 100
        return (
          <div key={b.label} className="bar-col">
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="bar-val">{b.value || '—'}</span>
            <span className="bar-label">{b.label}</span>
          </div>
        )
      })}
      <ChartDataTable caption="Chart values" rows={bars} />
    </div>
  )
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`
  const d: string[] = [`M ${coords[0].x} ${coords[0].y}`]
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cpx = (prev.x + curr.x) / 2
    d.push(`C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`)
  }
  return d.join(' ')
}

export function ProgressLineChart({
  points,
  goal,
  unit = '',
}: {
  points: { label: string; value: number }[]
  goal?: number
  unit?: string
}) {
  if (points.length === 0) {
    return <p className="chart-empty">No weight logged in this range</p>
  }

  const values = points.map(p => p.value)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const min = Math.min(dataMin, goal ?? dataMin) - 2
  const max = Math.max(dataMax, goal ?? dataMax) + 2
  const range = max - min || 1

  const w = 340
  const h = 160
  const padL = 38
  const padR = 12
  const padT = 12
  const padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const yTicks = [max, (max + min) / 2, min].map(v => Math.round(v * 10) / 10)

  const coords = points.map((p, i) => {
    // A single weigh-in sits mid-chart instead of on top of the axis labels.
    const x = points.length === 1 ? padL + chartW / 2 : padL + (i / (points.length - 1)) * chartW
    const y = padT + chartH - ((p.value - min) / range) * chartH
    return { x, y, ...p }
  })

  const linePath = smoothPath(coords)
  const baseY = padT + chartH
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baseY} L ${padL} ${baseY} Z`

  const goalY = goal != null ? padT + chartH - ((goal - min) / range) * chartH : null

  const showXLabels = points.length <= 10
    ? points.map((_, i) => i)
    : [0, Math.floor(points.length / 2), points.length - 1]

  return (
    <div className="progress-chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="progress-line-chart" aria-hidden>
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--k-action)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--k-action)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map(tick => {
          const y = padT + chartH - ((tick - min) / range) * chartH
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--k-hair)" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fill="var(--k-muted)" fontSize="10">{tick}</text>
            </g>
          )
        })}

        {goalY != null && (
          <g>
            <line
              x1={padL} y1={goalY} x2={w - padR} y2={goalY}
              stroke="var(--k-ink)" strokeDasharray="5 4" strokeWidth="1.5" opacity="0.75"
            />
            <text x={w - padR} y={goalY - 4} textAnchor="end" fill="var(--k-muted)" fontSize="9" opacity="0.85">goal</text>
          </g>
        )}

        {coords.length > 1 && <path d={areaPath} fill="url(#area-grad)" />}
        <path d={linePath} fill="none" stroke="var(--k-action)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((c, i) => (
          <circle key={c.label} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 5 : 3.5}
            fill={i === coords.length - 1 ? 'var(--k-action)' : 'var(--k-action-deep)'}
            stroke="var(--k-ink)" strokeWidth={i === coords.length - 1 ? '2' : '0'}
          />
        ))}

        {coords.map((c, i) => showXLabels.includes(i) && (
          <text key={`${c.label}-x`} x={c.x} y={h - 6} textAnchor="middle" fill="var(--k-muted)" fontSize="9">{c.label}</text>
        ))}
      </svg>
      {points.length > 0 && (
        <p className="chart-footnote">
          Latest: <strong>{points[points.length - 1].value.toFixed(1)}{unit}</strong>
        </p>
      )}
      <ChartDataTable caption="Weight over time" rows={points} unit={unit} />
    </div>
  )
}

export function ProgressBarChart({
  bars,
  goal,
}: {
  bars: { label: string; value: number }[]
  goal?: number
}) {
  if (bars.length === 0) return <p className="chart-empty">No calorie data in this range</p>

  const maxVal = Math.max(...bars.map(b => b.value), goal ?? 0, 4000)
  const yMax = Math.ceil(maxVal / 500) * 500
  const h = 180
  const w = 340
  const padL = 38
  const padR = 8
  const padT = 20
  const padB = 28
  const chartH = h - padT - padB
  const chartW = w - padL - padR
  const barW = Math.max(6, Math.min(22, chartW / bars.length - 4))
  const showLabels = bars.length <= 7

  const yTicks = [0, Math.round(yMax / 2 / 100) * 100, yMax]
  const goalY = goal != null ? padT + chartH - (goal / yMax) * chartH : null

  return (
    <div className="progress-chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="progress-bar-chart" aria-hidden>
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--k-action)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--k-action-deep)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {yTicks.map(tick => {
          const y = padT + chartH - (tick / yMax) * chartH
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--k-hair)" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fill="var(--k-muted)" fontSize="9">
                {tick >= 1000 ? `${tick / 1000}k` : tick}
              </text>
            </g>
          )
        })}

        {bars.map((b, i) => {
          const barH = b.value > 0 ? Math.max((b.value / yMax) * chartH, 3) : 0
          const trackH = chartH
          const x = padL + (i + 0.5) * (chartW / bars.length) - barW / 2
          const y = padT + chartH - barH
          return (
            <g key={b.label}>
              <rect
                x={x} y={padT} width={barW} height={trackH}
                rx="4" fill="var(--k-sunken)"
              />
              {b.value > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH}
                  rx="4" fill="url(#bar-grad)"
                />
              )}
              {showLabels && b.value > 0 && (
                <text
                  x={x + barW / 2} y={y - 4}
                  textAnchor="middle" fill="var(--k-muted)" fontSize="8" fontWeight="600"
                >
                  {b.value >= 1000 ? `${(b.value / 1000).toFixed(1)}k` : b.value}
                </text>
              )}
              <text x={x + barW / 2} y={h - 6} textAnchor="middle" fill="var(--k-muted)" fontSize="9">{b.label}</text>
            </g>
          )
        })}

        {/* Drawn over the bars so the tracks never hide the goal or its label. */}
        {goalY != null && (
          <g>
            <line
              x1={padL} y1={goalY} x2={w - padR} y2={goalY}
              stroke="var(--k-ink)" strokeDasharray="5 4" strokeWidth="1.5"
            />
            <text x={w - padR} y={goalY - 4} textAnchor="end" fill="var(--k-ink)" fontSize="9" fontWeight="600"
              stroke="var(--k-card)" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke">goal</text>
          </g>
        )}
      </svg>
      <ChartDataTable caption="Calories by day" rows={bars} />
    </div>
  )
}
