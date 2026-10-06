import { AppShell } from '../components/system/AppShell'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { IconSearch } from '../components/icons'
import { RepeatMealRow } from '../components/RepeatMealRow'
import { useApp, isFavorite } from '../store/AppContext'
import { defaultMealType, recentMeals, mealKey, scaleMeal } from '../lib/meals'
import { filterMealLibrary } from '../lib/mealLibrary'
import { mealTypeFromNavState } from '../lib/logContext'
import { MEAL_LABELS, type FoodEntry, type MealType, type SavedMeal } from '../types'
import { History } from 'lucide-react'
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
  const [mealType, setMealType] = useState<MealType>(() => mealTypeFromNavState(location.state) ?? defaultMealType())
  const [logGuard] = useState(createOnceGuard)
  const feel = useFeel()
  const recents = recentMeals(state.foodEntries).filter(entry => !isFavorite(state, entry))
  const isSubRoute = location.pathname === '/log/saved'
  const filteredSaved = useMemo(() => filterMealLibrary(state.favoriteMeals, query, filter), [state.favoriteMeals, query, filter])
  const filteredRecents = filterMealLibrary(recents, query, filter)
  const hasFilters = Boolean(query.trim()) || filter !== 'all'

  function resetFilters() { setQuery(''); setFilter('all') }

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
          <h1 className="page-title">Saved</h1>
          <p className="page-sub">Your saved meals come first, followed by other recent meals.</p>
        </header>

        <div className="k-saved-context">
          <label htmlFor="saved-log-meal-type">Logging to</label>
          <select id="saved-log-meal-type" value={mealType} onChange={event => {
            const next = event.target.value as MealType
            feel('select')
            setMealType(next)
            navigate(location.pathname, { replace: true, state: { ...(location.state && typeof location.state === 'object' ? location.state : {}), mealType: next } })
          }}>
            {(Object.keys(MEAL_LABELS) as MealType[]).map(choice => <option key={choice} value={choice}>{MEAL_LABELS[choice]}</option>)}
          </select>
          <span>Today</span>
        </div>

        <label className="saved-search-label" htmlFor="saved-meal-search">Find a saved or recent meal</label>
        <div className="discover-search">
          <IconSearch size={16} />
          <input id="saved-meal-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try a meal name" type="search" />
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
                {filteredSaved.map(meal => <RepeatMealRow key={meal.id} item={meal} basis="saved" mealType={mealType} onLog={multiplier => logMeal(meal, multiplier)} onSave={() => toggleFavorite(meal)} saved />)}
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
                {filteredRecents.map(entry => <RepeatMealRow key={entry.id} item={entry} basis="previous" mealType={mealType} onLog={multiplier => logMeal(entry, multiplier)} onSave={() => toggleFavorite(entry)} saved={isFavorite(state, entry)} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  )
}
