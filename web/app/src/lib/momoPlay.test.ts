import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MomoPlayroom } from '../components/MomoPlayroom'
import { MOMO_EXPRESSIONS } from '../mascot/expressions'
import { MOMO_PLAY_ACTIONS, MOMO_PLAY_DURATION_MS, momoPlayBeat } from './momoPlay'

describe('Momo playroom', () => {
  it('offers three distinct actions with three authored lines each', () => {
    expect(MOMO_PLAY_ACTIONS.map(action => action.label)).toEqual(['High-five', 'Make a face', 'Tiny dance'])
    const lines = MOMO_PLAY_ACTIONS.flatMap(action => action.beats.map(beat => beat.line))
    expect(new Set(lines).size).toBe(9)
    for (const action of MOMO_PLAY_ACTIONS) {
      expect(action.beats).toHaveLength(3)
      for (const beat of action.beats) {
        expect(beat.line.length).toBeGreaterThan(20)
        expect(beat.line.length).toBeLessThan(90)
        expect(MOMO_EXPRESSIONS).toContain(beat.expression)
        expect(beat.pose).toBeTruthy()
      }
    }
  })

  it('rotates within the chosen action without randomness', () => {
    for (const action of MOMO_PLAY_ACTIONS) {
      expect([0, 1, 2].map(count => momoPlayBeat(action.id, count))).toEqual(action.beats)
      expect(momoPlayBeat(action.id, 3)).toEqual(action.beats[0])
      expect(momoPlayBeat(action.id, 31)).toEqual(action.beats[1])
    }
  })

  it('keeps malformed counters on a defined first beat', () => {
    for (const counter of [-1, Number.NaN, Infinity]) {
      expect(momoPlayBeat('face', counter)).toEqual(MOMO_PLAY_ACTIONS[1].beats[0])
    }
    expect(momoPlayBeat('face', 1.5)).toEqual(MOMO_PLAY_ACTIONS[1].beats[1])
  })

  it('settles every performance within a second', () => {
    expect(MOMO_PLAY_DURATION_MS).toBeGreaterThan(0)
    expect(MOMO_PLAY_DURATION_MS).toBeLessThanOrEqual(900)
  })

  it('starts collapsed without mounting a stage or live announcement', () => {
    const html = renderToStaticMarkup(createElement(MomoPlayroom, { still: false }))
    expect(html).toContain('Play with Momo')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('hidden=""')
    expect(html).toContain('data-action-play="off"')
    expect(html).not.toContain('k-momo-play-actor')
    expect(html).not.toContain('role="status"')
    expect(html).not.toContain('High-five')
  })

  it('marks calm play for static treatment before an interaction', () => {
    const html = renderToStaticMarkup(createElement(MomoPlayroom, { still: true }))
    expect(html).toContain('k-momo-playroom is-still')
  })
})
