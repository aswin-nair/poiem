import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { BackLink } from '../components/BackLink'
import { IconChevronDown, IconPlus, IconTrash } from '../components/icons'
import { EstimateNote, FlowFeedback, LogFlowHeader, LoggingContextLine, RestoredDraftNotice } from '../components/LogFlowUI'
import { MealNameField, MealTotals, MealTypePicker, NutritionFields, PortionControl } from '../components/MealEntryFields'
import { normalizeServings, resetFoodAnalysisField, scaleFoodAnalysis } from '../lib/mealReview'
import type { FoodAnalysis, FoodSource, MealType } from '../types'
import { clearLogDraft, hydrateLogDrafts, loadLogDrafts, saveReviewLogDraft, type ReviewNumericField } from '../lib/logDrafts'
import { reviewFoodFieldErrors, reviewFoodIssue, type FoodField, type FoodFieldErrors } from '../lib/foodEntryValidation'
import { useAuth } from '../store/AuthContext'
import { sourceToMethod, track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { defaultMealType } from '../lib/meals'
import { logContextFromNavState } from '../lib/logContext'
import { makeLogReceipt } from '../lib/logReceipt'
import { createOnceGuard } from '../lib/onceGuard'

/** Keep the confirmation in the document when a keyboard leaves little room. */
function useReviewKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    function update() {
      const viewport = window.visualViewport
      const keyboardInset = viewport ? window.innerHeight - viewport.height : 0
      setKeyboardOpen(window.innerWidth < 768 && (keyboardInset > 120 || (viewport?.height ?? window.innerHeight) < 500))
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])
  return keyboardOpen
}

export function ReviewFoodPage() {
  const {
    state,
    pendingAnalysis,
    setPendingAnalysis,
    pendingImagePreview,
    setPendingImagePreview,
    addEntry,
    pendingSource,
  } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const logContext = logContextFromNavState(location.state)
  const { firstMeal } = logContext
  const requestedSlot = logContext.mealType
  const userId = user?.sub ?? ''
  const saved = loadLogDrafts(userId).review
  const initialAnalysis = pendingAnalysis ?? saved?.analysis ?? null
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(initialAnalysis)
  const [mealType, setMealType] = useState<MealType>(requestedSlot ?? (pendingAnalysis ? defaultMealType() : (saved?.mealType ?? defaultMealType())))
  const [servings, setServings] = useState(pendingAnalysis ? 1 : (saved?.servings ?? 1))
  const [source, setSource] = useState<FoodSource>(pendingAnalysis ? pendingSource : (saved?.source ?? pendingSource))
  const [emptyNumericFields, setEmptyNumericFields] = useState<Set<ReviewNumericField>>(
    () => new Set(pendingAnalysis ? [] : (saved?.emptyNumericFields ?? [])),
  )
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [restored, setRestored] = useState(!pendingAnalysis && Boolean(saved))
  const formRef = useRef<HTMLFormElement>(null)
  const baseRef = useRef<FoodAnalysis | null>(pendingAnalysis ?? saved?.baseAnalysis ?? null)
  // Legacy drafts cannot recover the pre-correction model estimate truthfully.
  const originalRef = useRef<FoodAnalysis | null>(pendingAnalysis ?? saved?.originalAnalysis ?? null)
  const keyboardOpen = useReviewKeyboard()
  const [loadingDraft, setLoadingDraft] = useState(!initialAnalysis)
  const [saveGuard] = useState(createOnceGuard)
  const reviewTracked = useRef(false)
  const correctionTracked = useRef(false)

  useEffect(() => {
    if (pendingAnalysis || analysis) return
    let cancelled = false
    void hydrateLogDrafts(userId).then(drafts => {
      const review = drafts.review
      if (cancelled || !review) return
      setSource(review.source)
      setMealType(requestedSlot ?? review.mealType)
      setServings(review.servings)
      setEmptyNumericFields(new Set(review.emptyNumericFields))
      baseRef.current = review.baseAnalysis
      originalRef.current = review.originalAnalysis ?? null
      setAnalysis(review.analysis)
      setRestored(true)
    }).finally(() => { if (!cancelled) setLoadingDraft(false) })
    return () => {
      cancelled = true
    }
  }, [analysis, pendingAnalysis, requestedSlot, userId])

  useEffect(() => {
    if (!analysis || !baseRef.current) return
    saveReviewLogDraft(userId, {
      analysis,
      baseAnalysis: baseRef.current,
      ...(originalRef.current ? { originalAnalysis: originalRef.current } : {}),
      mealType,
      servings,
      source,
      emptyNumericFields: [...emptyNumericFields],
    })
  }, [analysis, emptyNumericFields, mealType, servings, source, userId])

  useEffect(() => {
    if (!analysis || reviewTracked.current) return
    reviewTracked.current = true
    track({ name: 'entry_reviewed', method: sourceToMethod(source) })
  }, [analysis, source])

  if (!analysis) return <div className="app-shell k-screen k-flow"><main className="app-main">
    <BackLink onClick={() => navigate('/log', { state: logContext })} />
    {loadingDraft ? <p role="status">Restoring your review…</p> : <>
      <LogFlowHeader title="Let’s start with a meal." description="There isn’t an estimate to review yet. Choose how you’d like to add one." />
      <PressableButton label="Choose a logging method" onClick={() => navigate('/log', { state: logContext })} />
    </>}
  </main></div>

  function markCorrected() {
    if (correctionTracked.current) return
    correctionTracked.current = true
    track({ name: 'entry_corrected', method: sourceToMethod(source) })
  }

  function update(field: keyof FoodAnalysis, value: string | number) {
    markCorrected()
    setError(null)
    setAnalysis(a => a ? { ...a, [field]: value } : a)
    if (baseRef.current) {
      baseRef.current = { ...baseRef.current, [field]: value }
    }
  }

  function updateNumeric(field: ReviewNumericField, raw: string) {
    markCorrected()
    setError(null)
    const empty = raw.trim() === ''
    setEmptyNumericFields(current => {
      const next = new Set(current)
      if (empty) next.add(field)
      else next.delete(field)
      return next
    })
    const value = empty ? 0 : Number(raw)
    if (!Number.isFinite(value)) return
    setAnalysis(current => current ? { ...current, [field]: value, ingredients: undefined } : current)
    if (baseRef.current) baseRef.current = { ...baseRef.current, [field]: value / servings, ingredients: undefined }
  }

  function changeServings(next: number) {
    if (!Number.isFinite(next)) return
    markCorrected()
    setError(null)
    const s = normalizeServings(next)
    setServings(s)
    if (!baseRef.current) return
    const base = baseRef.current
    setAnalysis(current => current ? scaleFoodAnalysis(base, s, current) : current)
  }

  function resetNumeric(field: ReviewNumericField) {
    if (!analysis || !baseRef.current || !originalRef.current) return
    const reset = resetFoodAnalysisField(originalRef.current, baseRef.current, analysis, servings, field)
    baseRef.current = reset.base
    setAnalysis(reset.analysis)
    setEmptyNumericFields(current => {
      const next = new Set(current)
      next.delete(field)
      return next
    })
    setError(null)
    // Reset stays in the editing flow even when its button disappears.
    formRef.current?.querySelector<HTMLInputElement>(`[data-food-field="${field}"]`)?.focus()
  }

  function save() {
    if (!analysis) return
    saveGuard.run(() => {
      setAttempted(true)
      const issue = reviewFoodIssue(analysis, emptyNumericFields)
      if (issue) {
        setError(issue)
        const errors = reviewFoodFieldErrors(analysis, emptyNumericFields)
        const fields: FoodField[] = ['name', 'calories', 'protein', 'carbs', 'fat', 'servings']
        const firstError = fields.find(field => errors[field])
        if (firstError) formRef.current?.querySelector<HTMLInputElement>(`[data-food-field="${firstError}"]`)?.focus()
        saveGuard.reset()
        return
      }
      const cals = Math.round(Number(analysis.calories))
      const entry = {
        id: crypto.randomUUID(),
        name: analysis.name.trim(),
        calories: cals,
        protein: Number(analysis.protein),
        carbs: Number(analysis.carbs),
        fat: Number(analysis.fat),
        timestamp: new Date().toISOString(),
        emoji: analysis.emoji,
        source,
        mealType,
        servingSizeGrams: analysis.servingSizeGrams,
        ingredients: analysis.ingredients,
        detailAdded: source === 'snapFood' || correctionTracked.current,
      } as const
      const receipt = makeLogReceipt(entry, state.gamification.awardedKeys.length)
      addEntry(entry)
      setPendingAnalysis(null)
      setPendingImagePreview(null)
      clearLogDraft(userId, 'review')
      navigate('/', { state: { justLogged: receipt } })
    })
  }

  function discard(confirm = true) {
    if (confirm && !window.confirm('Discard this estimate and start a new meal?')) return
    setPendingAnalysis(null)
    setPendingImagePreview(null)
    clearLogDraft(userId, 'review')
    navigate('/log', { state: { ...logContext, mealType } })
  }

  const issue = reviewFoodIssue(analysis, emptyNumericFields)
  const fieldErrors: FoodFieldErrors = attempted ? reviewFoodFieldErrors(analysis, emptyNumericFields) : {}
  const nutrition = {
    calories: emptyNumericFields.has('calories') ? '' : analysis.calories,
    protein: emptyNumericFields.has('protein') ? '' : analysis.protein,
    carbs: emptyNumericFields.has('carbs') ? '' : analysis.carbs,
    fat: emptyNumericFields.has('fat') ? '' : analysis.fat,
  }
  const adjusted = new Set<ReviewNumericField>()
  if (originalRef.current && baseRef.current) {
    for (const field of ['calories', 'protein', 'carbs', 'fat'] as const) {
      if (emptyNumericFields.has(field) || Math.abs(baseRef.current[field] - originalRef.current[field]) > 0.000001) adjusted.add(field)
    }
  }

  return (
    <div className={`app-shell k-screen k-flow k-flow-wide k-meal-review${keyboardOpen ? ' has-review-keyboard' : ''}`}>
      <main className="app-main">
        <BackLink onClick={() => discard()} label="Start over" />
        <LogFlowHeader
          step={2}
          title={firstMeal ? 'Check your first meal.' : 'Make it your meal.'}
          description={firstMeal
            ? 'Poiem guessed from your photo or description. Change anything that doesn’t match, then save. Momo will celebrate with you.'
            : 'The estimate is a starting point. You’re in charge of the final details.'}
        />
        {restored && <RestoredDraftNotice onContinue={() => { setRestored(false); formRef.current?.querySelector<HTMLInputElement>('[data-food-field="name"]')?.focus() }} onStartFresh={() => discard(false)} />}
        <EstimateNote firstMeal={firstMeal} />
        {error && <FlowFeedback message={error} error focus={false} />}
        <form ref={formRef} className="flow-review-layout" noValidate onSubmit={event => { event.preventDefault(); save() }}>
          <div className="flow-review-editor">
            <MealNameField name={analysis.name} emoji={analysis.emoji} onChange={value => update('name', value)} error={fieldErrors.name} />
            <PortionControl value={servings} grams={analysis.servingSizeGrams} onChange={changeServings} error={fieldErrors.servings}
              calories={!emptyNumericFields.has('calories') && analysis.calories <= 100_000 ? analysis.calories : undefined} />
            <NutritionFields values={nutrition} onChange={updateNumeric} errors={fieldErrors}
              corrections={originalRef.current ? { adjusted, onReset: resetNumeric } : undefined} />
            {!originalRef.current && <p className="flow-field-hint k-review-legacy-note">This older draft keeps your changes. Its original estimate isn’t available to reset.</p>}
            <MealTypePicker value={mealType} onChange={value => {
              markCorrected()
              setMealType(value)
              navigate(location.pathname, { replace: true, state: { ...logContext, mealType: value } })
            }} />
          </div>
          <div className="flow-review-side">
            {source === 'snapFood' && pendingImagePreview && <figure className="flow-photo-evidence">
              <img src={pendingImagePreview} alt="Meal photo being reviewed" />
              <figcaption>Original photo · only kept for this review</figcaption>
            </figure>}
            <div className="flow-review-summary">
              {!issue ? <MealTotals name={analysis.name} calories={analysis.calories} mealType={mealType} servings={servings} />
                : <p className="flow-summary-hint">Fill in the meal details to see your final total here.</p>}
              {!issue && <dl className="k-review-final-macros" aria-label="Final macronutrients">
                <div><dt>Protein</dt><dd>{analysis.protein} g</dd></div>
                <div><dt>Carbs</dt><dd>{analysis.carbs} g</dd></div>
                <div><dt>Fat</dt><dd>{analysis.fat} g</dd></div>
              </dl>}
              <LoggingContextLine mealType={mealType} />
              <p className="flow-save-hint">You can edit it later from Today.</p>
            </div>
            <div className="k-review-confirm" role="region" aria-label="Final meal confirmation">
              <div className="k-review-confirm-total">{!issue
                ? <><strong>{Math.round(analysis.calories).toLocaleString()} <small>kcal</small></strong><span>{servings}× portion · {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</span></>
                : <><strong>Check details</strong><span>Your changes are kept.</span></>}
              </div>
              <PressableButton fullWidth type="submit" cue={null}><IconPlus size={20} /> Log meal</PressableButton>
            </div>
            {analysis.ingredients && analysis.ingredients.length > 0 && <details className="flow-breakdown">
              <summary>Inside the estimate <span>{analysis.ingredients.length} items</span><IconChevronDown size={18} /></summary>
              <ul>{analysis.ingredients.map((ingredient, index) => <li key={index}>
                <div><strong>{ingredient.item}</strong><span>{Math.round(ingredient.grams)} g</span></div>
                <span>{Math.round(ingredient.calories)} kcal</span>
              </li>)}</ul>
              <p>Editing nutrition totals removes this breakdown so the original estimate isn’t mistaken for your changes.</p>
            </details>}
            <button type="button" className="flow-text-action" onClick={() => discard()}><IconTrash size={18} /> Discard estimate</button>
          </div>
        </form>
      </main>
    </div>
  )
}
