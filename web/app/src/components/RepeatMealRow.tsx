import { useEffect, useId, useRef, useState } from 'react'
import { FoodIcon, IconMinus, IconPlus, IconStar } from './icons'
import { foodToneFor } from '../lib/foodGlyph'
import { useFeel } from '../hooks/useHaptic'
import { useLongPress } from '../hooks/useLongPress'
import { MEAL_LABELS, type FoodEntry, type MealType, type SavedMeal } from '../types'

/** The same portion and Log controls wherever a meal can be repeated. */
export function RepeatMealRow({ item, basis, mealType, onLog, onSave, saved = false, saveCue, onPortion, showNutrition = true, compact = false, portionMultiplier, onPortionChange }: {
  item: FoodEntry | SavedMeal
  basis: 'saved' | 'previous'
  mealType: MealType
  onLog: (multiplier: number) => void
  onSave?: () => void
  saved?: boolean
  /** A short local cue for a deliberate save that moved this row between groups. */
  saveCue?: number
  onPortion?: () => void
  showNutrition?: boolean
  /** A repeat shortcut whose shared sheet header already shows its destination. */
  compact?: boolean
  /** Keep a library selection when search or filtering temporarily removes its row. */
  portionMultiplier?: number
  onPortionChange?: (multiplier: number) => void
}) {
  const [localMultiplier, setLocalMultiplier] = useState(1)
  const multiplier = portionMultiplier ?? localMultiplier
  const [adjusting, setAdjusting] = useState(false)
  const [savePlay, setSavePlay] = useState(() => saved && saveCue ? saveCue : 0)
  const previousSaveCue = useRef(saveCue)
  const previousSaved = useRef(saved)
  const pendingSavePlay = useRef(false)
  const controlId = useId()
  const feel = useFeel()
  const hold = useLongPress(() => onPortion ? onPortion() : setAdjusting(true))
  const rounded = (value: number) => Math.round(value * multiplier * 10) / 10
  const macroCalories = Math.max(item.protein * 4 + item.carbs * 4 + item.fat * 9, 0.001)

  useEffect(() => {
    if (previousSaved.current === saved) return
    const wasSaved = previousSaved.current
    previousSaved.current = saved
    if (!wasSaved && saved && pendingSavePlay.current) setSavePlay(value => value + 1)
    pendingSavePlay.current = false
  }, [saved])

  useEffect(() => {
    if (previousSaveCue.current === saveCue) return
    previousSaveCue.current = saveCue
    if (saved && saveCue) setSavePlay(value => value + 1)
  }, [saved, saveCue])

  useEffect(() => {
    if (!savePlay) return
    const timeout = window.setTimeout(() => setSavePlay(0), 450)
    return () => window.clearTimeout(timeout)
  }, [savePlay])

  function changePortion(next: number) {
    const value = Math.max(0.25, Math.round(next * 4) / 4)
    if (value === multiplier) return
    feel('select')
    if (portionMultiplier === undefined) setLocalMultiplier(value)
    onPortionChange?.(value)
  }

  return <article className={`k-repeat-meal${compact ? ` is-compact${adjusting ? ' is-adjusting' : ''}` : ''}`} aria-label={item.name} aria-describedby={compact ? `${controlId}-context` : undefined}>
    <div className="k-repeat-main">
      <span className={`k-food-tile is-tone-${foodToneFor(item.name)}`} aria-hidden="true"><FoodIcon emoji={item.emoji} name={item.name} size={24} /></span>
      <div className="k-repeat-info">
        <h3 className="k-repeat-name">{item.name}</h3>
        <span className="k-repeat-kcal tabular">{Math.round(item.calories * multiplier)} kcal</span>
        {showNutrition && <>
          <p className="k-repeat-macros">Protein {rounded(item.protein)}g · Carbs {rounded(item.carbs)}g · Fat {rounded(item.fat)}g</p>
          <div className="discover-macro-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(0, item.protein * 4 / macroCalories) * 100}%`, background: 'var(--protein)' }} />
            <span style={{ width: `${Math.max(0, item.carbs * 4 / macroCalories) * 100}%`, background: 'var(--carbs)' }} />
            <span style={{ width: `${Math.max(0, item.fat * 9 / macroCalories) * 100}%`, background: 'var(--fat)' }} />
          </div>
        </>}
        <p className="k-repeat-basis">1× = your {basis === 'saved' ? 'saved' : 'previous'} meal{item.servingSizeGrams != null && item.servingSizeGrams > 0 ? ` · ${item.servingSizeGrams} g` : ''}</p>
      </div>
    </div>
    <div className="k-repeat-footer">
      <p id={`${controlId}-context`} className={`k-repeat-context${compact ? ' sr-only' : ''}`}>Logging to {MEAL_LABELS[mealType]} · Today</p>
      <div className="k-repeat-actions">
        <button type="button" data-action-play="select" className="k-repeat-portion k-text-button" aria-label={`Adjust portion for ${item.name}, currently ${multiplier} times your ${basis} meal`} aria-expanded={adjusting} aria-controls={controlId} onClick={() => setAdjusting(value => !value)}>
          {multiplier}× · Portion
        </button>
        {adjusting && <div className="serving-stepper-compact" id={controlId} role="group" aria-label={`Portion for ${item.name}`}>
          <button type="button" data-action-play="select" className="ssc-btn" onClick={() => changePortion(multiplier - 0.25)} disabled={multiplier <= 0.25} aria-label={`Decrease portion for ${item.name}`}><IconMinus size={13} strokeWidth={2.6} /></button>
          <span className="ssc-val" aria-live="polite">{multiplier}×</span>
          <button type="button" data-action-play="select" className="ssc-btn" onClick={() => changePortion(multiplier + 0.25)} aria-label={`Increase portion for ${item.name}`}><IconPlus size={13} strokeWidth={2.6} /></button>
        </div>}
        <button type="button" data-action-play="submit" className="k-repeat-log" aria-label={`Log ${item.name}, ${multiplier} times your ${basis} meal to ${MEAL_LABELS[mealType]}`} onClick={() => { if (!hold.consumed()) onLog(multiplier) }} {...hold.handlers}>Log</button>
        {onSave && <button type="button" data-action-play={saved ? 'remove' : 'save'} data-action-play-part="none" className={`star-btn${saved ? ' active' : ''}`} aria-label={saved ? `Remove ${item.name} from Saved` : `Save ${item.name}`} aria-pressed={saved} onClick={() => { pendingSavePlay.current = !saved; feel('select'); onSave() }}><span key={savePlay} className={`k-save-star${savePlay ? ' has-played' : ''}`} aria-hidden="true"><IconStar active={saved} size={17} /></span></button>}
      </div>
    </div>
  </article>
}
