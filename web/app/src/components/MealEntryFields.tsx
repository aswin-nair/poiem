import { useEffect, useId, useState } from 'react'
import type { MealType } from '../types'
import { MEAL_LABELS } from '../types'
import { FoodIcon, IconBreakfast, IconCarbs, IconDinner, IconEdit, IconLunch, IconMeal, IconMinus, IconPlus, IconProtein, IconWater } from './icons'
import { normalizeServings } from '../lib/mealReview'
import { foodToneFor } from '../lib/foodGlyph'
import { feel } from '../lib/feel'
import type { FoodFieldErrors } from '../lib/foodEntryValidation'

const NUTRITION_FIELDS = ['calories', 'protein', 'carbs', 'fat'] as const
export type NutritionField = typeof NUTRITION_FIELDS[number]
export type NutritionValues = Record<NutritionField, string | number>
const MACROS = [
  { key: 'protein', label: 'Protein', Icon: IconProtein },
  { key: 'carbs', label: 'Carbs', Icon: IconCarbs },
  { key: 'fat', label: 'Fat', Icon: IconWater },
] as const
const MEAL_ICONS = { breakfast: IconBreakfast, lunch: IconLunch, dinner: IconDinner, snack: IconCarbs, other: IconMeal }

export function MealNameField({ name, emoji, onChange, error }: { name: string; emoji?: string; onChange: (value: string) => void; error?: string }) {
  const id = useId()
  return <div className="flow-meal-name">
    <span className={`flow-food-sticker is-tone-${foodToneFor(name)}`}><FoodIcon emoji={emoji} name={name} size={30} /></span>
    <div><label htmlFor={id}>Food name <IconEdit size={16} /></label>
      <input id={id} data-food-field="name" value={name} onChange={event => onChange(event.target.value)} maxLength={500} required autoComplete="off"
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  </div>
}

export function NutritionFields({ values, onChange, optionalMacros = false, errors = {} }: {
  values: NutritionValues; onChange: (field: NutritionField, value: string) => void; optionalMacros?: boolean; errors?: FoodFieldErrors
}) {
  const id = useId()
  return <fieldset className="flow-nutrition">
    <legend>Nutrition total</legend>
    <p id={`${id}-hint`} className="flow-field-hint">For the whole portion you’re logging.{optionalMacros ? ' Blank macros are saved as 0 g.' : ' All four values are editable.'}</p>
    <label className="flow-calories" htmlFor={`${id}-calories`}>
      <span>Calories</span>
      <span className="flow-number-wrap"><input id={`${id}-calories`} data-food-field="calories" type="number" inputMode="decimal" required
        min="0" max="100000" step="any" value={values.calories} onChange={event => onChange('calories', event.target.value)}
        aria-invalid={errors.calories ? true : undefined} aria-describedby={`${id}-hint${errors.calories ? ` ${id}-calories-error` : ''}`} /><span>kcal</span></span>
      {errors.calories && <span id={`${id}-calories-error`} className="field-error">{errors.calories}</span>}
    </label>
    <div className="flow-macros">
      {MACROS.map(({ key, label, Icon }) => <label key={key} className={`flow-macro is-${key}`} htmlFor={`${id}-${key}`}>
        <span className="flow-macro-label"><Icon size={20} />{label}</span>
        <span className="flow-number-wrap"><input id={`${id}-${key}`} data-food-field={key} type="number" inputMode="decimal" min="0" max="10000" step="any"
          required={!optionalMacros} value={values[key]} onChange={event => onChange(key, event.target.value)} aria-invalid={errors[key] ? true : undefined}
          aria-describedby={`${id}-hint${errors[key] ? ` ${id}-${key}-error` : ''}`} />
          <span>g</span></span>
        {errors[key] && <span id={`${id}-${key}-error`} className="field-error">{errors[key]}</span>}
      </label>)}
    </div>
  </fieldset>
}

export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (value: MealType) => void }) {
  return <fieldset className="flow-meal-picker"><legend>Which meal?</legend>
    <div className="flow-meal-options">
      {(Object.keys(MEAL_LABELS) as MealType[]).map(meal => {
        const Icon = MEAL_ICONS[meal]
        return <button type="button" data-action-play="select" key={meal} className={`is-${meal}`} aria-pressed={meal === value} onClick={() => {
          if (meal === value) return
          feel('select')
          onChange(meal)
        }}>
          <Icon size={21} /><span>{MEAL_LABELS[meal]}</span>
        </button>
      })}
    </div>
  </fieldset>
}

export function PortionControl({ value, grams, onChange, error, calories }: { value: number; grams: number; onChange: (value: number) => void; error?: string; calories?: number }) {
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
      <button type="button" data-action-play="select" onClick={() => { feel('select'); onChange(normalizeServings(value - 0.25)) }} disabled={value <= 0.25} aria-label="Decrease servings"><IconMinus /></button>
      <label htmlFor={id}><input id={id} data-food-field="servings" type="number" min="0.25" max="1000" step="0.25" inputMode="decimal" value={draft}
        onChange={event => setDraft(event.target.value)} onBlur={commit} aria-label="Servings" aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />× portion</label>
      <button type="button" data-action-play="select" onClick={() => { feel('select'); onChange(normalizeServings(value + 0.25)) }} disabled={value >= 1000} aria-label="Increase servings"><IconPlus /></button>
    </div>
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    {calories !== undefined && Number.isFinite(calories) && calories >= 0 && <p className="flow-portion-total">Total for this portion: <strong>{Math.round(calories).toLocaleString()} kcal</strong></p>}
    {grams > 0 && <p className="flow-portion-weight">Estimated weight: {Math.round(grams)} g</p>}
  </fieldset>
}

export function MealTotals({ name, calories, mealType, servings }: { name: string; calories: number; mealType: MealType; servings?: number }) {
  return <div className="flow-total" aria-label="Meal total">
    <span>Your log will show</span><strong>{Math.round(calories)} <small>kcal</small></strong>
    <p>{name.trim()}</p><span>{MEAL_LABELS[mealType]}{servings !== undefined ? ` · ${servings}× portion` : ''}</span>
  </div>
}
