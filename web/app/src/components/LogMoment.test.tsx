import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { wardrobePiece, FIRST_PIECE } from '@fud-ai/product/wardrobe'
import type { LogFeedbackPlan } from '../lib/logFeedbackPlan'
import { LogMoment } from './LogMoment'

const plan: LogFeedbackPlan = { kind: 'first-meal', tier: 'full', headline: 'First meal in.', announcement: 'Logged Oats.', awards: [], pieces: [wardrobePiece(FIRST_PIECE)!], cue: 'log-confirm', mascotEvent: 'milestone', maxMotionMs: 720, ringClosed: false, levelUp: null }
const render = (over: Partial<LogFeedbackPlan> = {}, showMomo = true) => renderToStaticMarkup(<LogMoment plan={{ ...plan, ...over }} foodName="Oats" showMomo={showMomo} onUndo={() => {}} onDone={() => {}} />)
it('is not a dialog and not modal', () => {
  const html = render()
  expect(html).toContain('<aside')
  expect(html).not.toContain('role="dialog"')
  expect(html).not.toContain('aria-modal')
  expect(html).toContain('Undo')
  expect(html).toContain('Dismiss')
})
it('announces once through a polite status element', () => {
  const html = render()
  expect(html.match(/role="status"/g)).toHaveLength(1)
  expect(html.match(/aria-live="polite"/g)).toHaveLength(1)
  expect(html).toContain('aria-atomic="true"')
  expect(html).toContain('Logged Oats.')
})
it('shows the first piece name for a wardrobe plan', () => expect(render({ kind: 'wardrobe' })).toContain('Blossom clip'))
it('omits Momo when showMomo is false', () => expect(render({}, false)).not.toContain('momo-art'))
it('omits decorative motion for a zero-motion plan', () => {
  const html = render({ maxMotionMs: 0 })
  expect(html).toContain('is-static')
  expect(html).not.toContain('momo-art')
})
