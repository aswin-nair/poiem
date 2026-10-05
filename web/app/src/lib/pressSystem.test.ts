import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../styles/${path}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const parse = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  parts: selector.split(',').map(part => part.trim()),
  body,
}))

const components = parse(read('system/components.css'))
const flows = parse(read('screens/flows.css'))
const insights = parse(read('screens/insights.css'))
const kitchen = parse(read('screens/kitchen.css'))
const daily = [...components, ...flows, ...insights, ...kitchen]

type Rule = ReturnType<typeof parse>[number]

/* A rule targets `control` itself when a selector part is the control, optionally followed by
   pseudo-classes. `.flow-meal-options button svg:active` is a different element. */
const targets = (rule: Rule, control: string, pseudo: RegExp | null) => rule.parts.some(part => {
  if (!part.startsWith(control)) return false
  const rest = part.slice(control.length)
  return pseudo ? rest.startsWith(':') && pseudo.test(rest) : rest === ''
})
const resting = (rules: Rule[], control: string) => rules.filter(rule => targets(rule, control, null))
const pressed = (rules: Rule[], control: string) => rules.filter(rule => targets(rule, control, /:active\b/))

describe('shared press vocabulary', () => {
  it('chips, icon buttons, add rows and text buttons have a flat active state on the press timing', () => {
    for (const control of ['.k-chip', '.k-filter', '.k-icon-button', '.k-add-row', '.k-text-button']) {
      const rest = components.filter(rule => rule.selector.includes(control) && !rule.selector.includes(':active'))
      expect(rest.some(rule => /transition:\s*transform\s+var\(--k-press\)/.test(rule.body)), control).toBe(true)
      const active = components.filter(rule => rule.selector.includes(control) && rule.selector.includes(':active'))
      expect(active.some(rule => /transform:\s*translate\(2px,\s*2px\)/.test(rule.body) && /box-shadow:\s*none/.test(rule.body)), control).toBe(true)
    }
  })

  it('no control stacks two transforms on press', () => {
    for (const rule of components.filter(rule => rule.selector.includes(':active') || rule.selector.includes('.is-pressed'))) {
      expect(rule.body, rule.selector).not.toMatch(/\b(?:translate|scale|rotate):\s*(?!none\b)[^;]+/)
    }
    const wrapper = components.filter(rule => /\.pressable(?=\s|:|\.)/.test(rule.selector) && !rule.selector.includes('.pressable-face'))
    expect(wrapper.some(rule => /transform:\s*(?!none\b)[^;]+/.test(rule.body))).toBe(false)
  })

  it('no pressed rule in the daily screens or the system layer carries two transforms', () => {
    for (const rule of daily.filter(rule => rule.selector.includes(':active') || rule.selector.includes('.is-pressed'))) {
      const transform = rule.body.match(/(?:^|[;\s])transform:\s*([^;]+)/)?.[1].trim()
      const individual = /(?:^|[;\s])(?:translate|scale|rotate):\s*(?!none\b)[^;]+/.test(rule.body)
      expect(transform?.match(/[a-z]+\(/g)?.length ?? 0, `${rule.selector}: ${transform}`).toBeLessThanOrEqual(1)
      expect(Boolean(transform && transform !== 'none') && individual, `${rule.selector} mixes transform with an individual transform property`).toBe(false)
    }
  })

  it('the FAB depresses with one 3px translation and no squash', () => {
    const fab = components.filter(rule => rule.selector.includes(':active') && rule.selector.includes('.nav-fab-face'))
    expect(fab.length).toBeGreaterThan(0)
    for (const rule of fab) expect(rule.body, rule.selector).toMatch(/transform:\s*translate\(3px,\s*3px\)\s*;/)
  })
})

describe('flat press on the remaining daily controls', () => {
  const controls: [string, Rule[], string][] = [
    ['.k-saved .discover-chip', flows, 'flows.css'],
    ['.k-flow .chip', flows, 'flows.css'],
    ['.flow-meal-options button', flows, 'flows.css'],
    ['.k-saved .star-btn', flows, 'flows.css'],
    ['.k-insights .range-chip', insights, 'insights.css'],
    ['.k-insights .progress-log-btn', insights, 'insights.css'],
    ['.k-insights .history-link-card', insights, 'insights.css'],
    ['.k-shelf button', kitchen, 'kitchen.css'],
  ]

  it.each(controls)('%s presses flat on the press timing', (control, rules, file) => {
    const rest = resting(rules, control)
    expect(rest.some(rule => /(?:^|[;\s])transition:\s*transform\s+var\(--k-press\)\s+var\(--k-ease\)/.test(rule.body)), `${file}: ${control} needs the press transition at rest`).toBe(true)
    const active = pressed(rules, control)
    expect(active.some(rule => /(?:^|[;\s])transform:\s*translate\(2px,\s*2px\)/.test(rule.body) && /box-shadow:\s*none/.test(rule.body)), `${file}: ${control}`).toBe(true)
    for (const rule of active) {
      expect(rule.body, `${rule.selector} must not reset or stack the press`).not.toMatch(/(?:^|[;\s])transform:\s*(?:none|[^;]*\)\s*[a-z]+\()/)
      expect(rule.body, `${rule.selector} must keep one transform`).not.toMatch(/(?:^|[;\s])(?:translate|scale|rotate):/)
      expect(rule.body, `${rule.selector} must not restyle the pressed or selected face`).not.toMatch(/(?:^|[;\s])(?:background|color|border)[\w-]*:/)
    }
  })
})
