import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles/system/components.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }))

describe('shared press vocabulary', () => {
  it('chips, icon buttons, add rows and text buttons have a flat active state on the press timing', () => {
    for (const control of ['.k-chip', '.k-filter', '.k-icon-button', '.k-add-row', '.k-text-button']) {
      const resting = rules.filter(rule => rule.selector.includes(control) && !rule.selector.includes(':active'))
      expect(resting.some(rule => /transition:\s*transform\s+var\(--k-press\)/.test(rule.body)), control).toBe(true)
      const active = rules.filter(rule => rule.selector.includes(control) && rule.selector.includes(':active'))
      expect(active.some(rule => /transform:\s*translate\(2px,\s*2px\)/.test(rule.body) && /box-shadow:\s*none/.test(rule.body)), control).toBe(true)
    }
  })

  it('no control stacks two transforms on press', () => {
    for (const rule of rules.filter(rule => rule.selector.includes(':active') || rule.selector.includes('.is-pressed'))) {
      expect(rule.body, rule.selector).not.toMatch(/\b(?:translate|scale|rotate):\s*(?!none\b)[^;]+/)
    }
    const wrapper = rules.filter(rule => /\.pressable(?=\s|:|\.)/.test(rule.selector) && !rule.selector.includes('.pressable-face'))
    expect(wrapper.some(rule => /transform:\s*(?!none\b)[^;]+/.test(rule.body))).toBe(false)
  })
})
