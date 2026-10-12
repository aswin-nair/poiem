import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../styles/${path}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  parts: selector.split(',').map(part => part.trim()),
  body,
}))

const insights = rules(read('screens/insights.css'))
const bodyFor = (selector: string) => insights.filter(rule => rule.parts.includes(selector)).map(rule => rule.body).join(';')

/* An earned badge sits on the butter sticker face in both themes. The legacy `.badge-name` and
   `.badge-desc` colours follow the page ink, which turns light in dark mode (1.3:1 on butter),
   so the card must be the only thing that sets the text colour. */
describe('Insights achievement badges', () => {
  it('lets the name and description take the card colour', () => {
    expect(bodyFor('.k-insights .badge-name')).toMatch(/color:\s*inherit/)
    expect(bodyFor('.k-insights .badge-desc')).toMatch(/color:\s*inherit/)
  })

  it('draws an earned card with sticker ink on the butter face', () => {
    const earned = bodyFor('.k-insights .badge-card.unlocked')
    expect(earned).toMatch(/background:\s*var\(--k-sticker-butter\)/)
    expect(earned).toMatch(/(^|[;\s])color:\s*var\(--k-sticker-ink\)/)
  })
})
