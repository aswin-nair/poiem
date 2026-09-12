import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { BackLink } from '../components/BackLink'
import { IconCheck, IconChevronDown, IconPlus, IconTrash } from '../components/icons'
import { EstimateNote, FlowFeedback, LogFlowHeader } from '../components/LogFlowUI'
import { MealNameField, MealTotals, MealTypePicker, NutritionFields, PortionControl } from '../components/MealEntryFields'
import { normalizeServings, scaleFoodAnalysis } from '../lib/mealReview'
import type { FoodAnalysis, FoodSource, MealType } from '../types'
import { MEAL_LABELS } from '../types'
import { clearLogDraft, hydrateLogDrafts, loadLogDrafts, saveReviewLogDraft, type ReviewNumericField } from '../lib/logDrafts'
import { reviewFoodIssue } from '../lib/foodEntryValidation'
import { useAuth } from '../store/AuthContext'
import { sourceToMethod, track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { defaultMealType } from '../lib/meals'

export function ReviewFoodPage() {
  const {
    pendingAnalysis,
    setPendingAnalysis,
    pendingImagePreview,
    setPendingImagePreview,
    addEntry,
    pendingSource,
  } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.sub ?? ''
  const saved = loadLogDrafts(userId).review
  const initialAnalysis = pendingAnalysis ?? saved?.analysis ?? null
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(initialAnalysis)
  const [mealType, setMealType] = useState<MealType>(pendingAnalysis ? defaultMealType() : (saved?.mealType ?? defaultMealType()))
  const [servings, setServings] = useState(pendingAnalysis ? 1 : (saved?.servings ?? 1))
  const [source, setSource] = useState<FoodSource>(pendingAnalysis ? pendingSource : (saved?.source ?? pendingSource))
  const [emptyNumericFields, setEmptyNumericFields] = useState<Set<ReviewNumericField>>(
    () => new Set(pendingAnalysis ? [] : (saved?.emptyNumericFields ?? [])),
  )
  const [error, setError] = useState<string | null>(null)
  const baseRef = useRef<FoodAnalysis | null>(pendingAnalysis ?? saved?.baseAnalysis ?? null)
  const [loadingDraft, setLoadingDraft] = useState(!initialAnalysis)
  const saving = useRef(false)
  const reviewTracked = useRef(false)
  const correctionTracked = useRef(false)

  useEffect(() => {
    if (pendingAnalysis || analysis) return
    let cancelled = false
    void hydrateLogDrafts(userId).then(drafts => {
      const review = drafts.review
      if (cancelled || !review) return
      setSource(review.source)
      setMealType(review.mealType)
      setServings(review.servings)
      setEmptyNumericFields(new Set(review.emptyNumericFields))
      baseRef.current = review.baseAnalysis
      setAnalysis(review.analysis)
    }).finally(() => { if (!cancelled) setLoadingDraft(false) })
    return () => {
      cancelled = true
    }
  }, [analysis, pendingAnalysis, userId])

  useEffect(() => {
    if (!analysis || !baseRef.current) return
    saveReviewLogDraft(userId, {
      analysis,
      baseAnalysis: baseRef.current,
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
    <BackLink to="/log" />
    {loadingDraft ? <p role="status">Restoring your review…</p> : <>
      <LogFlowHeader title="Let’s start with a meal." description="There isn’t an estimate to review yet. Choose how you’d like to add one." />
      <PressableButton to="/log" label="Choose a logging method" />
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

  function save() {
    if (!analysis || saving.current) return
    const issue = reviewFoodIssue(analysis, emptyNumericFields)
    if (issue) {
      setError(issue)
      return
    }
    saving.current = true
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
    addEntry(entry)
    setPendingAnalysis(null)
    setPendingImagePreview(null)
    clearLogDraft(userId, 'review')
    navigate('/', { state: { justLogged: { id: entry.id, calories: cals, name: analysis.name } } })
  }

  function discard() {
    if (!window.confirm('Discard this estimate and start a new meal?')) return
    setPendingAnalysis(null)
    setPendingImagePreview(null)
    clearLogDraft(userId, 'review')
    navigate('/log')
  }

  const issue = reviewFoodIssue(analysis, emptyNumericFields)
  const nutrition = {
    calories: emptyNumericFields.has('calories') ? '' : analysis.calories,
    protein: emptyNumericFields.has('protein') ? '' : analysis.protein,
    carbs: emptyNumericFields.has('carbs') ? '' : analysis.carbs,
    fat: emptyNumericFields.has('fat') ? '' : analysis.fat,
  }

  return (
    <div className="app-shell k-screen k-flow k-flow-wide">
      <main className="app-main">
        <BackLink onClick={discard} label="Start over" />
        <LogFlowHeader step={2} title="Make it your meal." description="The estimate is a starting point. You’re in charge of the final details." />
        <EstimateNote />
        {error && <FlowFeedback message={error} error />}
        <form className="flow-review-layout" noValidate onSubmit={event => { event.preventDefault(); save() }}>
          <div className="flow-review-editor">
            <MealNameField name={analysis.name} emoji={analysis.emoji} onChange={value => update('name', value)} />
            <PortionControl value={servings} grams={analysis.servingSizeGrams} onChange={changeServings} />
            <NutritionFields values={nutrition} onChange={updateNumeric} />
            <MealTypePicker value={mealType} onChange={value => { markCorrected(); setMealType(value) }} />
          </div>
          <div className="flow-review-side">
            {source === 'snapFood' && pendingImagePreview && <figure className="flow-photo-evidence">
              <img src={pendingImagePreview} alt="Meal photo being reviewed" />
              <figcaption>Original photo · only kept for this review</figcaption>
            </figure>}
            <div className="flow-review-summary">
              {!issue ? <MealTotals name={analysis.name} calories={analysis.calories} mealType={mealType} servings={servings} />
                : <p className="flow-summary-hint">Fill in the meal details to see your final total here.</p>}
              <PressableButton fullWidth type="submit"><IconPlus size={20} /> Log meal</PressableButton>
              <p className="flow-save-hint"><IconCheck size={18} /> Logs to {MEAL_LABELS[mealType].toLowerCase()} today. You can edit it later.</p>
            </div>
            {analysis.ingredients && analysis.ingredients.length > 0 && <details className="flow-breakdown">
              <summary>Inside the estimate <span>{analysis.ingredients.length} items</span><IconChevronDown size={18} /></summary>
              <ul>{analysis.ingredients.map((ingredient, index) => <li key={index}>
                <div><strong>{ingredient.item}</strong><span>{Math.round(ingredient.grams)} g</span></div>
                <span>{Math.round(ingredient.calories)} kcal</span>
              </li>)}</ul>
              <p>Editing nutrition totals removes this breakdown so the original estimate isn’t mistaken for your changes.</p>
            </details>}
            <button type="button" className="flow-text-action" onClick={discard}><IconTrash size={18} /> Discard estimate</button>
          </div>
        </form>
      </main>
    </div>
  )
}
