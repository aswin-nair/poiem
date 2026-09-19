import { AppShell } from '../components/system/AppShell'
import { useMemo, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { ProgressLineChart, ProgressBarChart } from '../components/Charts'
import { useApp } from '../store/AppContext'
import { effectiveCalories } from '../lib/profile'
import { localDayKey } from '../lib/dates'
import { getStreakWithFreezes, getAllBadges, getBreakfastComparison, getMonthConsistency, getTotalLoggedDays } from '../lib/journey'
import { HabitMilestones } from '../components/HabitMilestones'
import { Meter } from '../components/Meter'
import { LEVEL_NAMES, xpForLevel, xpForNextLevel } from '../lib/xp'
import { FoodIcon, IconChevronRight, IconMenuLines, IconFlame, IconTrophy } from '../components/icons'
import { PressableButton } from '../components/PressableButton'
import { WeightLogSheet } from '../components/WeightLogSheet'
import { foodToneFor } from '../lib/foodGlyph'

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

  const calorieBars = useMemo(() => {
    const result: { label: string; value: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = localDayKey(d)
      const cals = state.foodEntries
        .filter(e => localDayKey(e.timestamp) === key)
        .reduce((s, e) => s + e.calories, 0)
      if (cals > 0 || range === '1W') {
        result.push({
          label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          value: cals,
        })
      }
    }
    return result
  }, [state.foodEntries, days, range])

  const mostLogged = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of state.foodEntries) {
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [state.foodEntries])

  const archiveDays = useMemo(() => {
    const days = [...new Set(state.foodEntries.map(e => localDayKey(e.timestamp)))].sort().reverse()
    return days.slice(0, 8)
  }, [state.foodEntries])

  const calorieDays = calorieBars.filter(b => b.value > 0)
  const avgCalories = calorieDays.length
    ? Math.round(calorieDays.reduce((s, b) => s + b.value, 0) / calorieDays.length)
    : 0

  const weightPoints = filteredWeights.map(w => ({
    label: new Date(w.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: w.weightKg,
  }))

  function logWeight(value: number) {
    addWeightEntry(value)
    setShowLog(false)
  }

  if (state.profile.trackingPaused) {
    return (
      <AppShell screen="k-insights" nav={<BottomNav />}>
        <main className="app-main k-insights-main">
          <header className="progress-page-header page-heading">
            <div className="k-insights-title">
              <p className="k-eyebrow">The bigger picture</p>
              <h1 className="screen-title">Insights</h1>
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
            <h1 className="screen-title">Insights</h1>
            <p className="insights-intro">See your routine over time, one logged day at a time.</p>
          </div>
        </header>

        {/* Streak, level and XP live here; Today shows only the day itself. */}
        <section className="k-card k-journey" aria-labelledby="journey-title">
          <div className="k-section-head">
            <h2 id="journey-title">Journey</h2>
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
        </section>

        <HabitMilestones loggedDays={getTotalLoggedDays(state.foodEntries)} />

        {/* §9.3: consistency leads. Calories and weight are downstream of the
            habit, so the habit is what the page opens with. */}
        <div className="progress-card consistency-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Consistency</h2>
            <span className="consistency-streak">{streak}-day streak</span>
          </div>

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

        <section className="insights-range-control" aria-label="Weight and calorie chart range">
          <h2>Weight &amp; calories</h2>
          <div className="range-chips" role="group" aria-label="Chart time range">
            {RANGES.map(r => <button key={r.id} type="button" className={`range-chip${range === r.id ? ' active' : ''}`}
              aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
          </div>
          <p role="status" aria-live="polite">Last {days} days · Applies to the two charts below.</p>
        </section>

        {/* Weight card */}
        <div className="progress-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Weight</h2>
            <button type="button" className="progress-log-btn" onClick={() => setShowLog(true)}>
              + Log weight
            </button>
          </div>

          <div className="progress-stat-grid">
            <StatCard label={filteredWeights.length ? 'Latest in range' : 'Profile weight'} value={`${currentWeight.toFixed(1)} kg`} sub={filteredWeights.length ? undefined : 'No weigh-ins in this range'} accent />
            <StatCard
              label="Goal"
              value={goalWeight != null ? `${goalWeight.toFixed(1)} kg` : '—'}
            />
            <StatCard
              label="Net change"
              value={filteredWeights.length > 1 ? `${netChange >= 0 ? '+' : ''}${netChange.toFixed(1)} kg` : '—'}
              sub={filteredWeights.length > 1 ? 'First to latest in range' : 'Needs two weigh-ins'}
            />
            <StatCard label="Average" value={filteredWeights.length ? `${avgWeight.toFixed(1)} kg` : '—'} sub={`${filteredWeights.length} ${filteredWeights.length === 1 ? 'weigh-in' : 'weigh-ins'} in range`} />
          </div>

          {weightPoints.length ? <ProgressLineChart points={weightPoints} goal={goalWeight ?? undefined} unit=" kg" /> : <p className="insights-empty">No weight entries in this range. Use Log weight if you’d like to track this.</p>}
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

        {/* Calories card */}
        <div className="progress-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Calories</h2>
            <div className="progress-avg-pill">
              {calorieDays.length ? `Avg ${avgCalories.toLocaleString()} kcal` : 'No logged days'}
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

          {calorieDays.length ? <><ProgressBarChart bars={calorieBars} goal={goal} /><p className="insights-chart-note">Average uses logged days only. An empty day doesn’t mean you ate nothing.</p></> : <p className="insights-empty">No meals logged in this range. Your calorie chart will appear as you log.</p>}
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

        <div className="progress-card">
          <h2 className="progress-card-title">Ticket archive</h2>
          <p className="page-sub">Your eight most recent logged days · All time</p>
          {archiveDays.length === 0 && <p className="insights-empty">Your logged days will appear here.</p>}
          <div className="torn-archive">
            {archiveDays.map(day => (
              <div key={day} className="torn-stub">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="progress-card">
          <div className="progress-card-header">
            <h2 className="progress-card-title">Achievements</h2>
            <span className="badge-count-pill">
              {badges.filter(b => b.unlocked).length}/{badges.length}
            </span>
          </div>
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

      </main>

      {showLog && <WeightLogSheet initialWeight={sortedWeights.at(-1)?.weightKg ?? state.profile.weightKg} onSave={logWeight} onClose={() => setShowLog(false)} />}

    </AppShell>
  )
}
