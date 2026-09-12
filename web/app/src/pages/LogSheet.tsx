import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { PortionSheet } from '../components/PortionSheet'
import { useLongPress } from '../hooks/useLongPress'
import { useFeel } from '../hooks/useHaptic'
import {
  FoodIcon, IconBreakfast, IconCamera, IconCarbs, IconChevronDown, IconClipboard, IconClose, IconDinner, IconEdit,
  IconHistory, IconLunch, IconMeal, IconPlus, IconSearch, IconStar,
} from '../components/icons'
import { MomoSticker } from '../components/MomoSticker'
import { foodToneFor } from '../lib/foodGlyph'
import { useApp } from '../store/AppContext'
import { recordFoodSearch, selectLogMethod, startLogFlow, type LogMethod } from '../lib/analytics'
import { defaultMealType, mealKey, parseQuickAdd, quickAddEntry, recentMeals, savedToEntry, scaleMeal } from '../lib/meals'
import { MEAL_LABELS, type FoodEntry, type MealType, type SavedMeal } from '../types'
import { mascotEvent } from '../mascot/MascotOverlay'

const METHODS = [
  { to: '/log/photo', short: 'Photo', hint: 'Point, shoot, check', name: 'Snap a photo', method: 'photo_ai', Icon: IconCamera, tone: 'butter' },
  { to: '/log/text', short: 'Describe', hint: 'Say it in your words', name: 'Describe your meal', method: 'text_ai', Icon: IconEdit, tone: 'sky' },
  { to: '/log/manual', short: 'Manual', hint: 'Type the numbers', name: 'Manual entry', method: 'manual', Icon: IconClipboard, tone: 'mint' },
  { to: '/log/saved', short: 'Saved', hint: 'Your usuals', name: 'Saved meals', method: 'saved', Icon: IconStar, tone: 'pink' },
] as const

const MEAL_CHOICES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_ICONS: Record<MealType, typeof IconMeal> = {
  breakfast: IconBreakfast, lunch: IconLunch, dinner: IconDinner, snack: IconCarbs, other: IconMeal,
}
/** A kind nudge for the meal being logged. Never a question about amounts. */
const PROMPTS: Record<MealType, string> = {
  breakfast: 'What started your day?',
  lunch: 'What’s on the lunch plate?',
  dinner: 'What’s for dinner?',
  snack: 'A little something?',
  other: 'Anything counts.',
}
/** How many recents to offer before the list stops being scannable. */
const RECENT_LIMIT = 12
const RECENT_PREVIEW = 5

export interface LogRouteState {
  background?: Location
  mealType?: MealType
}

/**
 * The log sheet opens over whatever you were looking at. Returning users see
 * their recent meals first, where one tap logs; new ways to log sit directly
 * underneath. It never opens the phone keyboard on arrival.
 */
export function LogSheet() {
  const { state, addEntry } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const feel = useFeel()
  const routeState = (location.state as LogRouteState | null) ?? {}
  const [mealType, setMealType] = useState<MealType>(() => routeState.mealType ?? defaultMealType())
  const [choosingMeal, setChoosingMeal] = useState(false)
  const [query, setQuery] = useState('')
  const [shelf, setShelf] = useState<'recent' | 'favourite'>('recent')
  const [showAllRecents, setShowAllRecents] = useState(false)
  const [portionFor, setPortionFor] = useState<{ item: FoodEntry | SavedMeal; source: LogMethod } | null>(null)
  const lastEmptyTease = useRef('')

  useEffect(() => {
    startLogFlow('search', state.foodEntries.length === 0)
  }, [state.foodEntries.length])

  const recents = useMemo(() => recentMeals(state.foodEntries, RECENT_LIMIT), [state.foodEntries])
  const favourites = state.favoriteMeals
  const quickAddCalories = parseQuickAdd(query)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    const seen = new Set<string>()
    return [...favourites, ...recents].filter(item => {
      if (!item.name.toLowerCase().includes(needle)) return false
      const key = mealKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [query, favourites, recents])

  useEffect(() => {
    const needle = query.trim()
    if (!needle || parseQuickAdd(needle) !== null) return
    const handle = window.setTimeout(() => {
      recordFoodSearch(matches.length)
      if (matches.length === 0 && lastEmptyTease.current !== needle) {
        lastEmptyTease.current = needle
        mascotEvent('empty_search')
      }
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query, matches.length])

  function close() {
    feel('close')
    if (routeState.background) navigate(-1)
    else navigate('/', { replace: true })
  }

  function commit(entry: FoodEntry, source: LogMethod) {
    selectLogMethod(source)
    const logged: FoodEntry = { ...entry, mealType }
    addEntry(logged)
    navigate('/', { replace: true, state: { justLogged: { id: logged.id, calories: logged.calories, name: logged.name } } })
  }

  function logAgain(item: FoodEntry | SavedMeal, source: LogMethod, multiplier = 1) {
    const saved: SavedMeal = 'timestamp' in item ? { ...item, id: crypto.randomUUID() } : item
    commit(savedToEntry(scaleMeal(saved, multiplier), 'recent'), source)
  }

  const hasShortcuts = recents.length > 0 || favourites.length > 0
  const activeShelf = recents.length === 0 ? 'favourite' : favourites.length === 0 ? 'recent' : shelf
  const shelfSource: LogMethod = activeShelf === 'recent' ? 'recent' : 'favourite'
  const shelfItems: Array<FoodEntry | SavedMeal> = activeShelf === 'recent'
    ? (showAllRecents ? recents : recents.slice(0, RECENT_PREVIEW))
    : favourites
  const MealIcon = MEAL_ICONS[mealType]

  return (
    <>
      <Sheet labelledBy="log-sheet-title" onClose={() => { if (!portionFor) close() }} className="k-log-sheet">
        <header className="k-sheet-head k-log-head">
          <span className="k-log-momo"><MomoSticker mood="curious" pose="still" expression="curious" /></span>
          <div className="k-log-title">
            <h2 id="log-sheet-title">Log a meal</h2>
            <p className="k-log-prompt">{PROMPTS[mealType]}</p>
          </div>
          <button type="button" className="k-icon-button" onClick={close} aria-label="Close">
            <IconClose size={20} />
          </button>
        </header>

        <div className="k-log-for">
          <span className={`k-log-meal-icon is-${mealType}`} aria-hidden="true"><MealIcon size={20} /></span>
          <span className="k-eyebrow" id="log-meal-label">Logging to</span>
          <button
            type="button"
            className={`k-chip k-log-meal is-${mealType}`}
            aria-expanded={choosingMeal}
            aria-controls="log-meal-choices"
            onClick={() => setChoosingMeal(value => !value)}
          >
            {MEAL_LABELS[mealType]} <IconChevronDown size={16} />
          </button>
        </div>
        {choosingMeal && (
          <div id="log-meal-choices" className="k-chip-row" role="group" aria-labelledby="log-meal-label">
            {MEAL_CHOICES.map(choice => (
              <button
                key={choice}
                type="button"
                className={`k-chip is-${choice}`}
                aria-pressed={choice === mealType}
                onClick={() => { feel('select'); setMealType(choice); setChoosingMeal(false) }}
              >
                {MEAL_LABELS[choice]}
              </button>
            ))}
          </div>
        )}

        <div className="k-search">
          <span className="k-search-field">
            <IconSearch size={18} />
            <input
              id="log-meal-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search your meals, or type calories"
              aria-label="Search your foods, or type calories"
              aria-describedby="log-search-hint"
              autoComplete="off"
              inputMode="text"
            />
          </span>
          {query && <button type="button" className="k-text-button" onClick={() => setQuery('')}>Clear search</button>}
          <p id="log-search-hint" className="k-search-hint">A number on its own logs just the calories.</p>
        </div>

        {quickAddCalories !== null && (
          <button type="button" className="k-quick-add" onClick={() => commit(quickAddEntry(quickAddCalories), 'quick_add')}>
            <IconPlus size={18} />
            <span><strong>Quick add {quickAddCalories} kcal</strong><small>No food attached — the day still counts.</small></span>
          </button>
        )}

        {query.trim() === '' ? (
          hasShortcuts ? (
            <>
              {recents.length > 0 && favourites.length > 0 && (
                <div className="k-shelf" role="group" aria-label="Your meal shortcuts">
                  <button type="button" aria-pressed={activeShelf === 'recent'} onClick={() => setShelf('recent')}>
                    <IconHistory size={16} /> Recent
                  </button>
                  <button type="button" aria-pressed={activeShelf === 'favourite'} onClick={() => setShelf('favourite')}>
                    <IconStar size={16} /> Favourites
                  </button>
                </div>
              )}
              <p className="k-list-label">{activeShelf === 'recent' ? 'Recent · tap to log again' : 'Favourites · tap to log'}</p>
              <ul className="k-picks">
                {shelfItems.map(item => (
                  <PickRow
                    key={item.id}
                    item={item}
                    onPick={() => logAgain(item, shelfSource)}
                    onPortion={() => setPortionFor({ item, source: shelfSource })}
                  />
                ))}
              </ul>
              {activeShelf === 'recent' && recents.length > RECENT_PREVIEW && (
                <button type="button" className="k-text-button" aria-expanded={showAllRecents} onClick={() => setShowAllRecents(value => !value)}>
                  {showAllRecents ? 'Show fewer meals' : `Show ${recents.length - RECENT_PREVIEW} more`}
                </button>
              )}
            </>
          ) : (
            <p className="k-empty">Anything you log shows up here, so the second time takes one tap.</p>
          )
        ) : quickAddCalories !== null && matches.length === 0 ? null : (
          <>
            <p className="k-list-label">Matches</p>
            {matches.length > 0 ? (
              <ul className="k-picks">
                {matches.map(item => (
                  <PickRow
                    key={item.id}
                    item={item}
                    onPick={() => logAgain(item, 'search')}
                    onPortion={() => setPortionFor({ item, source: 'search' })}
                  />
                ))}
              </ul>
            ) : (
              <p className="k-empty">No recent or saved meals match “{query.trim()}”. Try one of the ways to log below.</p>
            )}
          </>
        )}

        <p className="k-list-label">More ways to log</p>
        <nav className="k-methods" aria-label="Other ways to log">
          {METHODS.map(({ to, short, hint, name, method, Icon, tone }) => (
            <Link key={to} to={to} state={{ mealType }} className={`k-method is-tone-${tone}`} onClick={() => selectLogMethod(method)}>
              <span className="k-method-icon" aria-hidden="true"><Icon size={22} /></span>
              <span className="k-method-text" aria-hidden="true"><strong>{short}</strong><small>{hint}</small></span>
              <span className="sr-only">{name}</span>
            </Link>
          ))}
        </nav>
      </Sheet>

      {portionFor && (
        <PortionSheet
          name={portionFor.item.name}
          calories={portionFor.item.calories}
          onPick={multiplier => {
            const { item, source } = portionFor
            setPortionFor(null)
            logAgain(item, source, multiplier)
          }}
          onClose={() => setPortionFor(null)}
        />
      )}
    </>
  )
}

function PickRow({
  item,
  onPick,
  onPortion,
}: {
  item: FoodEntry | SavedMeal
  onPick: () => void
  onPortion: () => void
}) {
  const hold = useLongPress(onPortion)
  return (
    <li className="k-pick">
      <button
        type="button"
        className="k-pick-log"
        onClick={() => { if (!hold.consumed()) onPick() }}
        {...hold.handlers}
      >
        <span className={`k-food-tile is-tone-${foodToneFor(item.name)}`}><FoodIcon emoji={item.emoji} name={item.name} size={20} /></span>
        <span className="k-pick-name">{item.name}</span>
        <span className="k-pick-kcal tabular">{Math.round(item.calories)} kcal</span>
        <span className="k-pick-plus" aria-hidden="true"><IconPlus size={16} /></span>
      </button>
      <button type="button" className="k-pick-portion" onClick={onPortion} aria-label={`Adjust portion for ${item.name}`}>
        Portion
      </button>
    </li>
  )
}
