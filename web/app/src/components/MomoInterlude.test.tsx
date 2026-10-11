import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MomoInterludeProp } from './MomoInterlude'
import type { MomoInterludeStory } from '../lib/momoInterludes'

describe('Momo story props', () => {
  it.each(['ticket-plane', 'heading-polish', 'saved-waiter'] as const)('%s is a decorative local drawing without controls', story => {
    const html = renderToStaticMarkup(<MomoInterludeProp story={story} word="Today" />)
    expect(html).toContain(`is-${story}`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/<button|<a |<input|<img|<image|https?:\/\//)
  })

  it('copies only approved public interface words into the sign or ordinary prop', () => {
    for (const word of ['Today', 'Water', 'Saved', 'Insights', 'Journey', 'About', 'Yesterday']) {
      expect(renderToStaticMarkup(<MomoInterludeProp story="heading-polish" word={word} />)).toContain(`>${word}</span>`)
    }
    for (const story of [undefined, 'ticket-plane', 'heading-polish', 'saved-waiter'] satisfies Array<MomoInterludeStory | undefined>) {
      const html = renderToStaticMarkup(<MomoInterludeProp story={story} word="Private meal note & 1850 calories" />)
      expect(html).not.toContain('Private')
      expect(html).not.toContain('1850')
      if (!story || story === 'heading-polish') expect(html).toContain('TA-DA!')
    }
  })

  it('keeps every prop animation finite and inside the box measured for protection', () => {
    const css = readFileSync(new URL('../styles/screens/momo-interlude.css', import.meta.url), 'utf8')
    const propRule = css.match(/\.k-momo-interlude \.k-momo-story-prop\s*\{([^}]+)\}/)?.[1]
    expect(propRule).toContain('width: 108px')
    expect(propRule).toContain('height: 64px')
    expect(propRule).toContain('overflow: hidden')
    expect(propRule).toContain('animation: none')
    expect(css).not.toContain('infinite')
    expect(css).toContain('.k-momo-interlude.is-static .k-momo-story-prop * { animation: none; }')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
