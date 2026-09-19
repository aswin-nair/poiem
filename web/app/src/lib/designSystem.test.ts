import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../', import.meta.url))
const read = (path: string) => readFileSync(join(SRC, path), 'utf8')
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const LAYERED = {
  'styles/system/fonts.css': 'system',
  'styles/system/tokens.css': 'system',
  'styles/system/components.css': 'system',
  'styles/system/foundations.css': 'system',
  'styles/system/momo.css': 'system',
  'styles/screens/kitchen.css': 'screens',
  'styles/screens/today.css': 'screens',
  'styles/screens/flows.css': 'screens',
  'styles/screens/insights.css': 'screens',
  'styles/screens/you.css': 'screens',
  'styles/screens/admin.css': 'screens',
  'styles/screens/first-run.css': 'screens',
  'styles/screens/pages.css': 'screens',
  'styles/screens/account.css': 'screens',
} as const

const MIGRATED = [
  'styles/system/fonts.css',
  'styles/system/foundations.css',
  'styles/screens/today.css',
] as const

const APPROVED_TYPE = new Set(['12px', '14px', '16px', '18px', '40px', '64px'])
const CONTRACT_SPACE = new Set(['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'])
const MASCOT_ART = /momo|sticker|plate|burst|nav-fab-face svg|empty-plate/
const GEOMETRIC_ROTATION = /(?:^|[^\d.])(?:-)?(?:45|90|135|180|225|270|315)(?:\.\d+)?deg/

/** Innermost blocks are declarations; removing them leaves selectors and at-rules. */
const selectorsOf = (css: string) => withoutComments(css).replace(/\{[^{}]*\}/g, ';')

const imports = [...read('index.css').matchAll(/@import '([^']+)'/g)].map(match => match[1])

describe('Poiem design system', () => {
  it('declares the cascade order once, before anything else, and loads accessibility overrides last', () => {
    expect(withoutComments(read('index.css')).trim().split(/\r?\n/)[0]).toBe('@layer legacy, system, screens;')
    expect(imports.at(-1)).toBe('./styles/a11y.css')
    const layered = Object.keys(LAYERED)
    expect(imports.slice(-layered.length - 1, -1)).toEqual(layered.map(path => `./${path}`))
  })

  it('keeps every older stylesheet in the legacy layer, so the system wins without specificity tricks', () => {
    const legacy = imports.filter(path => !(path.slice(2) in LAYERED) && !path.endsWith('a11y.css'))
    expect(legacy.length).toBeGreaterThan(0)
    for (const path of legacy) {
      expect(withoutComments(read(path.slice(2))).trimStart(), path).toMatch(/^@layer legacy \{/)
    }
  })

  it('writes system and screen styles without ID selectors or !important', () => {
    for (const [path, layer] of Object.entries(LAYERED)) {
      const css = read(path)
      expect(withoutComments(css).trimStart(), path).toMatch(new RegExp(`^@layer ${layer} \\{`))
      expect(withoutComments(css), path).not.toContain('!important')
      expect(selectorsOf(css), path).not.toMatch(/#[A-Za-z_-]/)
    }
  })

  it('keeps migrated sheets on the contract type and spacing steps', () => {
    for (const path of MIGRATED) {
      const css = withoutComments(read(path))
      for (const match of css.matchAll(/font(?:-size)?\s*:\s*([^;]+)/g)) {
        const size = match[1].match(/(\d+(?:\.\d+)?)px/)
        if (!size) continue
        expect(APPROVED_TYPE.has(`${size[1]}px`), `${path} uses ${size[0]}`).toBe(true)
      }
      for (const match of css.matchAll(/var\(--k-space-([^)]+)\)/g)) {
        if (/^[1-8]$/.test(match[1])) continue
        expect(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'], path).toContain(match[1])
      }
    }
    const tokens = withoutComments(read('styles/system/tokens.css'))
    for (const name of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']) {
      const match = tokens.match(new RegExp(`--k-space-${name}:\\s*([^;]+);`))
      expect(match, name).toBeTruthy()
      expect(CONTRACT_SPACE.has(match![1].trim()), name).toBe(true)
    }
  })

  it('forbids resting tilt on migrated text, controls, cards and navigation', () => {
    for (const path of MIGRATED) {
      const css = withoutComments(read(path))
      const rule = /([^{}]+)\{([^{}]*)\}/g
      let match
      while ((match = rule.exec(css))) {
        const selector = match[1].replace(/\s+/g, ' ').trim()
        const body = match[2]
        if (/@keyframes|:(?:hover|active)\b/.test(selector)) continue
        const rotation = body.match(/(?<![\w-])(?:rotate|transform)\s*:\s*([^;]+)/)
        if (!rotation || /none|0deg/.test(rotation[1])) continue
        if (MASCOT_ART.test(selector) || GEOMETRIC_ROTATION.test(rotation[1])) continue
        throw new Error(`${path} ${selector} rests at ${rotation[1]}`)
      }
    }
  })

  it('gives migrated screens only the three surface variants', () => {
    const css = withoutComments(read('styles/system/foundations.css'))
    expect(css).toMatch(/\.k-surface\b/)
    expect(css).toMatch(/\.k-surface\.is-outlined/)
    expect(css).toMatch(/\.k-surface\.is-hero/)
    expect(css).not.toMatch(/\.k-surface\.is-(?:raised|inset|clay|poster)/)
  })
})
