import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

// Architecture guards, not timing benchmarks or proof of skipped client renders.
describe('layout work keeps fresh inputs and existing safety paths', () => {
  it('Today derives selected-day rows from immutable entries and current-day status from a calendar key', () => {
    const home = read('../pages/HomePage.tsx')
    expect(home).toContain('entriesForDay(state.foodEntries, selectedDate), [state.foodEntries, selectedDate]')
    expect(home).toContain('[state.foodEntries, currentDayKey]')
    expect(home).toContain('memo(function TodayMealRow')
    expect(home).toContain('onEdit={editMeal} onTap={tapMeal} onDelete={removeMeal}')
    expect(home).toContain('fresh={entry.id === freshId}')
  })
  it('Coach invalidates the cached cap on both viewport resize paths and cancels pending work', () => {
    const coach = read('../pages/CoachPage.tsx')
    expect(coach).toContain('draftHeightCap.current === null')
    expect(coach).toContain('draftHeightCap.current = null')
    expect(coach).toContain("viewport?.addEventListener('resize', schedule)")
    expect(coach).toContain("window.addEventListener('resize', schedule)")
    expect(coach).toContain('window.cancelAnimationFrame(frame)')
    expect(coach).toContain('textarea.scrollHeight + 4')
  })
  it('receipt clearance retains its initial read and a missing-border-box fallback', () => {
    const moment = read('../components/LogMoment.tsx')
    expect(moment).toContain('measure()\n    const observer')
    expect(moment).toContain('entry?.borderBoxSize?.[0]?.blockSize')
    expect(moment).toContain('else measure()')
  })
  it('Momo uses one mutation observer and fresh per-check geometry, retaining all safety events', () => {
    const overlay = read('../mascot/MascotOverlay.tsx')
    expect(overlay.match(/new MutationObserver\(/g)).toHaveLength(1)
    expect(overlay).toContain('collectAvoidRects(viewport.width, viewport.height, insets)')
    expect(overlay).toContain('insetViewport({')
    expect(overlay).toContain("attributeFilter: ['aria-modal', 'class', 'hidden', 'open']")
    expect(overlay).toContain('if (repositioned) schedule()')
    expect(overlay).toContain('if (host && !blocked && !isSafeMascotPosition(positionRef.current')
    expect(overlay).toContain('if (blocked)')
    expect(overlay).toContain('isSafeMascotPath')
  })
})
