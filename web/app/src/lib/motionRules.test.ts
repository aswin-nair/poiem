import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../styles/${path}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }))
const scopedFiles = ['system/components.css', 'screens/kitchen.css', 'motion.css']

/* These legacy recipes predate the slice and are outside its daily controls:
   account field focus, retired history-link chrome and the unused MealPath art.
   Keep the allow-list exact so it cannot conceal a new daily-flow tween. */
const legacyExceptions = new Set([
  '.field input:focus, .field textarea:focus',
  '.history-link-card, .settings-data-btn, .settings-link-row',
  '.meal-path-progress',
  '.meal-path-mascot',
])

/* Existing legacy illustrations still have independent recipes. None belongs
   to the slice's controls, meter, route or log sheet; new recipes get no waiver. */
const legacyArt = new Set(['flame-flicker', 'at-risk-pulse', 'node-breathe'])

function keyframes(css: string) {
  const result: { name: string; body: string }[] = []
  for (const match of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const start = match.index + match[0].length
    let depth = 1
    let end = start
    while (end < css.length && depth) {
      if (css[end] === '{') depth++
      if (css[end] === '}') depth--
      end++
    }
    result.push({ name: match[1], body: css.slice(start, end - 1) })
  }
  return result
}

describe('daily motion rules', () => {
  it('no daily-flow rule transitions or animates width, height, border-width, filter or box-shadow', () => {
    for (const file of scopedFiles) {
      const css = read(file)
      for (const { selector, body } of rules(css)) {
        const normalized = selector.replace(/\s+/g, ' ')
        if (file === 'motion.css' && legacyExceptions.has(normalized)) continue
        const transition = body.match(/transition(?:-property)?\s*:\s*([^;]+)/)?.[1]
        expect(transition ?? '', `${file}: ${normalized}`).not.toMatch(/\b(?:width|height|border(?:-\w+)?|filter|box-shadow|all)\b/)
      }
      for (const { name, body } of keyframes(css)) {
        if (file === 'motion.css' && legacyArt.has(name)) continue
        expect(body, `${file}: ${name}`).not.toMatch(/(?:^|[;{])\s*(?:width|height|border(?:-\w+)?|filter|box-shadow)\s*:/)
      }
    }
  })

  it('route arrival has no rotation and at most 12px of travel', () => {
    const css = read('motion.css').split('.meal-type-btn')[0]
    expect(css).not.toMatch(/rotate\(/)
    const distances = [...css.matchAll(/translate[XY]\((-?[\d.]+)px\)/g)].map(match => Math.abs(Number(match[1])))
    expect(distances.length).toBeGreaterThan(0)
    expect(Math.max(...distances)).toBeLessThanOrEqual(12)
    expect(css).toContain('.k-workspace-col > .app-main')
    expect(css).toContain('240ms')
  })

  it('sheet children have no animation delay', () => {
    const css = read('screens/kitchen.css')
    for (const rule of rules(css).filter(rule => rule.selector.includes('.k-log-sheet >'))) {
      expect(rule.body).not.toMatch(/animation(?:-delay)?:/)
    }
  })

  it('sheet travel is at most 28px', () => {
    const css = read('screens/kitchen.css').split('.k-log-head')[0]
    const distances = [...css.matchAll(/translateY\((-?[\d.]+)px\)/g)].map(match => Math.abs(Number(match[1])))
    expect(distances.length).toBeGreaterThan(0)
    expect(Math.max(...distances)).toBeLessThanOrEqual(28)
    expect(css).toContain('240ms')
    expect(css).toContain('120ms')
  })
})
