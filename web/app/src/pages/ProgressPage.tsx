import { AppShell } from '../components/system/AppShell'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { ProgressLineChart, ProgressBarChart } from '../components/Charts'
import { useApp } from '../store/AppContext'
import { effectiveCalories } from '../lib/profile'
import { formatMacroValue, localDayKey } from '../lib/dates'
import { entryDayKey } from '@fud-ai/product/localDate'
import { insightDays, insightDayLabel, insightPeriod, insightSummary } from '../lib/insights'
import { getStreakWithFreezes, getAllBadges, getBreakfastComparison, getMonthConsistency, getTotalLoggedDays } from '../lib/journey'
import { HabitMilestones } from '../components/HabitMilestones'
import { Meter } from '../components/Meter'
import { LEVEL_NAMES, xpForLevel, xpForNextLevel } from '../lib/xp'
import { FoodIcon, IconChevronRight, IconMenuLines, IconFlame, IconTrophy } from '../components/icons'
import { PressableButton } from '../components/PressableButton'
import { WeightLogSheet } from '../components/WeightLogSheet'
import { foodToneFor } from '../lib/foodGlyph'
import { feel } from '../lib/feel'

const RANGES = [
  { id: '1W', label: 'Week', days: 7 },
  { id: '1M', label: 'Month', days: 30 },
] as const

type RangeId = (typeof RANGES)[number]['id']

function filterByRange<T extends { date: string }>(items: T[], days: number): T[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  cutoff.setHours(0, 0, 0, 0)
  return items.filter(i => new Date(i.date) >= cutoff)
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`progress-stat-card${accent ? ' is-accent' : ''}`}>
      <span className="eyebrow">{label}</span>
      <span className="progress-stat-value">{value}</span>
      {sub && <span className="progress-stat-sub">{sub}</span>}
    </div>
  )
}

export function ProgressPage() {
  const { state, addWeightEntry, deleteWeightEntry } = useApp()
  const [range, setRange] = useState<RangeId>('1W')
  const [selectedDayKey, setSelectedDayKey] = useState(() => localDayKey(new Date()))
  const streak = getStreakWithFreezes(
    state.foodEntries,
    state.gamification.freezeUsedDates,
    state.gamification.pauseProtectedDates,
  )
  const badges = getAllBadges(state.foodEntries, streak)
  const consistency = getMonthConsistency(state.foodEntries)
  const breakfastComparison = getBreakfastComparison(state.foodEntries)
  const level = state.gamification.level
  const levelStart = xpForLevel(level)
  const levelEnd = xpForNextLevel(level)
  const atTopLevel = levelEnd <= levelStart
  const xpToNext = Math.max(0, levelEnd - state.gamification.xp)
  const [showLog, setShowLog] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const days = RANGES.find(r => r.id === range)!.days
  const sortedWeights = [...state.weightEntries].sort((a, b) => a.date.localeCompare(b.date))
  const filteredWeights = filterByRange(sortedWeights, days)
  const goal = effectiveCalories(state.profile)
  const goalWeight = state.profile.goalWeightKg

  const currentWeight = filteredWeights.at(-1)?.weightKg ?? state.profile.weightKg ?? 0
  const startWeight = filteredWeights[0]?.weightKg ?? currentWeight
  const avgWeight = filteredWeights.length
    ? filteredWeights.reduce((s, w) => s + w.weightKg, 0) / filteredWeights.length
    : currentWeight
  const netChange = currentWeight - startWeight

  const weeklyDays = useMemo(() => insightDays(state.foodEntries, 7), [state.foodEntries])
  const weeklySummary = insightSummary(weeklyDays)
  const calorieBars = useMemo(() => insightDays(state.foodEntries, days), [state.foodEntries, days])
  const periodSummary = insightSummary(calorieBars)
  const selectedDay = calorieBars.find(day => day.dayKey === selectedDayKey) ?? calorieBars[calorieBars.length - 1]
  const selectedDayIndex = calorieBars.indexOf(selectedDay)

  const mostLogged = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of state.foodEntries) {
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [state.foodEntries])

  const archiveDays = useMemo(() => {
    const days = [...new Set(state.foodEntries.map(entryDayKey))].sort().reverse()
    return days.slice(0, 8)
  }, [state.foodEntries])

  const calorieDays = calorieBars.filter(day => day.logged)
  const avgCalories = periodSummary.averageCalories

  const weightPoints = filteredWeights.map(w => ({
    label: new Date(w.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: w.weightKg,
  }))

  function logWeight(value: number) {
    addWeightEntry(value)
    setShowLog(false)
  }

  function changeRange(next: RangeId) {
    if (range === next) return
    feel('select')
    const nextDays = insightDays(state.foodEntries, RANGES.find(item => item.id === next)!.days)
    if (!nextDays.some(day => day.dayKey === selectedDayKey)) setSelectedDayKey(nextDays[nextDays.length - 1].dayKey)
    setRange(next)
  }

  if (state.profile.trackingPaused) {
    return (
      <AppShell screen="k-insights" nav={<BottomNav />}>
        <main className="app-main k-insights-main">
          <header className="progress-page-header page-heading">
            <div className="k-insights-title">
              <p className="k-eyebrow">The bigger picture</p>
              <h1 className="screen-title" data-momo-play="insights">Insights</h1>
            </div>
          </header>
          <section className="k-card k-notice" aria-labelledby="insights-paused-title">
            <h2 id="insights-paused-title">Tracking is paused</h2>
            <p>Your progress numbers are hidden and your streak is being held.</p>
            <PressableButton to="/settings" label="Manage pause" />
          </section>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell screen="k-insights" nav={<BottomNav />}>
      <main className="app-main k-insights-main" data-mascot-avoid>

        <header className="progress-page-header page-heading">
          <div className="k-insights-title">
            <p className="k-eyebrow">The bigger picture</p>
            <h1 className="screen-title" data-momo-play="insights">Insights</h1>
            <p className="insights-intro">See your routine over time, one logged day at a time.</p>
          </div>
        </header>

        <section className="insights-week-summary" aria-labelledby="week-summary-title">
          <div className="insights-week-heading">
            <h2 id="week-summary-title">Your week</h2>
            <p>Last 7 days · {insightPeriod(weeklyDays)}</p>
          </div>
          <p className="insights-week-fact">
            <strong className="tabular">{weeklySummary.loggedDays} of 7 days logged</strong>
            <span>{weeklySummary.meals} {weeklySummary.meals === 1 ? 'meal' : 'meals'} saved in your journal.</span>
          </p>
          <p className="insights-week-note">{weeklySummary.loggedDays ? 'A logged day has at least one saved meal. Today is still in progress.' : 'Your next saved meal will start this week’s summary.'}</p>
        </section>

        <section className="insights-trends insights-section" aria-labelledby="trends-title">
        <header className="insights-section-heading">
          <h2 id="trends-title">Trends</h2>
          <p>Weight &amp; calories</p>
        </header>
        <section className="insights-range-control" aria-label="Weight and calorie chart range">
          <div className="range-chips" role="group" aria-label="Chart time range">
            {RANGES.map(r => <button key={r.id} type="button" className={`range-chip${range === r.id ? ' active' : ''}`}
              aria-pressed={range === r.id} onClick={() => changeRange(r.id)}>{r.label}</button>)}
          </div>
          <p role="status" aria-live="polite">Last {days} days · Applies to the two charts below.</p>
          <p>{insightPeriod(calorieBars)} · Meals from your journal and saved weigh-ins.</p>
        </section>

        <div className="insights-trend-grid">

        <div className="insights-weight-group">
        {/* Weight card */}
        <div className="progress-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Weight</h2>
            <button type="button" className="progress-log-btn" onClick={() => setShowLog(true)}>
              + Log weight
            </button>
          </div>

          <div className="progress-stat-grid">
            <StatCard label={filteredWeights.length === 1 ? 'First weigh-in in range' : filteredWeights.length ? 'Latest in range' : 'Profile weight'} value={`${currentWeight.toFixed(1)} kg`} sub={filteredWeights.length === 1 ? weightPoints[0]?.label : filteredWeights.length ? undefined : 'No weigh-ins in this range'} accent />
            {goalWeight != null && <StatCard label="Goal" value={`${goalWeight.toFixed(1)} kg`} />}
            {filteredWeights.length > 1 && <>
            <StatCard
              label="Net change"
              value={`${netChange >= 0 ? '+' : ''}${netChange.toFixed(1)} kg`}
              sub="First to latest in range"
            />
            <StatCard label="Average" value={filteredWeights.length ? `${avgWeight.toFixed(1)} kg` : '—'} sub={`${filteredWeights.length} ${filteredWeights.length === 1 ? 'weigh-in' : 'weigh-ins'} in range`} />
            </>}
          </div>

          {weightPoints.length > 1 ? <ProgressLineChart points={weightPoints} goal={goalWeight ?? undefined} unit=" kg" /> : <p className="insights-empty">{weightPoints.length === 1 ? 'A trend appears after two weigh-ins in this range.' : 'No weight entries in this range. Use Log weight if you’d like to track this.'}</p>}
        </div>

        {sortedWeights.length > 0 && (
          <button type="button" className="history-link-card" aria-expanded={showHistory} aria-controls="weight-history" onClick={() => setShowHistory(v => !v)}>
            <span className="history-link-icon"><IconMenuLines size={17} /></span>
            <div className="history-link-text">
              <strong>Weight history</strong>
              <span>{sortedWeights.length} {sortedWeights.length === 1 ? 'entry' : 'entries'} · tap to {showHistory ? 'hide' : 'view or delete'}</span>
            </div>
            <span className="history-link-chevron"><IconChevronRight size={16} /></span>
          </button>
        )}

        {sortedWeights.length > 0 && (
          <div id="weight-history" hidden={!showHistory} className="progress-card">
            {[...sortedWeights].reverse().map(w => (
              <div key={w.id} className="history-row">
                <span className="history-date">{new Date(w.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <strong className="history-weight">{w.weightKg.toFixed(1)} kg</strong>
                <button type="button" className="btn-delete" aria-label={`Delete ${w.weightKg.toFixed(1)} kg entry from ${new Date(w.date).toLocaleDateString()}`} onClick={() => deleteWeightEntry(w.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}

        </div>

        {/* Calories card */}
        <div className="progress-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Calories</h2>
            <div className="progress-avg-pill">
              {avgCalories != null ? `Avg ${avgCalories.toLocaleString()} kcal` : 'No logged days'}
            </div>
          </div>

          <div className="progress-stat-grid">
            <StatCard label="Goal" value={`${goal.toLocaleString()} kcal`} />
            <StatCard
              label="Days tracked"
              value={String(calorieDays.length)}
              sub={`of ${days} days`}
            />
          </div>

          {!calorieDays.length && <p className="insights-empty">No meals logged in this range. Choose any day below to open its journal.</p>}
          <p className="insights-chart-note">Average uses {calorieDays.length} logged {calorieDays.length === 1 ? 'day' : 'days'} only. An unlogged day has no known intake.</p>
          <ProgressBarChart bars={calorieBars} goal={goal} selectedDayKey={selectedDay.dayKey} onSelectDay={setSelectedDayKey} />
          <p className="insights-chart-note">Dashed bars are unlogged days. Choose a bar or a date below. Use the arrow keys on a bar; scroll the chart for more days.</p>
          <section className="insights-day-inspector" aria-labelledby="inspected-day-title">
            <div className="insights-day-controls">
              <label htmlFor="insights-day">Inspect a day</label>
              <div className="insights-day-picker">
                <button type="button" aria-label="Inspect previous day" disabled={selectedDayIndex === 0} onClick={() => setSelectedDayKey(calorieBars[selectedDayIndex - 1].dayKey)}><span aria-hidden="true">←</span></button>
                <select id="insights-day" value={selectedDay.dayKey} onChange={event => setSelectedDayKey(event.target.value)}>
                  {calorieBars.map(day => <option key={day.dayKey} value={day.dayKey}>{day.label} · {day.logged ? `${day.mealCount} ${day.mealCount === 1 ? 'meal' : 'meals'}` : 'Not logged'}</option>)}
                </select>
                <button type="button" aria-label="Inspect next day" disabled={selectedDayIndex === calorieBars.length - 1} onClick={() => setSelectedDayKey(calorieBars[selectedDayIndex + 1].dayKey)}><span aria-hidden="true">→</span></button>
              </div>
            </div>
            <div className="insights-day-reading" aria-live="polite" aria-atomic="true">
              <h3 id="inspected-day-title">{insightDayLabel(selectedDay.dayKey)}</h3>
              {selectedDay.logged ? <>
                <p><strong className="tabular">{selectedDay.value.toLocaleString()} kcal logged</strong> · {selectedDay.mealCount} {selectedDay.mealCount === 1 ? 'meal' : 'meals'}</p>
                <dl className="insights-day-macros">
                  <div><dt>Protein</dt><dd>{formatMacroValue(selectedDay.protein)} g</dd></div>
                  <div><dt>Carbs</dt><dd>{formatMacroValue(selectedDay.carbs)} g</dd></div>
                  <div><dt>Fat</dt><dd>{formatMacroValue(selectedDay.fat)} g</dd></div>
                </dl>
              </> : <p>No meals logged. This day’s intake is unknown.</p>}
            </div>
            <Link className="insights-open-day" to="/" state={{ journalDay: selectedDay.dayKey }} aria-label={`Open this day: ${insightDayLabel(selectedDay.dayKey)}`}>Open this day <IconChevronRight size={18} /></Link>
          </section>
        </div>

        </div>
        </section>

        <section className="insights-section insights-journey-group" aria-labelledby="journey-title">
          <header className="insights-section-heading">
            <h2 id="journey-title">Journey</h2>
            <p>Logging activity, milestones and journal history</p>
          </header>
          <div className="insights-journey-grid">
        {/* Streak, level and XP live here; Today shows only the day itself. */}
        <section className="k-card k-journey" aria-labelledby="journey-level-title">
          <div className="k-section-head">
            <h3 id="journey-level-title">Level &amp; streak</h3>
            <span className="tabular">Level {level}</span>
          </div>
          <dl className="k-journey-stats">
            <div><dt>Day streak</dt><dd className="tabular">{streak}</dd></div>
            <div><dt>Total XP</dt><dd className="tabular">{state.gamification.xp.toLocaleString()}</dd></div>
            <div><dt>Freezes</dt><dd className="tabular">{state.gamification.streakFreezes}</dd></div>
          </dl>
          <Meter
            label="Progress to the next level"
            tone="acid"
            value={atTopLevel ? 1 : state.gamification.xp - levelStart}
            max={atTopLevel ? 1 : levelEnd - levelStart}
          />
          <p className="k-journey-note">
            {LEVEL_NAMES[level] || 'Your journey'}{atTopLevel ? ' · Top level reached' : ` · ${xpToNext.toLocaleString()} XP to level ${level + 1}`}
          </p>
          <details className="k-journey-help">
            <summary>About XP and freezes</summary>
            <p>XP records your logging activity and moves Momo through levels. A freeze protects your streak on a missed day; it doesn’t count as a logged day.</p>
          </details>
        </section>

        <HabitMilestones loggedDays={getTotalLoggedDays(state.foodEntries)} />

        {/* Consistency describes this calendar month, independently of the chart range. */}
        <div className="progress-card consistency-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Consistency</h2>
            <span className="consistency-streak">{streak}-day streak</span>
          </div>

          <div className="consistency-layout">
          <div className="insights-heat" aria-hidden>
            {consistency.days.map((logged, i) => (
              <span
                key={i}
                className={
                  'insights-heat-cell'
                  + (logged ? ' is-logged' : '')
                  + (i >= consistency.elapsed ? ' is-future' : '')
                }
              />
            ))}
          </div>
          <div className="consistency-summary">
          <div className="consistency-headline">
            <strong className="consistency-number">{consistency.logged}</strong>
            <span className="consistency-unit">
              {consistency.logged === 1 ? 'day logged' : 'days logged'}
            </span>
          </div>
          <p className="consistency-sub">
            of {consistency.elapsed} {consistency.elapsed === 1 ? 'day' : 'days'} so far this month
          </p>
          <p className="page-sub">Days you logged, not how the numbers landed.</p>
          </div>
          </div>
          <ol className="sr-only">
            {consistency.days.map((logged, i) => (
              <li key={i}>
                Day {i + 1}: {i >= consistency.elapsed ? 'upcoming' : logged ? 'logged' : 'not logged'}
              </li>
            ))}
          </ol>
          <div className="insights-legend" aria-hidden="true"><span><i className="is-logged" />Logged</span><span><i />Not logged</span><span><i className="is-future" />Upcoming</span></div>
          <div className="own-past-callout">
            <strong>You logged breakfast {breakfastComparison.recent} of the last 7 days.</strong>
            <span>Your best seven-day stretch is {breakfastComparison.best}.</span>
          </div>
        </div>

        <div className="progress-card">
          <h2 className="progress-card-title">Most logged</h2>
          <p className="page-sub">Foods you reach for often · All time</p>
          {mostLogged.length === 0 ? (
            <p className="page-sub">Nothing logged yet.</p>
          ) : (
            <ul className="k-most-logged">
              {mostLogged.map(([name, count]) => (
                <li key={name}>
                  <span className={`k-food-tile is-tone-${foodToneFor(name)}`}><FoodIcon name={name} size={20} /></span>
                  <span className="k-most-name">{name}</span>
                  <span className="k-most-count tabular" aria-label={`${count} ${count === 1 ? 'time' : 'times'}`}>×{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="insights-more">
          <summary>
            <h2>Ticket archive</h2>
            <span className="page-sub">Eight recent logged days</span>
          </summary>
          <div className="insights-more-body">
            {archiveDays.length === 0 && <p className="insights-empty">Your logged days will appear here.</p>}
            <div className="torn-archive">
              {archiveDays.map(day => (
                <Link key={day} className="torn-stub" to="/" state={{ journalDay: day }} aria-label={`Open journal for ${new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
                  {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </Link>
              ))}
            </div>
          </div>
        </details>

        <details className="insights-more">
          <summary>
            <h2>Achievements</h2>
            <span className="badge-count-pill">
              {badges.filter(b => b.unlocked).length}/{badges.length}
            </span>
          </summary>
          <div className="insights-more-body">
          {badges.every(b => !b.unlocked) && <p className="insights-empty">Your first badge starts with your first log.</p>}
          {streak > 0 && (
            <div className="streak-banner">
              <span className="streak-banner-fire"><IconFlame size={30} /></span>
              <div>
                <span className="streak-banner-num">{streak}-day streak</span>
                <span className="streak-banner-sub"> — keep it going!</span>
              </div>
            </div>
          )}
          <div className="badge-grid">
            {(() => {
              const unlocked = badges.filter(b => b.unlocked)
              const next = badges.find(b => !b.unlocked)
              return (next ? [...unlocked, next] : unlocked).map(b => (
                <div key={b.id} className={`badge-card${b.unlocked ? ' unlocked' : ' locked'}`}>
                  <span className="badge-emoji"><IconTrophy size={26} /></span>
                  <span className="badge-name">{b.name}</span>
                  <span className="badge-desc">{b.desc}</span>
                </div>
              ))
            })()}
          </div>
          </div>
        </details>

          </div>
        </section>

      </main>

      {showLog && <WeightLogSheet initialWeight={sortedWeights.at(-1)?.weightKg ?? state.profile.weightKg} onSave={logWeight} onClose={() => setShowLog(false)} />}

    </AppShell>
  )
}
