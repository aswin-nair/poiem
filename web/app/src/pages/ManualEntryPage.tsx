import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PressableButton } from '../components/PressableButton'
import { useApp } from '../store/AppContext'
import type { MealType } from '../types'
import { MEAL_LABELS } from '../types'
import { BackLink } from '../components/BackLink'
import { clearLogDraft, hydrateLogDrafts, loadLogDrafts, saveManualLogDraft } from '../lib/logDrafts'
import { validateManualFood } from '../lib/foodEntryValidation'
import { useAuth } from '../store/AuthContext'
import { defaultMealType } from '../lib/meals'
import { mascotEvent } from '../mascot/MascotOverlay'

export function ManualEntryPage() {
  const { addEntry } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const requestedSlot = (useLocation().state as { mealType?: MealType } | null)?.mealType
  const userId = user?.sub ?? ''
  const saved = loadLogDrafts(userId).manual
  const initialMealType = requestedSlot ?? saved?.mealType ?? defaultMealType()
  const [name, setName] = useState(saved?.name ?? '')
  const [calories, setCalories] = useState(saved?.calories ?? '')
  const [protein, setProtein] = useState(saved?.protein ?? '')
  const [carbs, setCarbs] = useState(saved?.carbs ?? '')
  const [fat, setFat] = useState(saved?.fat ?? '')
  const [mealType, setMealType] = useState<MealType>(initialMealType)
  const [servings, setServings] = useState(saved?.servings ?? 1)
  const [error, setError] = useState<string | null>(null)
  const edited = useRef(false)

  useEffect(() => {
    let cancelled = false
    void hydrateLogDrafts(userId).then(drafts => {
      const manual = drafts.manual
      if (cancelled || edited.current || !manual) return
      setName(current => current || manual.name)
      setCalories(current => current || manual.calories)
      setProtein(current => current || manual.protein)
      setCarbs(current => current || manual.carbs)
      setFat(current => current || manual.fat)
      setMealType(current => current === defaultMealType() ? manual.mealType : current)
      setServings(current => current === 1 ? manual.servings : current)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    saveManualLogDraft(userId, { name, calories, protein, carbs, fat, mealType, servings })
  }, [userId, name, calories, protein, carbs, fat, mealType, servings])

  function changeServings(next: number) {
    if (!Number.isFinite(next)) return
    edited.current = true
    setServings(Math.min(1_000, Math.max(0.25, Math.round(next * 4) / 4)))
  }

  const validated = validateManualFood({ name, calories, protein, carbs, fat, servings })
  const scaledCalories = validated.ok ? validated.value.calories : 0
  const scaledProtein = validated.ok ? validated.value.protein : 0
  const scaledCarbs = validated.ok ? validated.value.carbs : 0
  const scaledFat = validated.ok ? validated.value.fat : 0

  function save() {
    const result = validateManualFood({ name, calories, protein, carbs, fat, servings })
    if (!result.ok) {
      setError(result.error)
      mascotEvent('form_fumble')
      return
    }
    const entry = {
      id: crypto.randomUUID(),
      name: result.value.name,
      calories: result.value.calories,
      protein: result.value.protein,
      carbs: result.value.carbs,
      fat: result.value.fat,
      timestamp: new Date().toISOString(),
      emoji: '🍽️',
      source: 'manual',
      mealType,
    } as const
    addEntry(entry)
    clearLogDraft(userId, 'manual')
    navigate('/', { state: { justLogged: { id: entry.id, calories: entry.calories, name: entry.name } } })
  }

  return (
    <div className="app-shell manual-refresh poster-ui">
      <main className="app-main motion-stagger">
        <BackLink to="/log" />
        <header className="manual-heading">
          <h1 className="page-title">Manual entry</h1>
          <p className="page-sub">Enter the nutrition for one serving. We’ll calculate your total.</p>
        </header>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form className="manual-entry-form" noValidate onChangeCapture={() => { edited.current = true }} onSubmit={event => { event.preventDefault(); save() }}>
        <div className="field">
          <label htmlFor="manual-name">Food name</label>
          <input
            id="manual-name"
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            maxLength={500}
            autoComplete="off"
            required
            placeholder="e.g. Protein shake"
          />
        </div>

        <div className="field">
          <label htmlFor="manual-calories">Calories <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}>per serving</span></label>
          <input id="manual-calories" type="number" inputMode="decimal" min="0" max="100000" step="any" required placeholder="0" value={calories} onChange={e => { setCalories(e.target.value); setError(null) }} />
        </div>

        <p className="manual-macro-hint">Macros per serving <span>Optional</span></p>
        <div className="review-grid">
          <div className="field">
            <label htmlFor="manual-protein">Protein (g)</label>
            <input id="manual-protein" type="number" inputMode="decimal" step="any" min="0" max="10000" value={protein} onChange={e => { setProtein(e.target.value); setError(null) }} />
          </div>
          <div className="field">
            <label htmlFor="manual-carbs">Carbs (g)</label>
            <input id="manual-carbs" type="number" inputMode="decimal" step="any" min="0" max="10000" value={carbs} onChange={e => { setCarbs(e.target.value); setError(null) }} />
          </div>
          <div className="field">
            <label htmlFor="manual-fat">Fat (g)</label>
            <input id="manual-fat" type="number" inputMode="decimal" step="any" min="0" max="10000" value={fat} onChange={e => { setFat(e.target.value); setError(null) }} />
          </div>
        </div>

        {/* Serving size stepper */}
        <div className="serving-row">
          <span className="serving-label">Servings</span>
          <div className="serving-stepper">
            <button type="button" className="serving-btn" onClick={() => changeServings(servings - 0.25)} disabled={servings <= 0.25} aria-label="Decrease servings">−</button>
            <input
              className="serving-input"
              type="number"
              min="0.25"
              max="1000"
              step="0.25"
              value={servings}
              onChange={e => changeServings(Number(e.target.value))}
              aria-label="Servings"
            />
            <button type="button" className="serving-btn" onClick={() => changeServings(servings + 0.25)} aria-label="Increase servings">+</button>
          </div>
          <span className="serving-hint">{servings === 1 ? '1 serving' : `${servings} servings`}</span>
        </div>

        <div className="field">
          <span id="manual-meal-type">Meal type</span>
          <div className="chip-row" role="group" aria-labelledby="manual-meal-type">
            {(Object.keys(MEAL_LABELS) as MealType[]).map(m => (
              <button
                key={m}
                type="button"
                className={`chip${mealType === m ? ' active' : ''}`}
                onClick={() => { edited.current = true; setMealType(m) }}
                aria-pressed={mealType === m}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {validated.ok && (
          <section className="manual-summary" aria-label="Meal total">
            <div><span>Ready to log</span><strong>{scaledCalories} kcal</strong></div>
            <p>{servings} {servings === 1 ? 'serving' : 'servings'} · {MEAL_LABELS[mealType]}</p>
            {(protein || carbs || fat) && <p>Protein {scaledProtein}g · Carbs {scaledCarbs}g · Fat {scaledFat}g</p>}
          </section>
        )}
        <PressableButton
          fullWidth
          label="Log meal"
          type="submit"
          disabled={!name.trim() || !calories}
        />
        </form>
      </main>
    </div>
  )
}
