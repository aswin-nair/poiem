import { AppShell } from '../components/system/AppShell'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { FoodIcon, IconMinus, IconPlus, IconSearch, IconStar } from '../components/icons'
import { useApp, isFavorite } from '../store/AppContext'
import { recentMeals, mealKey } from '../lib/meals'
import { filterMealLibrary } from '../lib/mealLibrary'
import { foodToneFor } from '../lib/foodGlyph'
import { MEAL_LABELS } from '../types'
import type { SavedMeal } from '../types'
import type { FoodEntry } from '../types'
import { History } from 'lucide-react'
import * as m from 'motion/react-m'
import { motionSpring } from '../lib/motionPresets'

const FILTERS = ['all', ...Object.keys(MEAL_LABELS)] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  ...MEAL_LABELS,
}

function macroRatio(protein: number, carbs: number, fat: number) {
  const cals = Math.max(protein * 4 + carbs * 4 + fat * 9, 0.001)
  return {
    p: Math.max(0, (protein * 4) / cals) * 100,
    c: Math.max(0, (carbs * 4) / cals) * 100,
    f: Math.max(0, (fat * 9) / cals) * 100,
  }
}

function DiscoverCard({
  emoji, name, calories, protein, carbs, fat, onLog, onStar, starred,
}: {
  emoji?: string; name: string; calories: number
  protein: number; carbs: number; fat: number
  onLog: (servings: number) => void; onStar: () => void; starred: boolean
}) {
  const [servings, setServings] = useState(1)
  const ratio = macroRatio(protein, carbs, fat)

  function changeServings(next: number) {
    setServings(Math.max(0.25, Math.round(next * 4) / 4))
  }

  return (
    <article className="discover-card" aria-label={name}>
      <div className="discover-card-top">
        <span className={`discover-card-emoji is-tone-${foodToneFor(name)}`}><FoodIcon emoji={emoji} name={name} size={26} /></span>
        <m.button
          type="button"
          className={`star-btn${starred ? ' active' : ''}`}
          whileTap={{ scale: .9 }} transition={motionSpring}
          onClick={onStar}
          aria-label={`${starred ? 'Unfavorite' : 'Favorite'} ${name}`}
          aria-pressed={starred}
        >
          <IconStar active={starred} size={17} />
        </m.button>
      </div>

      <h3 className="discover-card-name">{name}</h3>
      <span className="discover-card-cals">{Math.round(calories * servings)} kcal</span>
      <p className="saved-portion-note">Total for {servings}× portion</p>
      <p className="saved-macro-summary">Protein {Math.round(protein * servings * 10) / 10}g · Carbs {Math.round(carbs * servings * 10) / 10}g · Fat {Math.round(fat * servings * 10) / 10}g</p>

      <div className="discover-macro-bar" aria-hidden>
        <span style={{ width: `${ratio.p}%`, background: 'var(--protein)' }} />
        <span style={{ width: `${ratio.c}%`, background: 'var(--carbs)' }} />
        <span style={{ width: `${ratio.f}%`, background: 'var(--fat)' }} />
      </div>

      <div className="discover-card-footer">
        <div className="serving-stepper-compact">
          <button type="button" className="ssc-btn" onClick={() => changeServings(servings - 0.25)} disabled={servings <= 0.25} aria-label={`Decrease servings for ${name}`}><IconMinus size={12} strokeWidth={2.6} /></button>
          <span className="ssc-val">{servings}×</span>
          <button type="button" className="ssc-btn" onClick={() => changeServings(servings + 0.25)} aria-label={`Increase servings for ${name}`}><IconPlus size={12} strokeWidth={2.6} /></button>
        </div>
        <button type="button" className="log-pill-btn" aria-label={`Log ${name}, ${servings} times portion`} onClick={() => onLog(servings)}>Log meal</button>
      </div>
    </article>
  )
}

function MealRow({
  emoji, name, calories, protein, carbs, fat, mealType,
  onLog, onStar, starred,
}: {
  emoji?: string; name: string; calories: number
  protein: number; carbs: number; fat: number; mealType: string
  onLog: (servings: number) => void; onStar?: () => void; starred?: boolean
}) {
  const [servings, setServings] = useState(1)
  const [adjusting, setAdjusting] = useState(false)

  function changeServings(next: number) {
    setServings(Math.max(0.25, Math.round(next * 4) / 4))
  }

  return (
    <article className="saved-meal-row" aria-label={name}>
      <span className={`saved-meal-emoji is-tone-${foodToneFor(name)}`}><FoodIcon emoji={emoji} name={name} size={24} /></span>
      <div className="saved-meal-info">
        <h3 className="saved-meal-name">{name}</h3>
        <div className="saved-meal-meta">
          <span className="saved-meal-cals">{Math.round(calories * servings)} kcal</span>
          <span className="saved-meal-dot">·</span>
          <span className="saved-meal-macros">
            <span>Protein {Math.round(protein * servings * 10) / 10}g</span>
            {' · '}
            <span>Carbs {Math.round(carbs * servings * 10) / 10}g</span>
            {' · '}
            <span>Fat {Math.round(fat * servings * 10) / 10}g</span>
          </span>
        </div>
        <span className="saved-meal-type">{MEAL_LABELS[mealType as keyof typeof MEAL_LABELS] ?? mealType}</span>
        <p className="saved-portion-note">Total for {servings}× portion</p>
      </div>
      <div className="saved-meal-actions">
        {onStar && (
          <m.button
            type="button"
            className={`star-btn${starred ? ' active' : ''}`}
            whileTap={{ scale: .9 }} transition={motionSpring}
            onClick={onStar}
            aria-label={`${starred ? 'Unfavorite' : 'Favorite'} ${name}`}
            aria-pressed={Boolean(starred)}
          >
            <IconStar active={starred} size={17} />
          </m.button>
        )}
        {adjusting ? (
          <div className="serving-stepper-compact">
            <button type="button" className="ssc-btn" onClick={() => changeServings(servings - 0.25)} disabled={servings <= 0.25} aria-label={`Decrease servings for ${name}`}><IconMinus size={13} strokeWidth={2.6} /></button>
            <span className="ssc-val">{servings}×</span>
            <button type="button" className="ssc-btn" onClick={() => changeServings(servings + 0.25)} aria-label={`Increase servings for ${name}`}><IconPlus size={13} strokeWidth={2.6} /></button>
          </div>
        ) : (
          <button type="button" className="saved-reset" aria-expanded={false} onClick={() => setAdjusting(true)}>Portion</button>
        )}
        <button type="button" className="log-pill-btn" aria-label={`Log ${name}, ${servings} times portion`} onClick={() => onLog(servings)}>Log meal</button>
      </div>
    </article>
  )
}

export function SavedMealsPage() {
  const { state, logSavedMeal, toggleFavorite } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const recents = recentMeals(state.foodEntries).filter(entry => !isFavorite(state, entry))

  // Reached both as the "Saved" tab and as a shortcut from the Log menu — only
  // the latter is a sub-page that needs a way back.
  const isSubRoute = location.pathname === '/log/saved'

  const filteredFavorites = useMemo(() => filterMealLibrary(state.favoriteMeals, query, filter), [state.favoriteMeals, query, filter])
  const filteredRecents = filterMealLibrary(recents, query, filter)
  const hasFilters = Boolean(query.trim()) || filter !== 'all'

  function resetFilters() { setQuery(''); setFilter('all') }

  function logEntry(entry: FoodEntry, servings: number) {
    const cals = Math.round(entry.calories * servings)
    const logged = logSavedMeal({
      id: mealKey(entry),
      name: entry.name,
      calories: cals,
      protein: Math.round(entry.protein * servings * 10) / 10,
      carbs: Math.round(entry.carbs * servings * 10) / 10,
      fat: Math.round(entry.fat * servings * 10) / 10,
      emoji: entry.emoji,
      mealType: entry.mealType,
      servingSizeGrams: entry.servingSizeGrams,
    })
    navigate('/', { state: { justLogged: { id: logged.id, calories: cals, name: entry.name } } })
  }

  function logMeal(meal: SavedMeal, servings: number) {
    const cals = Math.round(meal.calories * servings)
    const logged = logSavedMeal({
      ...meal,
      calories: cals,
      protein: Math.round(meal.protein * servings * 10) / 10,
      carbs: Math.round(meal.carbs * servings * 10) / 10,
      fat: Math.round(meal.fat * servings * 10) / 10,
    })
    navigate('/', { state: { justLogged: { id: logged.id, calories: cals, name: meal.name } } })
  }

  return (
    <AppShell screen="k-saved" nav={<BottomNav />}>
      <main className="app-main">
        {isSubRoute && <BackLink to="/log" />}
        <header className="page-heading">
          <p className="k-eyebrow">Your usuals</p>
          <h1 className="page-title">Saved</h1>
          <p className="page-sub">Pinned meals stay up top. Recents skip anything already pinned.</p>
        </header>

        <label className="saved-search-label" htmlFor="saved-meal-search">Find a saved or recent meal</label>
        <div className="discover-search">
          <IconSearch size={16} />
          <input
            id="saved-meal-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Try a meal name"
            type="search"
          />
        </div>

        <div className="discover-chip-row" role="group" aria-label="Filter saved meals by type">
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              className={`discover-chip${filter === f ? ' active' : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        {hasFilters && <button type="button" className="saved-reset" onClick={resetFilters}>Clear search and filters</button>}
        <p className="club-results" role="status" aria-live="polite" aria-atomic="true">
          {filteredFavorites.length} saved · {filteredRecents.length} recent{hasFilters ? ' matching your filters' : ' in your collection'}
        </p>

        <div className="saved-collections">
        <section className="saved-collection" aria-label="Pinned meals">
        <div className="discover-section-header">
          <h2 className="discover-section-title">Pinned</h2>
          <span className="discover-count-badge">{filteredFavorites.length}</span>
        </div>

        {state.favoriteMeals.length === 0 ? (
          <div className="saved-empty"><strong>Keep your favourites here</strong><p>Star a recent meal below, or log something new to start your collection.</p><Link className="saved-reset" to="/log">Log a meal</Link></div>
        ) : filteredFavorites.length === 0 ? (
          <div className="saved-empty">No saved meals match these filters. Try another name or clear the filters above.</div>
        ) : (
          <div className="discover-grid motion-list">
            {filteredFavorites.map(meal => (
              <DiscoverCard
                key={meal.id}
                emoji={meal.emoji}
                name={meal.name}
                calories={meal.calories}
                protein={meal.protein}
                carbs={meal.carbs}
                fat={meal.fat}
                onLog={s => logMeal(meal, s)}
                onStar={() => toggleFavorite(meal)}
                starred
              />
            ))}
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
            <div className="saved-card">
              {filteredRecents.map((entry, i) => (
                <div key={entry.id}>
                  <MealRow
                    emoji={entry.emoji}
                    name={entry.name}
                    calories={entry.calories}
                    protein={entry.protein}
                    carbs={entry.carbs}
                    fat={entry.fat}
                    mealType={entry.mealType}
                    onLog={s => logEntry(entry, s)}
                    onStar={() => toggleFavorite(entry)}
                    starred={isFavorite(state, entry)}
                  />
                  {i < filteredRecents.length - 1 && <div className="saved-divider" />}
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
    </AppShell>
  )
}
