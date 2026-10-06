import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PressableButton } from '../components/PressableButton'
import { useApp } from '../store/AppContext'
import type { MealType } from '../types'
import { MEAL_LABELS } from '../types'
import { BackLink } from '../components/BackLink'
import { clearLogDraft, hydrateLogDrafts, loadLogDrafts, logDraftClearGeneration, saveManualLogDraft } from '../lib/logDrafts'
import { manualFoodFieldErrors, validateManualFood, type FoodField } from '../lib/foodEntryValidation'
import { useAuth } from '../store/AuthContext'
import { defaultMealType } from '../lib/meals'
import { mascotEvent } from '../mascot/MascotOverlay'
import { LogFlowHeader, LoggingContextLine, RestoredDraftNotice } from '../components/LogFlowUI'
import { makeLogReceipt } from '../lib/logReceipt'
import { createOnceGuard } from '../lib/onceGuard'
import { useFeel } from '../hooks/useHaptic'
import { logContextFromNavState } from '../lib/logContext'
import { createPendingDraftWriter } from '../lib/pendingDraftWriter'
import type { ManualLogDraft } from '../lib/logDrafts'

export function ManualEntryPage() {
  const { state, addEntry } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const logContext = logContextFromNavState(location.state)
  const requestedSlot = logContext.mealType
  const userId = user?.sub ?? ''
  const [saved] = useState(() => loadLogDrafts(userId).manual)
  const initialMealType = requestedSlot ?? saved?.mealType ?? defaultMealType()
  const [name, setName] = useState(saved?.name ?? '')
  const [calories, setCalories] = useState(saved?.calories ?? '')
  const [protein, setProtein] = useState(saved?.protein ?? '')
  const [carbs, setCarbs] = useState(saved?.carbs ?? '')
  const [fat, setFat] = useState(saved?.fat ?? '')
  const [mealType, setMealType] = useState<MealType>(initialMealType)
  const [servings, setServings] = useState(saved?.servings ?? 1)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [restored, setRestored] = useState(Boolean(saved))
  const formRef = useRef<HTMLFormElement>(null)
  const edited = useRef(false)
  const initialRequestedSlot = useRef(requestedSlot)
  const draftWriter = useMemo(() => createPendingDraftWriter<Omit<ManualLogDraft, 'updatedAt'>>(
    draft => saveManualLogDraft(userId, draft),
    () => logDraftClearGeneration(userId, 'manual'),
  ), [userId])
  const [saveGuard] = useState(createOnceGuard)
  const feel = useFeel()

  useEffect(() => {
    let cancelled = false
    void hydrateLogDrafts(userId).then(() => {
      draftWriter.hydrated()
      const manual = loadLogDrafts(userId).manual
      if (cancelled || edited.current) return
      setName(manual?.name ?? '')
      setCalories(manual?.calories ?? '')
      setProtein(manual?.protein ?? '')
      setCarbs(manual?.carbs ?? '')
      setFat(manual?.fat ?? '')
      setMealType(initialRequestedSlot.current ?? manual?.mealType ?? defaultMealType())
      setServings(manual?.servings ?? 1)
      setRestored(Boolean(manual))
    }).finally(() => { draftWriter.hydrated() })
    return () => {
      cancelled = true
    }
  }, [draftWriter, userId])

  useEffect(() => {
    if (edited.current) draftWriter.edit({ name, calories, protein, carbs, fat, mealType, servings })
  }, [draftWriter, name, calories, protein, carbs, fat, mealType, servings])

  function startFresh() {
    edited.current = true
    draftWriter.discard()
    clearLogDraft(userId, 'manual')
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setMealType(requestedSlot ?? defaultMealType())
    setServings(1)
    setAttempted(false)
    setError(null)
    setRestored(false)
    formRef.current?.querySelector<HTMLInputElement>('#manual-name')?.focus()
  }

  function changeServings(next: number) {
    if (!Number.isFinite(next)) return
    const value = Math.min(1_000, Math.max(0.25, Math.round(next * 4) / 4))
    if (value === servings) return
    edited.current = true
    setServings(value)
  }

  const validated = validateManualFood({ name, calories, protein, carbs, fat, servings })
  const fieldErrors = manualFoodFieldErrors({ name, calories, protein, carbs, fat, servings })
  const scaledCalories = calories.trim() && !fieldErrors.calories && !fieldErrors.servings ? Math.round(Number(calories) * servings) : null
  const scaledProtein = validated.ok ? validated.value.protein : 0
  const scaledCarbs = validated.ok ? validated.value.carbs : 0
  const scaledFat = validated.ok ? validated.value.fat : 0

  function save() {
    saveGuard.run(() => {
      setAttempted(true)
      const result = validateManualFood({ name, calories, protein, carbs, fat, servings })
      if (!result.ok) {
        setError(result.error)
        const fields: FoodField[] = ['name', 'calories', 'protein', 'carbs', 'fat', 'servings']
        const firstError = fields.find(field => fieldErrors[field])
        if (firstError) formRef.current?.querySelector<HTMLInputElement>(`#manual-${firstError}`)?.focus()
        mascotEvent('form_fumble')
        saveGuard.reset()
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
      const receipt = makeLogReceipt(entry, state.gamification.awardedKeys.length)
      addEntry(entry)
      draftWriter.discard()
      clearLogDraft(userId, 'manual')
      navigate('/', { state: { justLogged: receipt } })
    })
  }

  return (
    <div className="app-shell k-screen k-flow">
      <main className="app-main">
        <BackLink onClick={() => navigate('/log', { state: { ...logContext, mealType } })} />
        <LogFlowHeader title="Jot it down." description="Enter the nutrition for one serving. We’ll calculate your total." />

        {restored && <RestoredDraftNotice onContinue={() => { edited.current = true; setRestored(false); formRef.current?.querySelector<HTMLInputElement>('#manual-name')?.focus() }} onStartFresh={startFresh} />}

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form ref={formRef} className="manual-entry-form" noValidate onChangeCapture={() => { edited.current = true }} onSubmit={event => { event.preventDefault(); save() }}>
        <div className="field">
          <label htmlFor="manual-name">Food name <span className="field-req">Required</span></label>
          <input
            id="manual-name"
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            maxLength={500}
            autoComplete="off"
            required
            aria-invalid={attempted && fieldErrors.name ? true : undefined}
            aria-describedby={attempted && fieldErrors.name ? 'manual-name-error' : undefined}
            placeholder="e.g. Protein shake"
          />
          {attempted && fieldErrors.name && <p id="manual-name-error" className="field-error">{fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="manual-calories">Calories <span>per serving</span> <span className="field-req">Required</span></label>
          <input
            id="manual-calories"
            type="number"
            inputMode="decimal"
            min="0"
            max="100000"
            step="any"
            required
            placeholder="0"
            value={calories}
            onChange={e => { setCalories(e.target.value); setError(null) }}
            aria-invalid={attempted && fieldErrors.calories ? true : undefined}
            aria-describedby={attempted && fieldErrors.calories ? 'manual-calories-error' : undefined}
          />
          {attempted && fieldErrors.calories && <p id="manual-calories-error" className="field-error">{fieldErrors.calories}</p>}
        </div>

        <fieldset className="manual-macros">
          <legend className="manual-macro-hint">Macros per serving <span>Optional</span></legend>
        <div className="review-grid">
          <div className="field">
            <label htmlFor="manual-protein">Protein (g)</label>
            <input id="manual-protein" type="number" inputMode="decimal" step="any" min="0" max="10000" value={protein} onChange={e => { setProtein(e.target.value); setError(null) }}
              aria-invalid={attempted && fieldErrors.protein ? true : undefined} aria-describedby={attempted && fieldErrors.protein ? 'manual-protein-error' : undefined} />
            {attempted && fieldErrors.protein && <p id="manual-protein-error" className="field-error">{fieldErrors.protein}</p>}
          </div>
          <div className="field">
            <label htmlFor="manual-carbs">Carbs (g)</label>
            <input id="manual-carbs" type="number" inputMode="decimal" step="any" min="0" max="10000" value={carbs} onChange={e => { setCarbs(e.target.value); setError(null) }}
              aria-invalid={attempted && fieldErrors.carbs ? true : undefined} aria-describedby={attempted && fieldErrors.carbs ? 'manual-carbs-error' : undefined} />
            {attempted && fieldErrors.carbs && <p id="manual-carbs-error" className="field-error">{fieldErrors.carbs}</p>}
          </div>
          <div className="field">
            <label htmlFor="manual-fat">Fat (g)</label>
            <input id="manual-fat" type="number" inputMode="decimal" step="any" min="0" max="10000" value={fat} onChange={e => { setFat(e.target.value); setError(null) }}
              aria-invalid={attempted && fieldErrors.fat ? true : undefined} aria-describedby={attempted && fieldErrors.fat ? 'manual-fat-error' : undefined} />
            {attempted && fieldErrors.fat && <p id="manual-fat-error" className="field-error">{fieldErrors.fat}</p>}
          </div>
        </div>
        </fieldset>

        {/* Serving size stepper */}
        <div className="serving-row">
          <span className="serving-label">Servings</span>
          <div className="serving-stepper">
            <button type="button" className="serving-btn" onClick={() => { if (servings > 0.25) feel('select'); changeServings(servings - 0.25) }} disabled={servings <= 0.25} aria-label="Decrease servings">−</button>
            <input
              id="manual-servings"
              className="serving-input"
              type="number"
              min="0.25"
              max="1000"
              step="0.25"
              value={servings}
              onChange={e => changeServings(Number(e.target.value))}
              aria-label="Servings"
              aria-invalid={attempted && fieldErrors.servings ? true : undefined}
              aria-describedby={attempted && fieldErrors.servings ? 'manual-servings-error' : undefined}
            />
            <button type="button" className="serving-btn" onClick={() => { if (servings < 1_000) feel('select'); changeServings(servings + 0.25) }} disabled={servings >= 1_000} aria-label="Increase servings">+</button>
          </div>
          <span className="serving-hint">{servings === 1 ? '1 serving' : `${servings} servings`}</span>
        </div>
        {attempted && fieldErrors.servings && <p id="manual-servings-error" className="field-error">{fieldErrors.servings}</p>}
        <p className="flow-portion-total">{scaledCalories === null ? 'Enter calories to see your portion total.' : <>Total for {servings} {servings === 1 ? 'serving' : 'servings'}: <strong>{scaledCalories.toLocaleString()} kcal</strong></>}</p>

        <div className="field">
          <span id="manual-meal-type">Meal type</span>
          <div className="chip-row" role="group" aria-labelledby="manual-meal-type">
            {(Object.keys(MEAL_LABELS) as MealType[]).map(m => (
              <button
                key={m}
                type="button"
                className={`chip${mealType === m ? ' active' : ''}`}
                onClick={() => {
                  if (mealType === m) return
                  feel('select')
                  edited.current = true
                  setMealType(m)
                  navigate(location.pathname, { replace: true, state: { ...logContext, mealType: m } })
                }}
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
        <LoggingContextLine mealType={mealType} />
        <PressableButton
          fullWidth
          label="Log meal"
          type="submit"
          cue={null}
        />
        </form>
      </main>
    </div>
  )
}
