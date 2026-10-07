import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { DayRing } from '../components/DayRing'
import { LogMoment } from '../components/LogMoment'
import { DatePickerModal } from '../components/DatePickerModal'
import { BottomNav } from '../components/BottomNav'
import { AppShell, EmptyState, MealRow, PageHeader, Section, Surface } from '../components/system'
import { TodayMomo } from '../components/TodayMomo'
import { WeekStrip } from '../components/WeekStrip'
import { Meter } from '../components/Meter'
import {
  FoodIcon, IconBreakfast, IconCalendar, IconCarbs, IconDinner, IconLunch, IconMeal, IconPlus, IconWater,
} from '../components/icons'
import { SwipeRow } from '../components/SwipeRow'
import { PullToRefresh } from '../components/PullToRefresh'
import { useToast } from '../components/Toast'
import { useApp } from '../store/AppContext'
import { entriesForDay, macroTotals } from '../lib/storage'
import { effectiveCalories, effectiveCarbs, effectiveFat, effectiveProtein } from '../lib/profile'
import { formatDayLabel, journalDayFromNavState, localDayKey, sameDay, startOfDay } from '../lib/dates'
import { applyNote, applyWaterChange } from '../lib/enamelEconomy'
import { useFeel } from '../hooks/useHaptic'
import { useCountUp } from '../hooks/useCountUp'
import { evaluateNotifications } from '../lib/notifications'
import { calorieBudget, entryTime, groupEntriesByMeal, macroBudget } from '../lib/today'
import { planLogFeedback, type LogFeedbackPlan } from '../lib/logFeedbackPlan'
import { RING_CHECK_MS, levelUpToToast, presentLogFeedback, ringCheckMs } from '../lib/logPresentation'
import type { LogReceipt } from '../lib/logReceipt'
import { LogSheetOpenContext } from '../lib/logSheetOpen'
import { dayRingEntries } from '../lib/dayRingEntries'
import { dayRingProgress } from '../lib/dayRing'
import { progressNote } from '../lib/progressNote'
import { readRingAck, writeRingAck } from '../lib/ringAck'
import { foodToneFor } from '../lib/foodGlyph'
import { todayGreeting } from '../lib/todayGreeting'
import { FIRST_PIECE, claimPieces, newPieces, wardrobeProgress } from '@fud-ai/product/wardrobe'
import type { FoodEntry, MealType } from '../types'
import { useAnchor } from '../mascot/anchors'
import { mascotEvent } from '../mascot/MascotOverlay'
import { clearFirstMealJourney, isFirstMealJourney } from '../lib/firstMeal'

interface MomentState { receipt: LogReceipt; plan: LogFeedbackPlan }

/** Only the number rerenders on count-up frames; the rest of Today stays available. */
function BudgetReadout({ value, active }: { value: number; active: boolean }) {
  const display = useCountUp(active ? value : 0, 700)
  return <strong className="tabular">{display.toLocaleString()}</strong>
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
 * meals are grouped the way the day went, each in its own colour. The ongoing
 * progress dashboard lives on Insights; a log receipt can acknowledge XP and level once.
 */
export function HomePage({ guest = false }: { guest?: boolean }) {
  const { state, ackLevelUp, patchGamification, deleteEntry, restoreEntry, refresh } = useApp()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const feel = useFeel()
  const budgetAnchor = useAnchor('calorie_ring')
  const [selectedDate, setSelectedDate] = useState(() => journalDayFromNavState(location.state) ?? startOfDay())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [moment, setMoment] = useState<MomentState | null>(null)
  // Retain clearance until Today unmounts: dismissing a card at the scroll end must not jump the page.
  const momentClearance = useRef(0)
  const main = useRef<HTMLElement>(null)
  const reserveMomentSpace = useCallback((height: number) => {
    const clearance = Math.max(momentClearance.current, height)
    if (clearance === momentClearance.current) return
    momentClearance.current = clearance
    // Geometry bookkeeping does not need another render of Today and its two Momo drawings.
    main.current?.style.setProperty('--k-moment-clearance', `${clearance}px`)
  }, [])
  /** The Day ring's check acknowledgement in ms while it plays, else null. */
  const [ringCheck, setRingCheck] = useState<number | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [waterBeat, setWaterBeat] = useState<{ glass: number; run: number } | null>(null)
  const loggedNavKey = useRef('')
  const mascotTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** False only after a real unmount; StrictMode's rehearsal unmount sets it straight back. */
  const onPage = useRef(false)
  const levelToasted = useRef<number | null>(null)
  const mealsTitle = useRef<HTMLHeadingElement>(null)
  const sheetOpen = useContext(LogSheetOpenContext)
  const reduced = useReducedMotion()
  const actionMotionStill = Boolean(reduced || state.profile.mascotReducedMotion || state.gamification.mascotActivity === 'calm')

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
  const hasLoggedToday = state.foodEntries.some(entry => sameDay(new Date(entry.timestamp), new Date()))
  const water = state.gamification.waterByDate[selectedDayKey] ?? 0
  const notes = state.gamification.notesByDate[selectedDayKey] ?? 0
  const loggedDays = useMemo(() => new Set(state.foodEntries.map(entry => localDayKey(entry.timestamp))), [state.foodEntries])
  // The note counts logged days exactly as wardrobe unlocks do (a stored local date wins over the timestamp).
  const loggedDayCount = useMemo(() => wardrobeProgress(state).loggedDays, [state])
  const frozenDays = useMemo(() => new Set(state.gamification.freezeUsedDates), [state.gamification.freezeUsedDates])
  const showMomo = state.gamification.mascotActivity !== 'off' && !profile.mascotMuted
  const momoReacts = !paused && showMomo && !reduced && !profile.mascotReducedMotion
  const momoReactsNow = useRef(momoReacts)
  const ring = dayRingProgress(dayRingEntries(dayEntries), notes, profile.loggingCommitment)
  const greeting = todayGreeting({
    hour: new Date().getHours(),
    name: profile.name,
    mealsToday: dayEntries.length,
    isToday,
  })
  const macros = [
    { key: 'protein', label: 'Protein', ...macroBudget(totals.protein, effectiveProtein(profile)) },
    { key: 'carbs', label: 'Carbs', ...macroBudget(totals.carbs, effectiveCarbs(profile)) },
    { key: 'fat', label: 'Fat', ...macroBudget(totals.fat, effectiveFat(profile)) },
  ]

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!waterBeat) return
    const timer = window.setTimeout(() => setWaterBeat(null), 500)
    return () => window.clearTimeout(timer)
  }, [waterBeat])

  useEffect(() => {
    onPage.current = true
    return () => { onPage.current = false }
  }, [])

  useEffect(() => { momoReactsNow.current = momoReacts }, [momoReacts])

  useEffect(() => {
    if (!freshId) return
    const timer = window.setTimeout(() => setFreshId(null), FRESH_MS)
    return () => window.clearTimeout(timer)
  }, [freshId])

  useEffect(() => {
    if (paused) return
    const hours = state.foodEntries.map(entry => new Date(entry.timestamp).getHours())
    void evaluateNotifications({
      loggedToday: hasLoggedToday,
      firstLogHours: hours,
      localHour: new Date().getHours(),
      trackingPaused: paused,
    })
  }, [paused, hasLoggedToday, state.foodEntries])

  // The class stays a little longer than the check plays, so it can be observed without racing it.
  useEffect(() => {
    if (ringCheck === null) return
    const timer = setTimeout(() => setRingCheck(null), 3_000)
    return () => clearTimeout(timer)
  }, [ringCheck])

  useEffect(() => {
    const justLogged = (location.state as { justLogged?: LogReceipt } | null)?.justLogged
    if (!justLogged) return
    if (loggedNavKey.current === location.key) return
    loggedNavKey.current = location.key
    navigate('.', { replace: true, state: null })
    // Navigation confirms accepted local product state, not a completed cloud write.
    const now = new Date()
    const todayKey = localDayKey(now)
    const entries = entriesForDay(state.foodEntries, now)
    const noteCount = state.gamification.notesByDate[todayKey] ?? 0
    const plan = planLogFeedback({
      receipt: justLogged,
      entries: state.foodEntries,
      gamification: state.gamification,
      newPieces: newPieces(state.gamification.ownedCosmeticIds, wardrobeProgress(state)),
      firstMealJourney: isFirstMealJourney(),
      paused,
      ring: {
        before: dayRingProgress(dayRingEntries(entries.filter(entry => entry.id !== justLogged.id)), noteCount, profile.loggingCommitment),
        after: dayRingProgress(dayRingEntries(entries), noteCount, profile.loggingCommitment),
      },
      ringAckedToday: readRingAck() === todayKey,
      now,
    })
    const view = presentLogFeedback(plan, justLogged.name)
    if (plan.cue) feel(plan.cue)
    if (plan.pieces.length) patchGamification(g => {
      const claimed = claimPieces(g, plan.pieces.map(piece => piece.id))
      return plan.kind === 'first-meal' && !claimed.outfit.head
        ? { ...claimed, outfit: { ...claimed.outfit, head: FIRST_PIECE } }
        : claimed
    })
    // The ring's check plays on any tier, inside the log's motion cap.
    const check = ringCheckMs(plan, Boolean(reduced))
    if (check !== null) {
      writeRingAck(todayKey)
      setRingCheck(check)
    }
    if (plan.levelUp !== null) {
      // The card or the toast carries "Level N."; acknowledge it so it is not toasted again.
      levelToasted.current = plan.levelUp
      ackLevelUp()
    }
    clearFirstMealJourney()
    setFreshId(justLogged.id)
    clearTimeout(mascotTimer.current)
    if (plan.mascotEvent && momoReactsNow.current) {
      const event = plan.mascotEvent
      // Not cancelled by an effect cleanup: StrictMode's rehearsal unmount would drop it.
      mascotTimer.current = setTimeout(() => {
        if (onPage.current && momoReactsNow.current) mascotEvent(event)
      }, 120)
    }
    if (view.surface === 'card') {
      setMoment({ receipt: justLogged, plan })
    } else {
      setMoment(null)
      toast(view.toastText, { action: { label: 'Undo', fn: () => deleteEntry(justLogged.id) } })
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const decision = levelUpToToast({
      pendingLevel: state.gamification.pendingLevelUp,
      paused,
      receiptPending: Boolean((location.state as { justLogged?: LogReceipt } | null)?.justLogged),
      sheetOpen,
      lastToasted: levelToasted.current,
    })
    if (decision.toastLevel !== null) {
      levelToasted.current = decision.toastLevel
      toast(`Level ${decision.toastLevel}.`)
    }
    if (decision.acknowledge) ackLevelUp()
  }, [state.gamification.pendingLevelUp, location.key, paused, sheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeMoment(moveFocus: boolean) {
    // Focus moves before the card unmounts, so it never falls to the page body.
    if (moveFocus) mealsTitle.current?.focus({ preventScroll: true })
    setMoment(null)
  }

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
    setWaterBeat(previous => next > water ? { glass: next - 1, run: (previous?.run ?? 0) + 1 } : null)
    patchGamification(g => applyWaterChange(g, selectedDayKey, Math.max(0, Math.min(WATER_GLASSES, next))))
  }

  function addNote() {
    feel('tap')
    const nextRing = dayRingProgress(dayRingEntries(dayEntries), notes + 1, profile.loggingCommitment)
    if (!ring.complete && nextRing.complete && readRingAck() !== selectedDayKey) {
      writeRingAck(selectedDayKey)
      setRingCheck(actionMotionStill ? 0 : RING_CHECK_MS)
    }
    patchGamification(g => applyNote(g, selectedDayKey))
  }

  return (
    <AppShell screen="k-today" nav={!guest ? <BottomNav /> : undefined}>
      <PageHeader
        className="k-today-header"
        avoid
        eyebrow={selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={dayLabel}
        action={(
          <button
            type="button"
            className="k-icon-button"
            onClick={() => { feel('open'); setShowDatePicker(true) }}
            aria-label="Choose date"
          >
            <IconCalendar size={22} />
          </button>
        )}
      />
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
        <main ref={main} className="app-main k-today-main" data-mascot-avoid>
          {paused ? (
            <Surface variant="outlined" as="section" className="k-notice" aria-labelledby="paused-title">
              <h2 id="paused-title">Tracking is paused</h2>
              <p>Calorie and macro numbers are hidden. Your streak is held where it is.</p>
              <Link className="k-text-button" to="/settings">Manage pause</Link>
            </Surface>
          ) : (
            <div className="k-today-layout">
              <div className="k-today-summary">
                {guest && (
                  <Surface variant="outlined" as="section" className="k-notice" aria-labelledby="guest-title">
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
                  </Surface>
                )}

                {showMomo && (
                  <TodayMomo
                    greeting={greeting}
                    outfit={state.gamification.outfit}
                    roasts={Boolean(profile.mascotRoasts)}
                    onRoast={() => mascotEvent('poke')}
                  />
                )}

                <DayRing
                  progress={ring}
                  justClosed={isToday && ringCheck !== null}
                  closeMs={ringCheck ?? RING_CHECK_MS}
                  note={<p className="k-ring-note">{progressNote({ loggedDays: loggedDayCount, ownedPieceIds: state.gamification.ownedCosmeticIds }).text}</p>}
                />

                <Surface
                  variant="hero"
                  as="section"
                  ref={budgetAnchor}
                  className={`k-budget${budget.over > 0 ? ' is-over' : ''}`}
                  aria-labelledby="budget-title"
                >
                  <h2 id="budget-title" className="k-eyebrow">{snapshotLabel}</h2>
                  <p className="k-budget-number">
                    <BudgetReadout value={budget.over > 0 ? budget.over : budget.remaining} active={mounted} />
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
                </Surface>

                <section className="k-macros" aria-label="Macros">
                  {macros.map(macro => (
                    <div key={macro.key} className={`k-macro is-${macro.key}`}>
                      <span className="k-macro-label"><i aria-hidden="true" />{macro.label}</span>
                      <span className="k-macro-value tabular"><strong>{macro.current}</strong> / {macro.goal}{'\u00a0'}g</span>
                      <Meter label={macro.label} value={macro.current} max={macro.goal} over={macro.over} />
                    </div>
                  ))}
                </section>

              </div>

              <Section
                className="k-meals"
                titleId="meals-title"
                titleRef={mealsTitle}
                title="Meals"
                meta={(
                  <span className="tabular">
                    {dayEntries.length === 0
                      ? 'Nothing yet'
                      : `${dayEntries.length} ${dayEntries.length === 1 ? 'meal' : 'meals'} · ${budget.consumed.toLocaleString()} kcal`}
                  </span>
                )}
              >
                {dayEntries.length === 0 && (
                  <EmptyState
                    className="k-empty-day"
                    body={isToday
                      ? 'Your table is ready. Start with whatever you ate — you can change the details later.'
                      : `Nothing was logged ${dayLabel === 'Yesterday' ? 'yesterday' : `on ${dayLabel}`}.`}
                  />
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
                          <MealRow
                            name={entry.name}
                            fresh={entry.id === freshId}
                            onClick={() => { feel('tap'); navigate(`/edit/${entry.id}`) }}
                            tile={<span className={`k-food-tile is-tone-${foodToneFor(entry.name)}`}><FoodIcon emoji={entry.emoji} name={entry.name} size={20} /></span>}
                            meta={`${entryTime(entry)} · P ${Math.round(entry.protein)} · C ${Math.round(entry.carbs)} · F ${Math.round(entry.fat)}`}
                            kcal={`${Math.round(entry.calories)} kcal`}
                          />
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
              </Section>
                {isToday && !guest && (
                  <Surface variant="outlined" as="section" className="k-extras" aria-label="Water and notes">
                    <div className="k-water-block">
                    <div className="k-water">
                      <span className="k-extras-label"><IconWater size={18} /> <span data-momo-play="water">Water</span></span>
                      <span className="k-glasses" aria-hidden="true">
                        {Array.from({ length: WATER_GLASSES }, (_, glass) => (
                          <span key={`${glass}-${waterBeat?.glass === glass ? waterBeat.run : 0}`} className={`k-glass${glass < water ? ' is-full' : ''}${glass < water && waterBeat?.glass === glass ? ' is-water-new' : ''}`} />
                        ))}
                      </span>
                    </div>
                    <div className="k-stepper" role="group" aria-label="Water glasses">
                      <button type="button" data-action-play="water" aria-label="Remove a glass of water" disabled={water <= 0} onClick={() => changeWater(water - 1)}>−</button>
                      <span className="tabular" aria-live="polite">{water}/{WATER_GLASSES}</span>
                      <button type="button" data-action-play="water" aria-label="Add a glass of water" disabled={water >= WATER_GLASSES} onClick={() => changeWater(water + 1)}>+</button>
                    </div>
                    </div>
                    <button
                      type="button"
                      className="k-text-button k-note-row"
                      data-action-play="submit"
                      disabled={notes >= NOTE_LIMIT}
                      onClick={addNote}
                    >
                      {notes >= NOTE_LIMIT ? 'Notes logged' : 'Add a kitchen note'}
                    </button>
                  </Surface>
                )}
            </div>
          )}
        </main>
      </PullToRefresh>
      {/* Out of the page flow and out of the pull-to-refresh transform, so it moves nothing when it comes and goes. */}
      {moment && !paused && createPortal(
        <LogMoment
          key={moment.receipt.id}
          plan={moment.plan}
          foodName={moment.receipt.name}
          outfit={state.gamification.outfit}
          showMomo={showMomo && !profile.mascotReducedMotion}
          onUndo={() => deleteEntry(moment.receipt.id)}
          onDone={closeMoment}
          onHeight={reserveMomentSpace}
        />,
        document.body,
      )}
    </AppShell>
  )
}
