import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { dayRingProgress } from '../lib/dayRing'
import { DayRing } from './DayRing'

const empty = dayRingProgress([], 0, 'light')
const complete = dayRingProgress([{ mealType: 'breakfast', source: 'manual' }], 0, 'light')
it('renders one arc per commitment step and marks optional arcs optional', () => {
  const html = renderToStaticMarkup(<DayRing progress={empty} />)
  expect(html.match(/class="k-ring-fill/g)).toHaveLength(3)
  expect(html.match(/optional/g)).toHaveLength(2)
})
it('shows the check only when complete', () => {
  expect(renderToStaticMarkup(<DayRing progress={empty} />)).not.toContain('k-ring-check')
  expect(renderToStaticMarkup(<DayRing progress={complete} />)).toContain('k-ring-check')
})
it('uses system classes and no legacy day-ring classes', () => {
  const html = renderToStaticMarkup(<DayRing progress={empty} note={<p>One note.</p>} />)
  expect(html).toContain('class="k-ring')
  expect(html).not.toContain('day-ring')
  expect(html).toContain('One note.')
})
it('adds the closing class only when justClosed', () => {
  expect(renderToStaticMarkup(<DayRing progress={complete} />)).not.toContain('is-just-closed')
  expect(renderToStaticMarkup(<DayRing progress={complete} justClosed />)).toContain('is-just-closed')
})
