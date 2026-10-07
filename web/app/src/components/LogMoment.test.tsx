import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { FIRST_PIECE, wardrobePiece } from '@fud-ai/product/wardrobe'
import { dayRingProgress } from '../lib/dayRing'
import { planLogFeedback, type LogFeedbackPlan } from '../lib/logFeedbackPlan'
import { makeLogReceipt } from '../lib/logReceipt'
import { defaultGamification } from '../lib/storage'
import type { FoodEntry } from '../types'
import { LogMoment } from './LogMoment'

const oats: FoodEntry = {
  id: 'oats', name: 'Oats', calories: 300, protein: 10, carbs: 50, fat: 6,
  timestamp: new Date(2026, 9, 5, 8).toISOString(), mealType: 'breakfast', source: 'manual',
}
const yesterday: FoodEntry = { ...oats, id: 'yesterday', timestamp: new Date(2026, 9, 4, 8).toISOString() }
const idle = dayRingProgress([], 0, 'detailed')
/** Plans come from the planner, so the card is tested on what Today actually passes it. */
function plan(over: { firstMeal?: boolean; whisk?: boolean; paused?: boolean; levelUp?: number } = {}): LogFeedbackPlan {
  const meal = { id: 'meal', key: 'enamel-manual-oats', xp: 10, label: 'Logged a meal', timestamp: oats.timestamp }
  return planLogFeedback({
    receipt: makeLogReceipt(oats, 0),
    entries: over.firstMeal ? [oats] : [yesterday, oats],
    gamification: {
      ...defaultGamification(),
      ownedCosmeticIds: over.firstMeal ? [] : [FIRST_PIECE],
      awardedKeys: [meal.key], xpEvents: [meal], pendingLevelUp: over.levelUp ?? null,
    },
    newPieces: over.whisk ? [wardrobePiece('whisk')!] : [],
    firstMealJourney: Boolean(over.firstMeal),
    paused: Boolean(over.paused),
    ring: { before: idle, after: idle },
    ringAckedToday: false,
    now: new Date(2026, 9, 5, 9),
  })
}
const render = (value: LogFeedbackPlan, showMomo = true) => renderToStaticMarkup(
  <LogMoment plan={value} foodName="Oats" showMomo={showMomo} onUndo={() => {}} onDone={() => {}} />,
)

it('is not a dialog and not modal', () => {
  const html = render(plan({ firstMeal: true }))
  expect(html).toContain('<aside')
  expect(html).not.toContain('role="dialog"')
  expect(html).not.toContain('aria-modal')
  expect(html).not.toContain('tabindex')
  expect(html).toContain('Undo')
  expect(html).toContain('Dismiss')
})

it('announces once through a polite status element that mounts empty', () => {
  const value = plan({ levelUp: 2 })
  expect(value.announcement).toBe('Logged Oats. Level 2.')
  const html = render(value)
  expect(html.match(/role="status"/g)).toHaveLength(1)
  expect(html.match(/aria-live=/g)).toHaveLength(1)
  expect(html).toContain('aria-live="polite"')
  expect(html).toContain('aria-atomic="true"')
  // Filled after mount (see scheduleAnnouncement), because a region that arrives full can be ignored.
  expect(html).toMatch(/<span class="sr-only" role="status" aria-live="polite" aria-atomic="true"><\/span>/)
  expect(html).not.toContain('Logged Oats.')
})

it('shows the first piece name for a wardrobe plan', () => {
  const html = render(plan({ whisk: true }))
  expect(html.split('Whisk')).toHaveLength(2)
  expect(html).toContain('New for Momo: Whisk')
  expect(render(plan({ firstMeal: true }))).toContain('Momo’s first piece: Blossom clip')
})

it('lists each award once with its XP and never stacks the piece twice', () => {
  const html = render(plan({ whisk: true, levelUp: 3 }))
  expect(html.split('Logged a meal')).toHaveLength(2)
  expect(html).toContain('Logged a meal · +10 XP')
  expect(html).toContain('Level 3.')
})

it('omits Momo when showMomo is false', () => {
  expect(render(plan({ whisk: true }))).toContain('momo-art')
  expect(render(plan({ whisk: true }), false)).not.toContain('momo-art')
})

it('omits Momo for kinds that are not the first meal or a piece', () => {
  expect(render(plan())).not.toContain('momo-art')
})

it('omits decorative motion for a zero-motion plan', () => {
  const html = render({ ...plan({ whisk: true }), maxMotionMs: 0 })
  expect(html).toContain('is-static')
  expect(html).not.toContain('momo-art')
})
