import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import type { FoodAnalysis } from '../types'
import type { LogDraftEnvelope } from '../lib/logDrafts'
import { LogTextPage } from './LogTextPage'
import { PhotoLogPage } from './PhotoLogPage'
import { ReviewFoodPage } from './ReviewFoodPage'
import { EditFoodPage } from './EditFoodPage'
import { AnalysisStatus, FlowFeedback, LogFlowHeader } from '../components/LogFlowUI'
import { MealTypePicker, NutritionFields, PortionControl } from '../components/MealEntryFields'

let state = freshState()
let drafts: LogDraftEnvelope = { version: 1 }
let pendingAnalysis: FoodAnalysis | null = null
let pendingImagePreview: string | null = null
let pendingSource = 'textInput'
const analysis: FoodAnalysis = { name: 'Toast and eggs', calories: 350, protein: 20, carbs: 30, fat: 15, servingSizeGrams: 180, emoji: '🍳',
  ingredients: [{ item: 'Toast', grams: 40, calories: 100, protein: 4, carbs: 20, fat: 1 }] }

vi.mock('../store/AppContext', () => ({
  useApp: () => ({ state, pendingAnalysis, pendingImagePreview, pendingSource, setPendingAnalysis: vi.fn(),
    setPendingImagePreview: vi.fn(), setPendingSource: vi.fn(), addEntry: vi.fn(), updateEntry: vi.fn(),
    deleteEntry: vi.fn(), restoreEntry: vi.fn(), toggleFavorite: vi.fn() }),
  isFavorite: () => false,
}))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ user: { sub: 'meal-flow-test' } }) }))
vi.mock('../mascot/MascotOverlay', () => ({ mascotEvent: vi.fn() }))
vi.mock('../lib/logDrafts', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/logDrafts')>(),
  loadLogDrafts: () => drafts,
  hydrateLogDrafts: async () => drafts,
  saveTextLogDraft: vi.fn(), saveReviewLogDraft: vi.fn(), clearLogDraft: vi.fn(),
}))

beforeEach(() => {
  state = freshState()
  state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: 'test-key' }
  drafts = { version: 1 }
  pendingAnalysis = null
  pendingImagePreview = null
  pendingSource = 'textInput'
})

describe('meal logging UI contracts', () => {
  it('labels the composer, bounds the draft, and leaves the keyboard closed on arrival', () => {
    const html = renderToStaticMarkup(<MemoryRouter><LogTextPage /></MemoryRouter>)
    expect(html).toContain('for="meal-description"')
    expect(html).toContain('aria-describedby="description-hint description-limit"')
    expect(html).toContain('maxLength="5000"')
    expect(html.toLowerCase()).not.toContain('autofocus')
    expect(html).toContain('1</span> Add meal')
    expect(html).toContain('Estimate my meal')
    expect(html).toContain('<button type="submit" disabled=""')
    expect(html).toContain('Enter the numbers myself')
  })

  it('restores a text draft instead of replacing it with example prompts', () => {
    drafts.text = { text: 'Rice and lentils', updatedAt: new Date().toISOString() }
    const html = renderToStaticMarkup(<MemoryRouter><LogTextPage /></MemoryRouter>)
    expect(html).toContain('>Rice and lentils</textarea>')
    expect(html).not.toContain('Try an example')
    expect(html).not.toContain('<button type="submit" disabled=""')
  })

  it('offers AI setup and manual entry without exposing enabled upload controls', () => {
    state.aiSettings = { ...state.aiSettings, accessMode: 'managed', apiKey: '' }
    for (const page of [<LogTextPage key="text" />, <PhotoLogPage key="photo" />]) {
      const html = renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>)
      expect(html).toContain('A little setup for AI')
      expect(html).toContain('href="/log/manual"')
      expect(html).toContain('href="/settings"')
      expect(html).not.toContain('class="photo-upload-zone"')
    }
    const photo = renderToStaticMarkup(<MemoryRouter><PhotoLogPage /></MemoryRouter>)
    const fileInputs = photo.match(/<input[^>]*type="file"[^>]*>/g) ?? []
    expect(fileInputs).toHaveLength(2)
    for (const input of fileInputs) expect(input).toContain('disabled=""')
  })

  it('makes photo sending explicit, offers both sources, and shows the size limit', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PhotoLogPage /></MemoryRouter>)
    expect(html).toContain('Nothing is sent until you choose Analyze photo')
    expect(html).toContain('up to 15 MB')
    expect(html).toContain('Camera</button>')
    expect(html).toContain('Gallery</button>')
    expect(html).toContain('<button type="button" disabled="" class="pressable pressable-primary')
    expect(html).not.toMatch(/📷|📸|🖼/)
  })

  it('keeps local selection separate from the explicit upload action', () => {
    const source = readFileSync(new URL('./PhotoLogPage.tsx', import.meta.url), 'utf8')
    const selection = source.split('function handleFile(file: File) {')[1].split('async function handleAnalyze()')[0]
    expect(selection).toContain('photoFileIssue(file)')
    expect(selection).toContain('URL.createObjectURL(file)')
    expect(selection).not.toContain('analyzeImageFood(')
    expect(selection).not.toContain('fileToBase64(')
    expect(source).toContain('URL.revokeObjectURL(preview)')
    expect(source).toContain("event.target.value = ''")
  })

  it('guards cancelled and stale completions before accepting either kind of AI response', () => {
    for (const file of ['LogTextPage.tsx', 'PhotoLogPage.tsx']) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
      const afterResponse = source.split(file === 'LogTextPage.tsx' ? 'await analyzeTextFood(' : 'await analyzeImageFood(')[1]
      expect(afterResponse.indexOf('controller.signal.aborted || requestRef.current !== controller')).toBeLessThan(afterResponse.indexOf('setPendingAnalysis(analysis)'))
      expect(source).toContain('function cancelAnalysis()')
      expect(source).toContain('setNotice(\'Analysis stopped.')
    }
  })

  it('labels AI review as editable estimates and shows the total before submitting', () => {
    pendingAnalysis = analysis
    const html = renderToStaticMarkup(<MemoryRouter><ReviewFoodPage /></MemoryRouter>)
    expect(html).toContain('aria-current="step"><span aria-hidden="true">2')
    expect(html).toContain('AI estimates can be off')
    expect(html).toContain('1× is the meal you described or photographed')
    expect(html).toContain('350 <small>kcal</small>')
    expect(html.indexOf('aria-label="Meal total"')).toBeLessThan(html.indexOf('type="submit"'))
    expect(html).toContain('<details class="flow-breakdown">')
    expect(html).toContain('Inside the estimate')
    expect(html).not.toContain('🍳')
  })

  it('shows the photo evidence only for photo estimates', () => {
    pendingAnalysis = analysis
    pendingImagePreview = 'data:image/png;base64,review'
    pendingSource = 'snapFood'
    const html = renderToStaticMarkup(<MemoryRouter><ReviewFoodPage /></MemoryRouter>)
    expect(html).toContain('alt="Meal photo being reviewed"')
    expect(html).toContain('Original photo')
    pendingSource = 'textInput'
    expect(renderToStaticMarkup(<MemoryRouter><ReviewFoodPage /></MemoryRouter>)).not.toContain('alt="Meal photo being reviewed"')
  })

  it('preserves a restored review’s portion and empty fields without showing a false total', () => {
    drafts.review = { analysis, baseAnalysis: analysis, servings: 1.5, mealType: 'lunch', source: 'textInput',
      emptyNumericFields: ['protein'], updatedAt: new Date().toISOString() }
    const html = renderToStaticMarkup(<MemoryRouter><ReviewFoodPage /></MemoryRouter>)
    expect(html).toContain('aria-label="Servings"')
    expect(html).toContain('value="1.5"')
    expect(html).not.toContain('aria-label="Meal total"')
    expect(html).toContain('Fill in the meal details')
    expect(html).toContain('required="" aria-describedby=')
  })

  it('waits for a recoverable draft before showing an empty review', () => {
    const html = renderToStaticMarkup(<MemoryRouter><ReviewFoodPage /></MemoryRouter>)
    expect(html).toContain('role="status">Restoring your review')
    const source = readFileSync(new URL('./ReviewFoodPage.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain("if (!analysis) navigate('/log'")
    expect(source).toContain('setSource(review.source)')
  })

  it('makes edit completion explicit and separates deletion from saving', () => {
    state.foodEntries = [{ id: 'meal-1', name: 'Toast', calories: 200, protein: 4, carbs: 35, fat: 5,
      source: 'manual', mealType: 'breakfast', timestamp: new Date().toISOString() }]
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/edit/meal-1']}><Routes>
      <Route path="/edit/:id" element={<EditFoodPage />} />
    </Routes></MemoryRouter>)
    expect(html).toContain('Everything is up to date')
    expect(html).toContain('<button type="submit" disabled=""')
    expect(html).toContain('<details class="flow-delete">')
    expect(html).toContain('Yes, delete entry')
    expect(html).toContain('Keep entry')
    const source = readFileSync(new URL('./EditFoodPage.tsx', import.meta.url), 'utf8')
    expect(source).toContain('validateManualFood({ name, ...nutrition, servings: 1 })')
    expect(source).toContain("label: 'Undo', fn: () => restoreEntry(entry)")
    expect(source).not.toContain('fn: () => addEntry(')
  })

  it('gives a missing entry a clear route back to Today', () => {
    const html = renderToStaticMarkup(<MemoryRouter><EditFoodPage /></MemoryRouter>)
    expect(html).toContain('This entry isn’t here.')
    expect(html).toContain('Back to Today')
  })

  it('respects Hide Momo in both the header and analysis state', () => {
    state.gamification.mascotActivity = 'off'
    const html = renderToStaticMarkup(<><LogFlowHeader title="Review" description="Check your meal" step={2} />
      <AnalysisStatus method="photo" onCancel={vi.fn()} /></>)
    expect(html).not.toContain('class="momo-sticker"')
    expect(html).toContain('role="status" aria-live="polite"')
    expect(html).toContain('Cancel analysis')
    expect(html).not.toContain('role="progressbar"')
  })

  it('uses named fields, decimal keyboards and selected-state meal buttons', () => {
    const html = renderToStaticMarkup(<><NutritionFields values={analysis} onChange={vi.fn()} />
      <MealTypePicker value="lunch" onChange={vi.fn()} /><PortionControl value={1000} grams={0} onChange={vi.fn()} /></>)
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(5)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toContain('disabled="" aria-label="Increase servings"')
    expect(html).toContain('<legend>Which meal?</legend>')
    expect(html).toContain('<legend>Nutrition total</legend>')
    const feedback = renderToStaticMarkup(<FlowFeedback message="Check calories" error />)
    expect(feedback).toContain('tabindex="-1" role="alert"')
  })
})
