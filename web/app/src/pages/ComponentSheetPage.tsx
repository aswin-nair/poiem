import { useState } from 'react'
import { NutritionFields } from '../components/MealEntryFields'
import { PressableButton } from '../components/PressableButton'
import { Sheet } from '../components/Sheet'
import {
  AppShell,
  EmptyState,
  FieldGrid,
  FilterGroup,
  FormField,
  MealRow,
  PageHeader,
  Section,
  Surface,
} from '../components/system'

/** Dev and visual-reference mount for the phase-one primitives. */
export function ComponentSheetPage() {
  const [activations, setActivations] = useState(0)
  const [filter, setFilter] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [nutrition, setNutrition] = useState({ calories: '320', protein: '12', carbs: '52', fat: '8' })

  return (
    <AppShell screen="k-sheet-page">
      <PageHeader eyebrow="Reference" title="Components" subtitle="Focus, disabled, error, and loading states for the shared primitives." />
      <main className="app-main k-sheet-main">
        <Section title="Surfaces" titleId="surfaces">
          <Surface><p>Plain surface. No frame.</p></Surface>
          <Surface variant="outlined"><p>Outlined surface.</p></Surface>
          <Surface variant="hero"><p>Hero surface. One per route.</p></Surface>
        </Section>

        <Section title="Buttons" titleId="buttons">
          <div className="k-sheet-row">
            <PressableButton label="Primary" onClick={() => setActivations(value => value + 1)} />
            <PressableButton variant="secondary" label="Secondary" />
            <PressableButton variant="ghost" label="Ghost" />
            <PressableButton variant="destructive" label="Delete" />
            <PressableButton disabled label="Disabled action" />
            <PressableButton to="/" disabled label="Disabled link" onClick={() => setActivations(value => value + 1)} />
            <PressableButton label="Loading" className="is-loading" disabled />
          </div>
          <p role="status">Button activations: {activations}</p>
        </Section>

        <Section title="Fields" titleId="fields">
          <FieldGrid columns={2}>
            <FormField label="Food name" htmlFor="sheet-name" hint="What you ate.">
              <input id="sheet-name" defaultValue="Overnight oats" />
            </FormField>
            <FormField label="Calories" htmlFor="sheet-kcal" error="Enter a number.">
              <input id="sheet-kcal" aria-invalid="true" defaultValue="" />
            </FormField>
            <FormField label="Disabled" htmlFor="sheet-off" disabled>
              <input id="sheet-off" disabled defaultValue="Held" />
            </FormField>
            <FormField label="Focused example" htmlFor="sheet-focus" className="is-demo-focus">
              <input id="sheet-focus" defaultValue="Tab here" />
            </FormField>
          </FieldGrid>
          <NutritionFields values={nutrition} onChange={(field, value) => setNutrition(current => ({ ...current, [field]: value }))} />
        </Section>

        <Section title="Filters" titleId="filters">
          <FilterGroup
            label="Meal"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'breakfast', label: 'Breakfast' },
              { id: 'lunch', label: 'Lunch' },
            ]}
          />
          <button type="button" className="k-filter is-demo-focus">Focus</button>
          <FilterGroup
            label="Disabled filters"
            value="all"
            onChange={() => undefined}
            disabled
            options={[{ id: 'all', label: 'All' }, { id: 'held', label: 'Held' }]}
          />
        </Section>

        <Section title="Meal row" titleId="meal-row">
          <MealRow
            name="Overnight oats"
            meta="8:15 · P 12 · C 52 · F 8"
            kcal="320 kcal"
            tile={<span className="k-food-tile is-tone-mint" aria-hidden="true" />}
            onClick={() => undefined}
          />
        </Section>

        <Section title="Empty" titleId="empty">
          <EmptyState body="Your table is ready. Start with whatever you ate — you can change the details later." />
        </Section>

        <Section title="Sheet" titleId="sheet">
          <PressableButton label="Open sheet" onClick={() => setSheetOpen(true)} />
          {sheetOpen && (
            <Sheet labelledBy="sheet-demo-title" onClose={() => setSheetOpen(false)}>
              <h2 id="sheet-demo-title">Log a meal</h2>
              <p>Sheets become centred dialogs from 720px. Escape and the backdrop still close them.</p>
            </Sheet>
          )}
        </Section>
      </main>
    </AppShell>
  )
}

export default ComponentSheetPage
