import { useId, useState } from 'react'
import { FoodIcon, IconMinus, IconPlus, IconStar } from './icons'
import { foodToneFor } from '../lib/foodGlyph'
import { useFeel } from '../hooks/useHaptic'
import { useLongPress } from '../hooks/useLongPress'
import { MEAL_LABELS, type FoodEntry, type MealType, type SavedMeal } from '../types'

/** The same portion and Log controls wherever a meal can be repeated. */
export function RepeatMealRow({ item, basis, mealType, onLog, onSave, saved = false, onPortion, showNutrition = true }: {
  item: FoodEntry | SavedMeal
  basis: 'saved' | 'previous'
  mealType: MealType
  onLog: (multiplier: number) => void
  onSave?: () => void
  saved?: boolean
  onPortion?: () => void
  showNutrition?: boolean
}) {
  const [multiplier, setMultiplier] = useState(1)
  const [adjusting, setAdjusting] = useState(false)
  const controlId = useId()
  const feel = useFeel()
  const hold = useLongPress(() => onPortion ? onPortion() : setAdjusting(true))
  const rounded = (value: number) => Math.round(value * multiplier * 10) / 10
  const macroCalories = Math.max(item.protein * 4 + item.carbs * 4 + item.fat * 9, 0.001)

  function changePortion(next: number) {
    const value = Math.max(0.25, Math.round(next * 4) / 4)
    if (value === multiplier) return
    feel('select')
    setMultiplier(value)
  }

  return <article className="k-repeat-meal" aria-label={item.name}>
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
      <p className="k-repeat-context">Logging to {MEAL_LABELS[mealType]} · Today</p>
      <div className="k-repeat-actions">
        <button type="button" className="k-repeat-portion k-text-button" aria-label={`Adjust portion for ${item.name}, currently ${multiplier} times your ${basis} meal`} aria-expanded={adjusting} aria-controls={controlId} onClick={() => setAdjusting(value => !value)}>
          {multiplier}× · Portion
        </button>
        {adjusting && <div className="serving-stepper-compact" id={controlId} role="group" aria-label={`Portion for ${item.name}`}>
          <button type="button" className="ssc-btn" onClick={() => changePortion(multiplier - 0.25)} disabled={multiplier <= 0.25} aria-label={`Decrease portion for ${item.name}`}><IconMinus size={13} strokeWidth={2.6} /></button>
          <span className="ssc-val" aria-live="polite">{multiplier}×</span>
          <button type="button" className="ssc-btn" onClick={() => changePortion(multiplier + 0.25)} aria-label={`Increase portion for ${item.name}`}><IconPlus size={13} strokeWidth={2.6} /></button>
        </div>}
        <button type="button" className="log-pill-btn" aria-label={`Log ${item.name}, ${multiplier} times your ${basis} meal to ${MEAL_LABELS[mealType]}`} onClick={() => { if (!hold.consumed()) onLog(multiplier) }} {...hold.handlers}>Log</button>
        {onSave && <button type="button" className={`star-btn${saved ? ' active' : ''}`} aria-label={saved ? `Remove ${item.name} from Saved` : `Save ${item.name}`} aria-pressed={saved} onClick={() => { feel('select'); onSave() }}><IconStar active={saved} size={17} /></button>}
      </div>
    </div>
  </article>
}
