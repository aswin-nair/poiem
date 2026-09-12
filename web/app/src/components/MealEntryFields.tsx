import { useEffect, useId, useState } from 'react'
import type { MealType } from '../types'
import { MEAL_LABELS } from '../types'
import { FoodIcon, IconBreakfast, IconCarbs, IconDinner, IconEdit, IconLunch, IconMeal, IconMinus, IconPlus, IconProtein, IconWater } from './icons'
import { normalizeServings } from '../lib/mealReview'
import { foodToneFor } from '../lib/foodGlyph'

const NUTRITION_FIELDS = ['calories', 'protein', 'carbs', 'fat'] as const
export type NutritionField = typeof NUTRITION_FIELDS[number]
export type NutritionValues = Record<NutritionField, string | number>
const MACROS = [
  { key: 'protein', label: 'Protein', Icon: IconProtein },
  { key: 'carbs', label: 'Carbs', Icon: IconCarbs },
  { key: 'fat', label: 'Fat', Icon: IconWater },
] as const
const MEAL_ICONS = { breakfast: IconBreakfast, lunch: IconLunch, dinner: IconDinner, snack: IconCarbs, other: IconMeal }

export function MealNameField({ name, emoji, onChange }: { name: string; emoji?: string; onChange: (value: string) => void }) {
  const id = useId()
  return <div className="flow-meal-name">
    <span className={`flow-food-sticker is-tone-${foodToneFor(name)}`}><FoodIcon emoji={emoji} name={name} size={30} /></span>
    <div><label htmlFor={id}>Food name <IconEdit size={16} /></label>
      <input id={id} value={name} onChange={event => onChange(event.target.value)} maxLength={500} required autoComplete="off" />
    </div>
  </div>
}

export function NutritionFields({ values, onChange, optionalMacros = false }: {
  values: NutritionValues; onChange: (field: NutritionField, value: string) => void; optionalMacros?: boolean
}) {
  const id = useId()
  return <fieldset className="flow-nutrition">
    <legend>Nutrition total</legend>
    <p id={`${id}-hint`} className="flow-field-hint">For the whole portion you’re logging.{optionalMacros ? ' Blank macros are saved as 0 g.' : ' All four values are editable.'}</p>
    <label className="flow-calories" htmlFor={`${id}-calories`}>
      <span>Calories</span>
      <span className="flow-number-wrap"><input id={`${id}-calories`} type="number" inputMode="decimal" required
        min="0" max="100000" step="any" value={values.calories} onChange={event => onChange('calories', event.target.value)}
        aria-describedby={`${id}-hint`} /><span>kcal</span></span>
    </label>
    <div className="flow-macros">
      {MACROS.map(({ key, label, Icon }) => <label key={key} className={`flow-macro is-${key}`} htmlFor={`${id}-${key}`}>
        <span className="flow-macro-label"><Icon size={20} />{label}</span>
        <span className="flow-number-wrap"><input id={`${id}-${key}`} type="number" inputMode="decimal" min="0" max="10000" step="any"
          required={!optionalMacros} value={values[key]} onChange={event => onChange(key, event.target.value)} aria-describedby={`${id}-hint`} />
          <span>g</span></span>
      </label>)}
    </div>
  </fieldset>
}

export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (value: MealType) => void }) {
  return <fieldset className="flow-meal-picker"><legend>Which meal?</legend>
    <div className="flow-meal-options">
      {(Object.keys(MEAL_LABELS) as MealType[]).map(meal => {
        const Icon = MEAL_ICONS[meal]
        return <button type="button" key={meal} className={`is-${meal}`} aria-pressed={meal === value} onClick={() => onChange(meal)}>
          <Icon size={21} /><span>{MEAL_LABELS[meal]}</span>
        </button>
      })}
    </div>
  </fieldset>
}

export function PortionControl({ value, grams, onChange }: { value: number; grams: number; onChange: (value: number) => void }) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])
  function commit() {
    const next = draft.trim() ? normalizeServings(Number(draft), value) : value
    setDraft(String(next))
    if (next !== value) onChange(next)
  }
  return <fieldset className="flow-portion"><legend>Adjust the portion</legend>
    <p id={`${id}-hint`} className="flow-field-hint">1× is the meal you described or photographed. Changing this scales all the numbers.</p>
    <div className="flow-portion-controls">
      <button type="button" onClick={() => onChange(normalizeServings(value - 0.25))} disabled={value <= 0.25} aria-label="Decrease servings"><IconMinus /></button>
      <label htmlFor={id}><input id={id} type="number" min="0.25" max="1000" step="0.25" inputMode="decimal" value={draft}
        onChange={event => setDraft(event.target.value)} onBlur={commit} aria-label="Servings" aria-describedby={`${id}-hint`}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />× portion</label>
      <button type="button" onClick={() => onChange(normalizeServings(value + 0.25))} disabled={value >= 1000} aria-label="Increase servings"><IconPlus /></button>
    </div>
    {grams > 0 && <p className="flow-portion-weight">Estimated weight: {Math.round(grams)} g</p>}
  </fieldset>
}

export function MealTotals({ name, calories, mealType, servings }: { name: string; calories: number; mealType: MealType; servings?: number }) {
  return <div className="flow-total" aria-label="Meal total">
    <span>Your log will show</span><strong>{Math.round(calories)} <small>kcal</small></strong>
    <p>{name.trim()}</p><span>{MEAL_LABELS[mealType]}{servings !== undefined ? ` · ${servings}× portion` : ''}</span>
  </div>
}
