import { AppShell } from '../components/system/AppShell'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { IconSearch } from '../components/icons'
import { RepeatMealRow } from '../components/RepeatMealRow'
import { useApp, isFavorite } from '../store/AppContext'
import { defaultMealType, recentMeals, mealKey, scaleMeal } from '../lib/meals'
import { filterMealLibrary, getMealLibraryUsage, sortMealLibrary, type MealLibrarySort } from '../lib/mealLibrary'
import { mealTypeFromNavState } from '../lib/logContext'
import { MEAL_LABELS, type FoodEntry, type MealType, type SavedMeal } from '../types'
import { ChevronDown, History } from 'lucide-react'
import { makeLogReceipt } from '../lib/logReceipt'
import { createOnceGuard } from '../lib/onceGuard'
import { useFeel } from '../hooks/useHaptic'

const FILTERS = ['all', ...Object.keys(MEAL_LABELS)] as const
type Filter = (typeof FILTERS)[number]
const FILTER_LABELS: Record<Filter, string> = { all: 'All', ...MEAL_LABELS }

export function SavedMealsPage() {
  const { state, logSavedMeal, toggleFavorite } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<MealLibrarySort>('recent')
  const [portions, setPortions] = useState(() => new Map<string, number>())
  const [mealType, setMealType] = useState<MealType>(() => mealTypeFromNavState(location.state) ?? defaultMealType())
  const [logGuard] = useState(createOnceGuard)
  const [saveCue, setSaveCue] = useState<{ key: string; run: number } | null>(null)
  const saveRun = useRef(0)
  const feel = useFeel()
  const recents = useMemo(() => recentMeals(state.foodEntries).filter(entry => !isFavorite(state, entry)), [state])
  const isSubRoute = location.pathname === '/log/saved'
  const usage = useMemo(() => getMealLibraryUsage(state.foodEntries), [state.foodEntries])
  const filteredSaved = useMemo(() => sortMealLibrary(filterMealLibrary(state.favoriteMeals, query, filter), sort, usage), [state.favoriteMeals, query, filter, sort, usage])
  const filteredRecents = filterMealLibrary(recents, query, filter)
  const hasFilters = Boolean(query.trim()) || filter !== 'all'

  useEffect(() => {
    if (!saveCue) return
    const timeout = window.setTimeout(() => setSaveCue(null), 450)
    return () => window.clearTimeout(timeout)
  }, [saveCue])

  function resetFilters() { setQuery(''); setFilter('all') }

  function choosePortion(meal: SavedMeal | FoodEntry, multiplier: number) {
    setPortions(previous => new Map(previous).set(mealKey(meal), multiplier))
  }

  function toggleSaved(meal: SavedMeal | FoodEntry) {
    const key = mealKey(meal)
    if (!state.favoriteMeals.some(saved => mealKey(saved) === key)) {
      // Carry a deliberate save across the move from Recents to Saved.
      setSaveCue({ key, run: ++saveRun.current })
    } else {
      setSaveCue(previous => previous?.key === key ? null : previous)
    }
    toggleFavorite(meal)
  }

  function logMeal(meal: SavedMeal | FoodEntry, multiplier: number) {
    logGuard.run(() => {
      const awardedFrom = state.gamification.awardedKeys.length
      const logged = logSavedMeal({
        ...scaleMeal(meal, multiplier),
        id: 'timestamp' in meal ? mealKey(meal) : meal.id,
        mealType,
        calories: Math.round(meal.calories * multiplier),
        protein: Math.round(meal.protein * multiplier * 10) / 10,
        carbs: Math.round(meal.carbs * multiplier * 10) / 10,
        fat: Math.round(meal.fat * multiplier * 10) / 10,
      })
      navigate('/', { state: { justLogged: makeLogReceipt(logged, awardedFrom) } })
    })
  }

  return (
    <AppShell screen="k-saved" nav={<BottomNav />}>
      <main className="app-main">
        {isSubRoute && <BackLink onClick={() => navigate('/log', { state: { mealType } })} />}
        <header className="page-heading">
          <p className="k-eyebrow">Your usuals</p>
          <h1 className="page-title" data-momo-play="saved">Saved</h1>
          <p className="page-sub">Choose a portion, then log one of your usuals to Today.</p>
        </header>

        <div className="k-saved-context">
          <label htmlFor="saved-log-meal-type">Logging to</label>
          <span className="saved-library-select">
            <select id="saved-log-meal-type" value={mealType} onChange={event => {
              const next = event.target.value as MealType
              feel('select')
              setMealType(next)
              navigate(location.pathname, { replace: true, state: { ...(location.state && typeof location.state === 'object' ? location.state : {}), mealType: next } })
            }}>
              {(Object.keys(MEAL_LABELS) as MealType[]).map(choice => <option key={choice} value={choice}>{MEAL_LABELS[choice]}</option>)}
            </select>
            <ChevronDown aria-hidden="true" focusable="false" />
          </span>
          <span>Today</span>
        </div>

        <div className="saved-library-toolbar">
          <div className="saved-library-search">
            <label className="saved-search-label" htmlFor="saved-meal-search">Find a saved or recent meal</label>
            <div className="discover-search">
              <IconSearch size={16} />
              <input id="saved-meal-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try a meal name" type="search" />
            </div>
          </div>
          <div className="saved-library-sort">
            <label htmlFor="saved-meal-sort">Sort saved meals</label>
            <span className="saved-library-select">
              <select id="saved-meal-sort" value={sort} onChange={event => { feel('select'); setSort(event.target.value as MealLibrarySort) }}>
                <option value="recent">Recently used</option>
                <option value="name">Name</option>
                <option value="most-used">Most used</option>
              </select>
              <ChevronDown aria-hidden="true" focusable="false" />
            </span>
          </div>
        </div>

        <div className="discover-chip-row" role="group" aria-label="Filter saved meals by type">
          {FILTERS.map(choice => (
            <button key={choice} type="button" className={`discover-chip${filter === choice ? ' active' : ''}`} aria-pressed={filter === choice}
              onClick={() => { if (filter === choice) return; feel('select'); setFilter(choice) }}>
              {FILTER_LABELS[choice]}
            </button>
          ))}
        </div>
        {hasFilters && <button type="button" className="saved-reset" onClick={resetFilters}>Clear search and filters</button>}
        <p className="club-results" role="status" aria-live="polite" aria-atomic="true">
          {filteredSaved.length} saved · {filteredRecents.length} recent{hasFilters ? ' matching your filters' : ' in your collection'}
        </p>

        <div className="saved-collections">
          <section className="saved-collection" aria-label="Saved meals">
            <div className="discover-section-header">
              <h2 className="discover-section-title">Your saved meals</h2>
              <span className="discover-count-badge">{filteredSaved.length}</span>
            </div>
            {state.favoriteMeals.length === 0 ? (
              <div className="saved-empty"><strong>Keep your usuals here</strong><p>Save a recent meal below, or log something new to start your collection.</p><Link className="saved-reset" to="/log" state={{ mealType }}>Log a meal</Link></div>
            ) : filteredSaved.length === 0 ? (
              <div className="saved-empty">No saved meals match these filters. Try another name or clear the filters above.</div>
            ) : (
              <div className="k-repeat-list">
                {filteredSaved.map(meal => {
                  const key = mealKey(meal)
                  const count = usage.get(key)?.count ?? 0
                  return <div className="saved-library-item" key={key}>
                    <RepeatMealRow item={meal} basis="saved" mealType={mealType} onLog={multiplier => logMeal(meal, multiplier)} onSave={() => toggleSaved(meal)} saved saveCue={saveCue?.key === key ? saveCue.run : undefined} compact portionMultiplier={portions.get(key) ?? 1} onPortionChange={multiplier => choosePortion(meal, multiplier)} />
                    <p className="saved-library-usage">{count ? `${count} matching journal ${count === 1 ? 'log' : 'logs'}` : 'No matching journal logs yet'}</p>
                  </div>
                })}
              </div>
            )}
          </section>
          <section className="saved-section" aria-label="Recent meals">
            <div className="saved-section-header">
              <span className="saved-section-icon"><History size={20} aria-hidden="true" /></span>
              <h2 className="saved-section-title">Recents</h2>
              <span className="discover-count-badge">{filteredRecents.length}</span>
            </div>
            {filteredRecents.length === 0 ? (
              <div className="saved-empty">{recents.length ? 'No recent meals match these filters.' : 'Your logged meals will appear here for easy reuse.'}</div>
            ) : (
              <div className="k-repeat-list">
                {filteredRecents.map(entry => <RepeatMealRow key={mealKey(entry)} item={entry} basis="previous" mealType={mealType} onLog={multiplier => logMeal(entry, multiplier)} onSave={() => toggleSaved(entry)} saved={isFavorite(state, entry)} compact portionMultiplier={portions.get(mealKey(entry)) ?? 1} onPortionChange={multiplier => choosePortion(entry, multiplier)} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  )
}
