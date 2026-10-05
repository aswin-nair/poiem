import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { dayRingProgress } from '../lib/dayRing'
import { DayRing } from './DayRing'

const empty = dayRingProgress([], 0, 'light')
const complete = dayRingProgress([{ mealType: 'breakfast', source: 'manual' }], 0, 'light')
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const todayCss = withoutComments(readFileSync(new URL('../styles/screens/today.css', import.meta.url), 'utf8'))
const tokensCss = withoutComments(readFileSync(new URL('../styles/system/tokens.css', import.meta.url), 'utf8'))
/** The declarations of the first rule whose whole selector is `selector` (not one of a group). */
const ruleBody = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return todayCss.match(new RegExp(`(?:^|[{}])\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

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
it('plays the check for the log’s capped duration', () => {
  expect(renderToStaticMarkup(<DayRing progress={complete} justClosed />)).toContain('--k-ring-check-ms:240ms')
  expect(renderToStaticMarkup(<DayRing progress={complete} justClosed closeMs={120} />)).toContain('--k-ring-check-ms:120ms')
  expect(renderToStaticMarkup(<DayRing progress={complete} closeMs={120} />)).not.toContain('--k-ring-check-ms')
})

describe('ring geometry', () => {
  it('starts every arc at 12 o’clock with static geometry, not motion', () => {
    const html = renderToStaticMarkup(<DayRing progress={complete} />)
    // An SVG circle's stroke starts at 3 o'clock; a quarter turn back puts it at 12.
    const turned = html.match(/<g transform="rotate\(-90 56 56\)">([\s\S]*?)<\/g><\/svg>/)?.[1] ?? ''
    expect(turned.match(/class="k-ring-fill/g)).toHaveLength(3)
    expect(ruleBody('.k-ring-graphic svg')).not.toMatch(/transform|rotate|transition|animation/)
  })

  it('draws round caps, and no cap dot on an arc with nothing in it', () => {
    expect(ruleBody('.k-ring-fill')).toMatch(/stroke-linecap:\s*round/)
    expect(ruleBody('.k-ring-fill.is-empty')).toMatch(/stroke-linecap:\s*butt/)
    const partial = dayRingProgress([{ mealType: 'breakfast', source: 'manual' }], 0, 'regular')
    const html = renderToStaticMarkup(<DayRing progress={partial} />)
    expect(html).toContain('k-ring-fill k-ring-fill-logged"')
    expect(html).toContain('k-ring-fill k-ring-fill-meals"')
    expect(html).toContain('k-ring-fill k-ring-fill-detail is-empty"')
  })

  it('styles a completed legend item apart from the rest', () => {
    const partial = dayRingProgress([{ mealType: 'breakfast', source: 'manual' }], 0, 'regular')
    const html = renderToStaticMarkup(<DayRing progress={partial} />)
    expect(html.match(/<li class="is-done">/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(ruleBody('.k-ring-legend li')).toMatch(/color:\s*var\(--k-role-text-muted\)/)
    expect(ruleBody('.k-ring-legend li.is-done')).toMatch(/color:\s*var\(--k-role-text\)/)
  })

  it('states the step count once for assistive tech', () => {
    const html = renderToStaticMarkup(<DayRing progress={complete} />)
    expect(html.match(/chosen (?:logging )?steps complete/g)).toHaveLength(1)
    expect(html).toContain('role="img" aria-label="1 of 1 chosen steps complete"')
    expect(html).toMatch(/<h2 id="[^"]+">Your day<\/h2>/)
  })
})

describe('ring contrast', () => {
  type Theme = 'light' | 'dark'
  const [lightTokens, darkTokens] = tokensCss.split(':root[data-theme="dark"]')

  /** A `--k-*` colour as hex for a theme, following `var()` aliases (dark falls back to light). */
  function hexOf(name: string, theme: Theme): string {
    const pattern = new RegExp(`${name}:\\s*(#[0-9a-f]{6}|var\\((--[\\w-]+)\\))\\s*;`, 'i')
    const match = (theme === 'dark' ? darkTokens.match(pattern) : null) ?? lightTokens.match(pattern)
    if (!match) throw new Error(`No ${theme} value for ${name}`)
    return match[2] ? hexOf(match[2], theme) : match[1]
  }
  // WCAG 2 relative luminance and contrast ratio (same formula as visualTheme.test.ts and clay-contrast.test.ts).
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(start => channel(Number.parseInt(hex.slice(start, start + 2), 16)))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('keeps every arc and legend colour at 3:1 or more against the section surface, light and dark', () => {
    const surface = ruleBody('.k-ring').match(/background:\s*var\((--[\w-]+)\)/)?.[1]
    expect(surface).toBeTruthy()
    const used = new Set<string>()
    for (const commitment of ['light', 'regular', 'detailed'] as const) {
      const html = renderToStaticMarkup(<DayRing progress={dayRingProgress([{ mealType: 'lunch', source: 'manual' }], 0, commitment)} />)
      for (const match of html.matchAll(/(?:stroke="|background:)var\((--[\w-]+)\)/g)) used.add(match[1])
    }
    expect(used.size).toBeGreaterThan(0)
    for (const token of used) {
      for (const theme of ['light', 'dark'] as const) {
        const ratio = contrast(hexOf(token, theme), hexOf(surface!, theme))
        expect(ratio, `${token} on ${surface} (${theme}) is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
