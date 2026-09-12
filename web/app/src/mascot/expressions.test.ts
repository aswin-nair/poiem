import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { momoExpression, type MomoExpression } from './expressions'
import { Momo } from '../components/Momo'
import type { Mood } from './behaviors'

describe('Momo facial expressions', () => {
  it.each([
    ['neutral', 'still', false, 'neutral'],
    ['excited', 'still', false, 'happy'],
    ['proud', 'still', false, 'happy'],
    ['curious', 'still', false, 'thinking'],
    ['neutral', 'ponder', false, 'thinking'],
    ['neutral', 'still', true, 'thinking'],
    ['neutral', 'poke_hop', false, 'surprised'],
    ['neutral', 'wave_at_user', false, 'wink'],
    ['neutral', 'idle_blink', false, 'blink'],
    ['sleepy', 'still', false, 'sleepy'],
  ] as const)('maps %s / %s / thinking=%s to %s', (mood, pose, thinking, expected) => {
    expect(momoExpression(mood, pose, thinking)).toBe(expected)
  })

  it.each([
    ['neutral', 'still', 'momo-open-eyes'],
    ['excited', 'still', 'momo-happy-mouth'],
    ['curious', 'still', 'momo-thinking-eyes'],
    ['neutral', 'poke_hop', 'momo-mouth-fill'],
    ['neutral', 'wave_at_user', 'momo-wink-eye'],
    ['sleepy', 'still', 'momo-sleepy-eyes'],
    ['neutral', 'idle_blink', 'momo-blink-eyes'],
  ] as Array<[Mood, string, string]>)('renders actual facial features for %s / %s', (mood, pose, feature) => {
    const html = renderToStaticMarkup(createElement(Momo, { mood, pose }))
    expect(html).toContain(feature)
    expect(html).toContain('expression-momo')
    expect(html).not.toContain('<image')
    expect(html).not.toContain('momo-mascotvibe-eye-cover')
    expect(html).not.toContain('class="momo-art mascotvibe-momo')
  })

  it('wears a whole outfit with expressive artwork, and tucks the steam under a hat', () => {
    const html = renderToStaticMarkup(createElement(Momo, { mood: 'proud', outfit: { head: 'chef-hat', neck: 'scarf' } }))
    expect(html).toContain('data-expression="happy"')
    expect(html).toContain('momo-chef-hat')
    expect(html).toContain('momo-scarf')
    expect(html).not.toContain('momo-steam')
    expect(renderToStaticMarkup(createElement(Momo, { mood: 'sleepy' }))).toContain('momo-steam')
  })

  it.each([
    ['curious', 'momo-curious-eyes'], ['proud', 'momo-wink-eye'],
    ['skeptical', 'momo-skeptical-eyes'], ['celebrating', 'momo-happy-mouth'],
    ['dramatic', 'momo-mouth-fill'], ['caught_snacking', 'momo-snack-crumbs'],
    ['confetti', 'momo-confetti'],
  ] as Array<[MomoExpression, string]>)('renders the named %s expression without motion', (expression, feature) => {
    const html = renderToStaticMarkup(createElement(Momo, { expression, pose: 'still' }))
    expect(html).toContain(`data-expression="${expression}"`)
    expect(html).toContain(feature)
  })

  it('reacts to big celebrations and dramatic pokes with named faces', () => {
    expect(momoExpression('excited', 'celebrate_big', false)).toBe('confetti')
    expect(momoExpression('neutral', 'poke_spin', false)).toBe('dramatic')
  })
})
