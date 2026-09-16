import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, isFavorite } from '../store/AppContext'
import { useToast } from '../components/Toast'
import { BackLink } from '../components/BackLink'
import { IconCheck, IconStar, IconTrash } from '../components/icons'
import type { MealType } from '../types'
import { PressableButton } from '../components/PressableButton'
import { FlowFeedback, LogFlowHeader } from '../components/LogFlowUI'
import { MealNameField, MealTotals, MealTypePicker, NutritionFields } from '../components/MealEntryFields'
import { validateManualFood } from '../lib/foodEntryValidation'

export function EditFoodPage() {
  const { id } = useParams<{ id: string }>()
  const { state, updateEntry, deleteEntry, restoreEntry, toggleFavorite } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const entry = state.foodEntries.find(item => item.id === id)
  const [name, setName] = useState(entry?.name ?? '')
  const [nutrition, setNutrition] = useState({
    calories: String(entry?.calories ?? ''), protein: String(entry?.protein ?? ''),
    carbs: String(entry?.carbs ?? ''), fat: String(entry?.fat ?? ''),
  })
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? 'other')
  const [error, setError] = useState<string | null>(null)

  if (!entry) return <div className="app-shell k-screen k-flow"><main className="app-main">
    <BackLink to="/" label="Today" />
    <LogFlowHeader title="This entry isn’t here." description="It may have been removed. Your other meals are waiting on Today." />
    <PressableButton to="/" label="Back to Today" />
  </main></div>

  const fav = isFavorite(state, entry)
  const result = validateManualFood({ name, ...nutrition, servings: 1 })
  const changed = name !== entry.name || mealType !== (entry.mealType ?? 'other')
    || Object.entries(nutrition).some(([key, value]) => value !== String(entry[key as keyof typeof nutrition]))

  function save() {
    if (!entry) return
    if (!result.ok) { setError(result.error); return }
    updateEntry({
      ...entry,
      ...result.value,
      mealType,
      detailAdded: true,
      // A manual edit supersedes the ingredient estimate.
      ingredients: undefined,
    })
    toast('Changes saved', { type: 'success' })
    navigate('/')
  }

  function remove() {
    if (!entry) return
    deleteEntry(entry.id)
    toast(`Deleted ${entry.name}`, { type: 'info', action: { label: 'Undo', fn: () => restoreEntry(entry) } })
    navigate('/')
  }

  function leave() {
    if (changed && !window.confirm('Leave without saving your changes?')) return
    navigate('/')
  }

  return (
    <div className="app-shell k-screen k-flow k-flow-wide">
      <main className="app-main">
        <div className="flow-edit-topbar">
          <BackLink onClick={leave} label="Today" />
          <button type="button" className="flow-favourite" onClick={() => toggleFavorite(entry)}
            aria-pressed={fav} aria-label={fav ? 'Remove saved entry from favourites' : 'Add saved entry to favourites'}>
            <IconStar active={fav} size={20} /> {fav ? 'Favourited' : 'Favourite'}
          </button>
        </div>
        <LogFlowHeader title="A little fine-tuning." description="Change the details below. Your original entry stays as it is until you save." />
        {error && <FlowFeedback message={error} error />}
        <form className="flow-review-layout" noValidate onSubmit={event => { event.preventDefault(); save() }}>
          <div className="flow-review-editor">
            <MealNameField name={name} emoji={entry.emoji} onChange={value => { setName(value); setError(null) }} />
            <NutritionFields values={nutrition} optionalMacros onChange={(field, value) => { setNutrition(current => ({ ...current, [field]: value })); setError(null) }} />
            <MealTypePicker value={mealType} onChange={value => { setMealType(value); setError(null) }} />
          </div>
          <div className="flow-review-side">
            <div className="flow-review-summary">
              {result.ok ? <MealTotals name={result.value.name} calories={result.value.calories} mealType={mealType} />
                : <p className="flow-summary-hint">Check the meal details to see your updated total here.</p>}
              <PressableButton fullWidth type="submit" disabled={!changed}><IconCheck size={20} /> Save changes</PressableButton>
              <p className="flow-save-hint">{changed ? 'Updates this entry only, keeping its original date.' : 'Everything is up to date. Change a field to save.'}</p>
              <button type="button" className="flow-text-action" onClick={leave}>Cancel edits</button>
            </div>
            <details className="flow-delete">
              <summary><IconTrash size={18} /> Delete this entry</summary>
              <p>Remove “{entry.name}” from your log? You’ll have a short Undo window after deleting.</p>
              <button type="button" className="flow-text-action" onClick={event => {
                const details = event.currentTarget.closest('details')
                if (details) { details.open = false; details.querySelector('summary')?.focus() }
              }}>Keep entry</button>
              <PressableButton fullWidth variant="destructive" label="Yes, delete entry" onClick={remove} />
            </details>
          </div>
        </form>
      </main>
    </div>
  )
}
