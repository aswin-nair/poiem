import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PhotoLogPage } from '../pages/PhotoLogPage'
import { BottomNav } from './BottomNav'
import { CalorieRing } from './CalorieRing'
import { LineChart } from './Charts'
import { DatePickerModal } from './DatePickerModal'
import { MacroProgressGroup } from './MacroGrid'
import { PressableButton } from './PressableButton'
import { Counter } from './Counter'
import { PathNode } from './PathNode'
import { ClayInput } from './ClayInput'
import { Surface } from './Surface'
import { SettingsRow } from './SettingsRow'
import { WeekStrip } from './WeekStrip'
import { freshState } from '../lib/storage'
import { AnalysisStatus, FlowFeedback } from './LogFlowUI'

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    state: { ...freshState(), aiSettings: { apiKey: 'test-key', provider: 'gemini' } },
    setPendingAnalysis: () => undefined,
    setPendingSource: () => undefined,
  }),
}))

function count(haystack: string, needle: RegExp): number {
  return [...haystack.matchAll(needle)].length
}

afterEach(() => vi.useRealTimers())

describe('primary component accessibility contracts', () => {
  it('announces calorie progress factually, including an over-target value', () => {
    const html = renderToStaticMarkup(createElement(CalorieRing, {
      consumed: 2400,
      target: 2000,
    }))

    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-label="Calories consumed"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="2000"')
    expect(html).toContain('aria-valuenow="2000"')
    expect(html).toContain('aria-valuetext="2400 of 2000 kilocalories, 400 over"')
  })

  it('gives every macro progress bar a distinct accessible name', () => {
    const html = renderToStaticMarkup(createElement(MacroProgressGroup, {
      protein: { current: 20, goal: 100 },
      carbs: { current: 30, goal: 200 },
      fat: { current: 10, goal: 60 },
    }))

    expect(count(html, /role="progressbar"/g)).toBe(3)
    expect(html).toContain('aria-label="Protein"')
    expect(html).toContain('aria-label="Carbs"')
    expect(html).toContain('aria-label="Fat"')
  })

  it('exposes the selected and current day in the week strip', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0))
    const selectedDate = new Date(2026, 7, 20)
    const html = renderToStaticMarkup(createElement(WeekStrip, {
      selectedDate,
      onSelect: () => undefined,
      loggedDays: new Set(['2026-08-20']),
    }))

    expect(count(html, /class="week-day"/g)).toBe(7)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-current="date"')
    const dayLabel = selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    expect(html).toContain(`aria-label="${dayLabel}, logged"`)
  })

  it('labels the date dialog, navigation and individual calendar days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0))
    const selectedDate = new Date(2026, 7, 20)
    const html = renderToStaticMarkup(createElement(DatePickerModal, {
      selectedDate,
      onSelect: () => undefined,
      onClose: () => undefined,
    }))

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="Choose a date"')
    expect(html).toContain('aria-label="Previous month"')
    expect(html).toContain('aria-label="Next month"')
    const dayLabel = selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    expect(html).toContain(`aria-label="${dayLabel}" aria-pressed="true"`)
  })

  it('keeps the main navigation and log trigger named', () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/'] },
      createElement(BottomNav),
    ))

    expect(html).toContain('<nav class="bottom-nav-wrap" aria-label="Main"')
    expect(html).toContain('Today')
    expect(html).toContain('Insights')
    expect(html).toContain('Saved')
    expect(html).toContain('You')
    // The + opens the log sheet over the current page, so it is a button, not a link.
    expect(html).toContain('<button type="button" data-testid="fab" class="nav-fab" aria-label="Log a meal" aria-haspopup="dialog"')
    expect(html).not.toContain('href="/log"')
  })

  it('names clay fields and keeps path nodes labeled', () => {
    const field = renderToStaticMarkup(createElement(ClayInput, {
      'aria-label': 'Meal name',
      placeholder: 'Oats',
    }))
    expect(field).toContain('clay-input')
    expect(field).toContain('aria-label="Meal name"')
  })

  it('names path nodes with slot and status', () => {
    const html = renderToStaticMarkup(createElement(PathNode, {
      slot: 'breakfast',
      status: 'current',
    }))
    expect(html).toContain('aria-label="Breakfast, current"')
    expect(html).toContain('aria-current="step"')
  })

  it('keeps ghost and destructive pressable buttons as real buttons', () => {
    const ghost = renderToStaticMarkup(createElement(PressableButton, {
      label: 'Back',
      variant: 'ghost',
    }))
    const danger = renderToStaticMarkup(createElement(PressableButton, {
      label: 'Delete entry',
      variant: 'destructive',
    }))
    expect(ghost).toMatch(/^<button type="button"/)
    expect(danger).toContain('pressable-destructive')
    const surface = renderToStaticMarkup(createElement(Surface, null, 'Card'))
    expect(surface).toContain('surface')
    expect(surface).toContain('is-padded')
    expect(surface).toContain('clay-e2')
    expect(renderToStaticMarkup(createElement(Counter, { label: 'days', value: 3 }))).toContain('3')
  })

  it('uses a native disabled button contract for primary actions', () => {
    const html = renderToStaticMarkup(createElement(PressableButton, {
      label: 'Save settings',
      disabled: true,
      type: 'submit',
    }))

    expect(html).toMatch(/^<button type="submit" disabled=""/)
    expect(html).toContain('Save settings')
    expect(html).toContain('aria-hidden="true"')
  })

  it('uses a real button for photo upload', () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/log/photo'] },
      createElement(PhotoLogPage),
    ))

    expect(html).toContain('<button type="button" class="photo-upload-zone"')
    expect(html).toContain('Tap to choose a photo')
    expect(html).toContain('aria-label="Take a photo"')
    expect(html).toContain('aria-label="Choose a photo from gallery"')
  })

  it('gives settings controls an accessible name and description', () => {
    const html = renderToStaticMarkup(createElement(SettingsRow, {
      label: 'Pause tracking',
      hint: 'Hold your streak where it is.',
      children: createElement('input', { type: 'checkbox' }),
    }))

    expect(html).toMatch(/aria-labelledby="[^"]+-label"/)
    expect(html).toMatch(/aria-describedby="[^"]+-hint"/)
    expect(html).toContain('Pause tracking')
    expect(html).toContain('Hold your streak where it is.')
  })

  it('exposes a text table beside a chart', () => {
    const html = renderToStaticMarkup(createElement(LineChart, {
      points: [{ label: 'Mon', value: 70.2 }],
      unit: ' kg',
    }))

    expect(html).toContain('class="sr-only"')
    expect(html).toContain('<caption>Chart values</caption>')
    expect(html).toContain('70.2')
  })

  it('marks visible errors as alerts and save progress as live status', () => {
    const pagesDir = fileURLToPath(new URL('../pages/', import.meta.url))
    const sources = [
      'PhotoLogPage.tsx',
      'LoginPage.tsx',
      'ForgotPasswordPage.tsx',
      'ResetPasswordPage.tsx',
      'LogTextPage.tsx',
      'SettingsPage.tsx',
    ].map(name => readFileSync(`${pagesDir}${name}`, 'utf8'))

    for (const source of sources) {
      for (const match of source.matchAll(/<div className="error-banner"[^>]*>/g)) {
        expect(match[0]).toContain('role="alert"')
      }
    }

    expect(readFileSync(new URL('./SettingsNavigation.tsx', import.meta.url), 'utf8')).toMatch(
      /className="settings-saved-banner"[^>]*role="status"[^>]*aria-live="polite"/,
    )
    const progress = renderToStaticMarkup(createElement(AnalysisStatus, { method: 'photo', onCancel: vi.fn() }))
    expect(progress).toContain('role="status" aria-live="polite"')
    expect(progress).toContain('Cancel analysis')
    const error = renderToStaticMarkup(createElement(FlowFeedback, { message: 'Try again', error: true }))
    expect(error).toContain('role="alert"')
    expect(error).toContain('tabindex="-1"')
  })
})
