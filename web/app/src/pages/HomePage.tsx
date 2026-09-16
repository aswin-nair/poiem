import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LevelUpOverlay } from '../components/LevelUpOverlay'
import { DatePickerModal } from '../components/DatePickerModal'
import { BottomNav } from '../components/BottomNav'
import { TodayMomo } from '../components/TodayMomo'
import { WeekStrip } from '../components/WeekStrip'
import { Meter } from '../components/Meter'
import {
  FoodIcon, IconBreakfast, IconCalendar, IconCarbs, IconDinner, IconLunch, IconMeal, IconPlus, IconWater,
} from '../components/icons'
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
import { useCountUp } from '../hooks/useCountUp'
import { playLogConfirm, setFeelEnabled } from '../lib/feel'
import { evaluateNotifications } from '../lib/notifications'
import { calorieBudget, entryTime, groupEntriesByMeal, macroBudget } from '../lib/today'
import { shouldCelebrateLog } from '../lib/logFeedback'
import { foodToneFor } from '../lib/foodGlyph'
import { todayGreeting } from '../lib/todayGreeting'
import { claimPieces, newPieces, wardrobeProgress, type WardrobePiece } from '@fud-ai/product/wardrobe'
import type { FoodEntry, MealType, XpEvent } from '../types'
import { useAnchor } from '../mascot/anchors'
import { mascotEvent } from '../mascot/MascotOverlay'
import { clearFirstMealJourney, isFirstMealJourney } from '../lib/firstMeal'

interface JustLogged { id?: string; calories: number; name: string }

interface CelebrationState {
  entryId?: string
  foodName: string
  awards: XpEvent[]
  pieces: WardrobePiece[]
  mascotEvent: 'log_success' | 'milestone'
  firstMeal: boolean
}

const WATER_GLASSES = 8
const NOTE_LIMIT = 3
/** How long a just-logged meal keeps its highlight. */
const FRESH_MS = 2_400
const MEAL_ICONS: Record<MealType, typeof IconMeal> = {
  breakfast: IconBreakfast, lunch: IconLunch, dinner: IconDinner, snack: IconCarbs, other: IconMeal,
}

/**
 * Today: Momo says hello, the number that matters sits on a bright card, and
 * meals are grouped the way the day went, each in its own colour. Streaks,
 * levels and XP live on Insights.
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
  const [freshId, setFreshId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const loggedNavKey = useRef('')
  const prevSeenBadgeCount = useRef(state.gamification.seenBadgeIds.length)

  const profile = state.profile
  const paused = Boolean(profile.trackingPaused)
  const dayEntries = entriesForDay(state.foodEntries, selectedDate)
  const totals = macroTotals(dayEntries)
  const groups = groupEntriesByMeal(dayEntries)
  const budget = calorieBudget(totals.calories, effectiveCalories(profile))
  // The big number counts up when Today opens and whenever a meal changes it.
  const shownBudget = useCountUp(mounted ? (budget.over > 0 ? budget.over : budget.remaining) : 0, 700)
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
  const greeting = todayGreeting({
    hour: new Date().getHours(),
    name: profile.name,
    mealsToday: dayEntries.length,
    over: budget.over > 0,
    isToday,
  })
  const macros = [
    { key: 'protein', label: 'Protein', ...macroBudget(totals.protein, effectiveProtein(profile)) },
    { key: 'carbs', label: 'Carbs', ...macroBudget(totals.carbs, effectiveCarbs(profile)) },
    { key: 'fat', label: 'Fat', ...macroBudget(totals.fat, effectiveFat(profile)) },
  ]

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!freshId) return
    const timer = window.setTimeout(() => setFreshId(null), FRESH_MS)
    return () => window.clearTimeout(timer)
  }, [freshId])

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
    // A wardrobe piece unlocked since the last reveal arrives in the celebration, worn, exactly once.
    const pieces = paused ? [] : newPieces(state.gamification.ownedCosmeticIds, wardrobeProgress(state))
    if (pieces.length) patchGamification(g => claimPieces(g, pieces.map(piece => piece.id)))
    const firstMeal = isFirstMealJourney() || state.foodEntries.filter(entry => entry.id !== justLogged.id).length === 0
    if (!paused && (firstMeal || shouldCelebrateLog({ entries: state.foodEntries, entryId: justLogged.id, awards: fresh, newPieces: pieces.length }))) {
      setCelebration({
        entryId: justLogged.id,
        foodName: justLogged.name,
        awards: fresh,
        pieces,
        mascotEvent: streakMilestone || pieces.length ? 'milestone' : 'log_success',
        firstMeal,
      })
      return
    }
    const entryId = justLogged.id
    if (entryId) setFreshId(entryId)
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
          firstMeal={celebration.firstMeal}
          streak={streak}
          awards={celebration.awards}
          outfit={state.gamification.outfit}
          pieces={celebration.pieces}
          onDone={() => {
            const { entryId, foodName, mascotEvent: event } = celebration
            if (entryId) {
              setFreshId(entryId)
              toast(`Logged ${foodName}`, { action: { label: 'Undo', fn: () => deleteEntry(entryId) } })
            }
            setCelebration(null)
            clearFirstMealJourney()
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

              {showMomo && (
                <TodayMomo
                  greeting={greeting}
                  outfit={state.gamification.outfit}
                  roasts={Boolean(profile.mascotRoasts)}
                  onRoast={() => mascotEvent('poke')}
                />
              )}

              <section ref={budgetAnchor} className={`k-budget${budget.over > 0 ? ' is-over' : ''}`} aria-labelledby="budget-title">
                <h2 id="budget-title" className="k-eyebrow">{snapshotLabel}</h2>
                <p className="k-budget-number">
                  <strong className="tabular">{shownBudget.toLocaleString()}</strong>
                  {dayEntries.length > 0 && (
                    <svg className="k-budget-burst" viewBox="0 0 48 48" aria-hidden="true"><path d="M10 14l7 8M4 30l11 1M26 4l-1 12" /></svg>
                  )}
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
                  <div key={macro.key} className={`k-macro is-${macro.key}`}>
                    <span className="k-macro-label"><i aria-hidden="true" />{macro.label}</span>
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
                  <div className="k-empty-day">
                    <svg className="k-empty-plate" viewBox="0 0 80 80" aria-hidden="true">
                      <circle cx="40" cy="40" r="34" />
                      <circle cx="40" cy="40" r="23" />
                      <path d="M40 23v6M57 40h-6" />
                    </svg>
                    <p className="k-empty">
                      {isToday
                        ? 'Your table is ready. Start with whatever you ate — you can change the details later.'
                        : `Nothing was logged ${dayLabel === 'Yesterday' ? 'yesterday' : `on ${dayLabel}`}.`}
                    </p>
                  </div>
                )}
                {groups.map(group => {
                  if (!isToday && group.entries.length === 0) return null
                  const GroupIcon = MEAL_ICONS[group.type]
                  return (
                    <section key={group.type} className={`k-meal-group is-${group.type}`} aria-labelledby={`meal-${group.type}`}>
                      <header className="k-meal-head">
                        <span className="k-meal-icon" aria-hidden="true"><GroupIcon size={16} /></span>
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
                            className={`k-meal-row${entry.id === freshId ? ' is-fresh' : ''}`}
                            onClick={() => { feel('tap'); navigate(`/edit/${entry.id}`) }}
                          >
                            <span className={`k-food-tile is-tone-${foodToneFor(entry.name)}`}><FoodIcon emoji={entry.emoji} name={entry.name} size={20} /></span>
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
                          <span className="k-add-plus" aria-hidden="true"><IconPlus size={16} /></span> Add {group.label.toLowerCase()}
                        </button>
                      )}
                    </section>
                  )
                })}
                {!isToday && (
                  <button type="button" className="k-button k-back-today" onClick={() => setSelectedDate(startOfDay())}>
                    Back to today
                  </button>
                )}
              </section>

              {isToday && !guest && (
                <section className="k-extras" aria-label="Water and notes">
                  <div className="k-water">
                    <span className="k-extras-label"><IconWater size={18} /> Water</span>
                    <span className="k-glasses" aria-hidden="true">
                      {Array.from({ length: WATER_GLASSES }, (_, glass) => (
                        <span key={glass} className={`k-glass${glass < water ? ' is-full' : ''}`} />
                      ))}
                    </span>
                  </div>
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
