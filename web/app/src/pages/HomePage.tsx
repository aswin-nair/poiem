import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LevelUpOverlay } from '../components/LevelUpOverlay'
import { DatePickerModal } from '../components/DatePickerModal'
import { BottomNav } from '../components/BottomNav'
import { MomoSticker } from '../components/MomoSticker'
import { WeekStrip } from '../components/WeekStrip'
import { Meter } from '../components/Meter'
import { FoodIcon, IconCalendar, IconFlame, IconPlus, IconWater } from '../components/icons'
import { SwipeRow } from '../components/SwipeRow'
import { PullToRefresh } from '../components/PullToRefresh'
import { useToast } from '../components/Toast'
import { LogCelebration } from '../components/LogCelebration'
import { useApp } from '../store/AppContext'
import { entriesForDay, macroTotals } from '../lib/storage'
import { effectiveCalories, effectiveCarbs, effectiveFat, effectiveProtein } from '../lib/profile'
import { formatDayLabel, localDayKey, sameDay, startOfDay } from '../lib/dates'
import { getAllBadges, getStreakWithFreezes } from '../lib/journey'
import { applyNote, applyWaterChange } from '../lib/enamelEconomy'
import { useFeel } from '../hooks/useHaptic'
import { playLogConfirm, setFeelEnabled } from '../lib/feel'
import { evaluateNotifications } from '../lib/notifications'
import { calorieBudget, entryTime, groupEntriesByMeal, macroBudget } from '../lib/today'
import { shouldCelebrateLog } from '../lib/logFeedback'
import type { FoodEntry, MealType, XpEvent } from '../types'
import { useAnchor } from '../mascot/anchors'
import { mascotEvent } from '../mascot/MascotOverlay'

interface JustLogged { id?: string; calories: number; name: string }

interface CelebrationState {
  entryId?: string
  foodName: string
  awards: XpEvent[]
  mascotEvent: 'log_success' | 'milestone'
}

const WATER_GLASSES = 8
const NOTE_LIMIT = 3

/**
 * Today, quiet by default: the number that matters, macros, and meals grouped
 * the way the day actually went. Streaks, levels and XP live on Insights.
 */
export function HomePage({ guest = false }: { guest?: boolean }) {
  const { state, ackLevelUp, patchGamification, deleteEntry, restoreEntry, refresh } = useApp()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const feel = useFeel()
  const budgetAnchor = useAnchor('calorie_ring')
  const [selectedDate, setSelectedDate] = useState(() => startOfDay())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)
  const loggedNavKey = useRef('')
  const prevSeenBadgeCount = useRef(state.gamification.seenBadgeIds.length)

  const profile = state.profile
  const paused = Boolean(profile.trackingPaused)
  const dayEntries = entriesForDay(state.foodEntries, selectedDate)
  const totals = macroTotals(dayEntries)
  const groups = groupEntriesByMeal(dayEntries)
  const budget = calorieBudget(totals.calories, effectiveCalories(profile))
  const selectedDayKey = localDayKey(selectedDate)
  const dayLabel = formatDayLabel(selectedDate)
  const isToday = sameDay(selectedDate, new Date())
  const snapshotLabel = isToday ? 'Today’s snapshot' : dayLabel === 'Yesterday' ? 'Yesterday’s snapshot' : `${dayLabel} snapshot`
  const streak = getStreakWithFreezes(
    state.foodEntries,
    state.gamification.freezeUsedDates,
    state.gamification.pauseProtectedDates,
  )
  const hasLoggedToday = state.foodEntries.some(entry => sameDay(new Date(entry.timestamp), new Date()))
  const water = state.gamification.waterByDate[selectedDayKey] ?? 0
  const notes = state.gamification.notesByDate[selectedDayKey] ?? 0
  const loggedDays = useMemo(() => new Set(state.foodEntries.map(entry => localDayKey(entry.timestamp))), [state.foodEntries])
  const frozenDays = useMemo(() => new Set(state.gamification.freezeUsedDates), [state.gamification.freezeUsedDates])
  const showMomo = state.gamification.mascotActivity !== 'off' && !profile.mascotMuted
  const macros = [
    { key: 'protein', label: 'Protein', ...macroBudget(totals.protein, effectiveProtein(profile)) },
    { key: 'carbs', label: 'Carbs', ...macroBudget(totals.carbs, effectiveCarbs(profile)) },
    { key: 'fat', label: 'Fat', ...macroBudget(totals.fat, effectiveFat(profile)) },
  ]

  useEffect(() => {
    setFeelEnabled({
      sound: profile.soundEnabled !== false,
      haptics: profile.hapticsEnabled !== false,
    })
  }, [profile.soundEnabled, profile.hapticsEnabled])

  useEffect(() => {
    if (paused) return
    const hours = state.foodEntries.map(entry => new Date(entry.timestamp).getHours())
    void evaluateNotifications({
      loggedToday: hasLoggedToday,
      streak,
      freezeAvailable: state.gamification.streakFreezes,
      firstLogHours: hours,
      localHour: new Date().getHours(),
      trackingPaused: paused,
    })
  }, [paused, hasLoggedToday, streak, state.gamification.streakFreezes, state.foodEntries])

  useEffect(() => {
    const justLogged = (location.state as { justLogged?: JustLogged } | null)?.justLogged
    if (!justLogged) return
    if (loggedNavKey.current === location.key) return
    loggedNavKey.current = location.key
    navigate('.', { replace: true, state: null })
    const mealEvent = justLogged.id
      ? state.gamification.xpEvents.find(event => event.key === `meal-${justLogged.id}` || event.key === `enamel-manual-${justLogged.id}` || event.key === `enamel-photo-${justLogged.id}`)
      : undefined
    const fresh = mealEvent
      ? state.gamification.xpEvents.filter(event => (
          Math.abs(new Date(event.timestamp).getTime() - new Date(mealEvent.timestamp).getTime()) < 2_000
        ))
      : state.gamification.xpEvents.slice(0, 4)
    const streakMilestone = fresh.some(event => event.key.startsWith('streak-'))
    playLogConfirm({ streakMilestone })
    if (!paused && shouldCelebrateLog({ entries: state.foodEntries, entryId: justLogged.id, awards: fresh })) {
      setCelebration({
        entryId: justLogged.id,
        foodName: justLogged.name,
        awards: fresh,
        mascotEvent: streakMilestone ? 'milestone' : 'log_success',
      })
      return
    }
    const entryId = justLogged.id
    toast(`Logged ${justLogged.name}`, entryId ? { action: { label: 'Undo', fn: () => deleteEntry(entryId) } } : undefined)
    window.setTimeout(() => mascotEvent('log_success'), 120)
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = prevSeenBadgeCount.current
    const current = state.gamification.seenBadgeIds.length
    if (current > prev) {
      const allBadges = getAllBadges(state.foodEntries, streak)
      const newIds = state.gamification.seenBadgeIds.slice(prev)
      const newBadge = allBadges.find(badge => newIds.includes(badge.id))
      if (newBadge) {
        feel('badge')
        toast(`Badge unlocked: ${newBadge.name}!`)
        mascotEvent('milestone')
      }
    }
    prevSeenBadgeCount.current = current
  }, [state.gamification.seenBadgeIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingLevelUp = state.gamification.pendingLevelUp

  function openLog(mealType?: MealType) {
    feel('press')
    navigate('/log', { state: { background: location, mealType } })
  }

  function removeMeal(entry: FoodEntry) {
    deleteEntry(entry.id)
    toast(`Removed ${entry.name}`, {
      type: 'info',
      action: { label: 'Undo', fn: () => restoreEntry(entry) },
    })
  }

  function changeWater(next: number) {
    feel('water')
    patchGamification(g => applyWaterChange(g, selectedDayKey, Math.max(0, Math.min(WATER_GLASSES, next))))
  }

  return (
    <div className="app-shell k-screen k-today">
      {!paused && pendingLevelUp && <LevelUpOverlay level={pendingLevelUp} onDone={ackLevelUp} />}
      {!paused && celebration && !pendingLevelUp && (
        <LogCelebration
          foodName={celebration.foodName}
          streak={streak}
          awards={celebration.awards}
          cosmeticId={state.gamification.equippedCosmeticId}
          onDone={() => {
            const { entryId, foodName, mascotEvent: event } = celebration
            if (entryId) toast(`Logged ${foodName}`, { action: { label: 'Undo', fn: () => deleteEntry(entryId) } })
            setCelebration(null)
            window.setTimeout(() => mascotEvent(event), 120)
          }}
        />
      )}

      <header className="k-today-header" data-mascot-avoid>
        <div className="k-today-title">
          <p className="k-eyebrow">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{dayLabel}</h1>
        </div>
        <button
          type="button"
          className="k-icon-button"
          onClick={() => { feel('open'); setShowDatePicker(true) }}
          aria-label="Choose date"
        >
          <IconCalendar size={22} />
        </button>
      </header>
      {!paused && (
        <div className="k-week" data-mascot-avoid>
          <WeekStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            loggedDays={loggedDays}
            frozenDays={frozenDays}
            showWeekNav={false}
          />
        </div>
      )}

      {showDatePicker && (
        <DatePickerModal
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      <PullToRefresh onRefresh={refresh}>
        {/* The walking Momo never stands on the day's numbers or meals: he waits beside the column on wide screens and stays off Today on a phone. */}
        <main className="app-main k-today-main" data-mascot-avoid>
          {paused ? (
            <section className="k-card k-notice" aria-labelledby="paused-title">
              <h2 id="paused-title">Tracking is paused</h2>
              <p>Calorie and macro numbers are hidden. Your streak is held where it is.</p>
              <Link className="k-text-button" to="/settings">Manage pause</Link>
            </section>
          ) : (
            <>
              {guest && (
                <section className="k-card k-notice" aria-labelledby="guest-title">
                  <p className="k-eyebrow">Your first log is here</p>
                  <h2 id="guest-title">Save your progress</h2>
                  <p>Continue to create an account and keep this device copy available across sign-in.</p>
                  <div className="k-notice-actions">
                    <button type="button" className="k-button is-primary" onClick={() => navigate('/login?mode=signup&claim=1')}>
                      Continue
                    </button>
                    <button type="button" className="k-text-button" onClick={() => navigate('/login?mode=signin&claim=1')}>
                      I already have an account
                    </button>
                  </div>
                </section>
              )}

              <section ref={budgetAnchor} className="k-budget" aria-labelledby="budget-title" data-mascot-avoid>
                <h2 id="budget-title" className="k-eyebrow">{snapshotLabel}</h2>
                <p className="k-budget-number">
                  <strong className="tabular">{(budget.over > 0 ? budget.over : budget.remaining).toLocaleString()}</strong>
                  <span>{budget.over > 0 ? 'kcal over the guide' : 'kcal left'}</span>
                </p>
                <Meter
                  label="Calories"
                  tone="acid"
                  value={budget.consumed}
                  max={budget.target}
                  over={budget.over > 0}
                  valueText={`${budget.consumed.toLocaleString()} of ${budget.target.toLocaleString()} kcal`}
                />
                <p className="k-budget-meta">
                  <span className="tabular">{budget.consumed.toLocaleString()} eaten</span>
                  <span className="tabular">{budget.target.toLocaleString()} guide</span>
                </p>
              </section>

              <section className="k-macros" aria-label="Macros">
                {macros.map(macro => (
                  <div key={macro.key} className="k-macro">
                    <span className="k-macro-label">{macro.label}</span>
                    <span className="k-macro-value tabular"><strong>{macro.current}</strong> / {macro.goal} g</span>
                    <Meter label={macro.label} value={macro.current} max={macro.goal} over={macro.over} />
                  </div>
                ))}
              </section>

              <section className="k-meals" aria-labelledby="meals-title">
                <div className="k-section-head">
                  <h2 id="meals-title">Meals</h2>
                  <span className="tabular">
                    {dayEntries.length === 0
                      ? 'Nothing yet'
                      : `${dayEntries.length} ${dayEntries.length === 1 ? 'meal' : 'meals'} · ${budget.consumed.toLocaleString()} kcal`}
                  </span>
                </div>
                {dayEntries.length === 0 && (
                  <p className="k-empty">
                    {isToday
                      ? 'Your table is ready. Start with whatever you ate — you can change the details later.'
                      : `Nothing was logged ${dayLabel === 'Yesterday' ? 'yesterday' : `on ${dayLabel}`}.`}
                  </p>
                )}
                {groups.map(group => (isToday || group.entries.length > 0) && (
                  <section key={group.type} className="k-meal-group" aria-labelledby={`meal-${group.type}`}>
                    <header className="k-meal-head">
                      <h3 id={`meal-${group.type}`}>{group.label}</h3>
                      {group.entries.length > 0 && <span className="tabular">{group.calories.toLocaleString()} kcal</span>}
                    </header>
                    {group.entries.map(entry => (
                      <SwipeRow
                        key={entry.id}
                        label={entry.name}
                        actions={[
                          { label: 'Edit', onAct: () => navigate(`/edit/${entry.id}`) },
                          { label: 'Delete', tone: 'danger', onAct: () => removeMeal(entry) },
                        ]}
                      >
                        <button
                          type="button"
                          className="k-meal-row"
                          onClick={() => { feel('tap'); navigate(`/edit/${entry.id}`) }}
                        >
                          <span className="k-food-tile"><FoodIcon emoji={entry.emoji} name={entry.name} size={20} /></span>
                          <span className="k-meal-name">
                            {entry.name}
                            <small>{entryTime(entry)} · P {Math.round(entry.protein)} · C {Math.round(entry.carbs)} · F {Math.round(entry.fat)}</small>
                          </span>
                          <span className="k-meal-kcal tabular">{Math.round(entry.calories)} kcal</span>
                        </button>
                      </SwipeRow>
                    ))}
                    {isToday && !guest && (
                      <button type="button" className="k-add-row" onClick={() => openLog(group.type)}>
                        <IconPlus size={16} /> Add {group.label.toLowerCase()}
                      </button>
                    )}
                  </section>
                ))}
                {!isToday && (
                  <button type="button" className="k-button k-back-today" onClick={() => setSelectedDate(startOfDay())}>
                    Back to today
                  </button>
                )}
              </section>

              {showMomo && (
                <aside className="k-momo" aria-label="A note from Momo">
                  <span className="k-momo-avatar"><MomoSticker mood={dayEntries.length > 0 ? 'proud' : 'cozy'} /></span>
                  <p>
                    {isToday
                      ? dayEntries.length > 0 ? 'You showed up. That’s the part worth celebrating.' : 'Fancy breakfast, leftover pizza — it all belongs here.'
                      : 'A page from your food story. No grades attached.'}
                  </p>
                  {profile.mascotRoasts && (
                    <button type="button" className="k-text-button" onClick={() => mascotEvent('poke')}>
                      Roast me <IconFlame size={16} />
                    </button>
                  )}
                </aside>
              )}

              {isToday && !guest && (
                <section className="k-extras" aria-label="Water and notes">
                  <span className="k-extras-label"><IconWater size={18} /> Water</span>
                  <div className="k-stepper" role="group" aria-label="Water glasses">
                    <button type="button" aria-label="Remove a glass of water" disabled={water <= 0} onClick={() => changeWater(water - 1)}>−</button>
                    <span className="tabular" aria-live="polite">{water}/{WATER_GLASSES}</span>
                    <button type="button" aria-label="Add a glass of water" disabled={water >= WATER_GLASSES} onClick={() => changeWater(water + 1)}>+</button>
                  </div>
                  <button
                    type="button"
                    className="k-text-button"
                    disabled={notes >= NOTE_LIMIT}
                    onClick={() => { feel('tap'); patchGamification(g => applyNote(g, selectedDayKey)) }}
                  >
                    {notes >= NOTE_LIMIT ? 'Notes logged' : 'Add a kitchen note'}
                  </button>
                </section>
              )}
            </>
          )}
        </main>
      </PullToRefresh>

      {!guest && <BottomNav />}
    </div>
  )
}
