import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesDir = new URL('../styles/', import.meta.url)
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const read = (path: string) => strip(readFileSync(new URL(path, stylesDir), 'utf8'))
const rules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }))
const stylesheets = (dir: URL): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory()
    ? stylesheets(new URL(`${entry.name}/`, dir)).map(path => `${entry.name}/${path}`)
    : entry.name.endsWith('.css') ? [entry.name] : [])
const scopedFiles = ['system/components.css', 'screens/kitchen.css', 'motion.css']

const forbiddenProperty = /(?:^|[;{])\s*(?:width|height|border(?:-\w+)?|filter|box-shadow)\s*:/

/* The only waivers. Every entry is a keyframe that animates `filter` or `box-shadow` and is
   reached only through components no page renders (`StreakCard`, `MealPath`, `PathNode`), so
   none of it can run in a daily flow. A waiver for a keyframe that no longer exists, or that
   no longer needs one, fails below, so this list cannot go stale. New recipes get no waiver. */
const waivedKeyframes: Record<string, string> = {
  'flame-flicker': 'StreakCard flame (.streak-fire in gamification.css): brightens with filter. StreakCard is not rendered by any page.',
  'at-risk-pulse': 'StreakCard at-risk halo (box-shadow). StreakCard is not rendered by any page. The pulse is loss-framed ("your streak is at risk") and must never be revived.',
  'node-breathe': 'PathNode current-node halo (box-shadow), reached only through MealPath, which no page renders.',
}

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

/* True when a declaration body delays an animation or transition, in any spelling: the
   `animation-delay` / `transition-delay` longhands (any case, vendor-prefixed, `calc` or
   `var` values) or a shorthand carrying a second literal time. */
function hasDelay(body: string): boolean {
  if (/(?:^|[;\s])(?:-\w+-)?(?:animation|transition)-delay\s*:/i.test(body)) return true
  for (const [, value] of body.matchAll(/(?:^|[;\s])(?:-\w+-)?(?:animation|transition)\s*:\s*([^;]+)/gi)) {
    const flat = value.replace(/(?:var|cubic-bezier|steps)\([^()]*\)/gi, ' ')
    for (const layer of flat.split(',')) {
      if ((layer.match(/(?:^|[\s(*+-])-?\d*\.?\d+m?s\b/g) ?? []).length > 1) return true
    }
  }
  return false
}

describe('daily motion rules', () => {
  it('no daily-flow rule transitions or animates width, height, border-width, filter or box-shadow', () => {
    for (const file of scopedFiles) {
      const css = read(file)
      for (const { selector, body } of rules(css)) {
        const transition = body.match(/transition(?:-property)?\s*:\s*([^;]+)/)?.[1]
        expect(transition ?? '', `${file}: ${selector.replace(/\s+/g, ' ')}`).not.toMatch(/\b(?:width|height|border(?:-\w+)?|filter|box-shadow|all)\b/)
      }
      for (const { name, body } of keyframes(css)) {
        if (file === 'motion.css' && name in waivedKeyframes) continue
        expect(body, `${file}: ${name}`).not.toMatch(forbiddenProperty)
      }
    }
  })

  it('every keyframe waiver is still present and still needed', () => {
    const present = new Map(keyframes(read('motion.css')).map(({ name, body }) => [name, body]))
    for (const [name, reason] of Object.entries(waivedKeyframes)) {
      expect(reason.length, name).toBeGreaterThan(40)
      expect(present.has(name), `${name} no longer exists in motion.css: delete its waiver`).toBe(true)
      expect(present.get(name)!, `${name} no longer animates a forbidden property: delete its waiver`).toMatch(forbiddenProperty)
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

  it('recognises a delay in every spelling', () => {
    for (const body of [
      'animation-delay: 60ms',
      'animation-delay:calc(var(--i) * 40ms)',
      'ANIMATION-DELAY : 1s',
      '-webkit-animation-delay: .1s',
      'transition-delay: 30ms',
      'animation: k-in 240ms var(--k-ease) 60ms both',
      'animation: k-in 240ms cubic-bezier(.2, .8, .2, 1) 0.06s both',
      'animation: k-in 240ms ease calc(var(--i) * 40ms) both',
      'animation: a 120ms ease, b 240ms ease 60ms',
    ]) expect(hasDelay(body), body).toBe(true)
    for (const body of [
      'animation: k-in 240ms var(--k-ease) both',
      'animation: k-in 240ms cubic-bezier(.2, .8, .2, 1) both',
      'animation: a 120ms ease, b 240ms ease',
      'animation: none',
      'transition: transform var(--k-press) var(--k-ease)',
      'opacity: 0',
    ]) expect(hasDelay(body), body).toBe(false)
  })

  it('sheet children have no animation delay', () => {
    const sheetRules = stylesheets(stylesDir).flatMap(file =>
      rules(read(file)).filter(rule => rule.selector.includes('k-log-sheet')).map(rule => ({ ...rule, file })))
    expect(sheetRules.length, 'the sheet rules were not found, so this test would pass vacuously').toBeGreaterThan(0)
    expect(sheetRules.some(rule => rule.file === 'screens/kitchen.css')).toBe(true)
    for (const rule of sheetRules) {
      expect(hasDelay(rule.body), `${rule.file}: ${rule.selector.replace(/\s+/g, ' ')} delays an animation`).toBe(false)
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
