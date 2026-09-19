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

/** Held to the whole contract: type on the approved steps, nothing raised, nothing tilted. */
const MIGRATED = [
  'styles/system/fonts.css',
  'styles/system/foundations.css',
  'styles/system/momo.css',
  'styles/screens/today.css',
] as const

/**
 * Flattened but not yet retyped. These sheets are held to every rule except the
 * type steps, where `TYPE_DEBT` records exactly how many off-step sizes each one
 * still sets. Lower a number when you fix a size; the count has to match, so it
 * cannot quietly go stale in either direction.
 */
const FLATTENED = [
  'styles/system/components.css',
  'styles/screens/kitchen.css',
  'styles/screens/flows.css',
  'styles/screens/insights.css',
  'styles/screens/you.css',
  'styles/screens/pages.css',
] as const

const TYPE_DEBT: Record<(typeof FLATTENED)[number], number> = {
  'styles/system/components.css': 8,
  'styles/screens/kitchen.css': 2,
  'styles/screens/flows.css': 10,
  'styles/screens/insights.css': 8,
  'styles/screens/you.css': 4,
  'styles/screens/pages.css': 5,
}

const APPROVED_TYPE = new Set([12, 14, 16, 18, 40, 64])
const CONTRACT_SPACE = new Set(['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'])
const MASCOT_ART = /momo|sticker|plate|burst|nav-fab-face svg|empty-plate/
const GEOMETRIC_ROTATION = /(?:^|[^\d.])(?:-)?(?:45|90|135|180|225|270|315)(?:\.\d+)?deg/

/* An offset block says "this floats above the page", so overlays and the tab bar keep theirs. */
const FLOATS = /toast|k-sheet|portion-sheet|modal-sheet|date-modal(?!-)|bottom-nav|nav-fab|settings-results|celebrate-inner/
/* One hero per route stays the loudest surface on it. */
const HERO = /is-hero|about-hero|flow-analysis|flow-review-summary|manual-summary/
/* Drawn rather than built: the mascot, his wardrobe, a torn ticket stub. */
const DRAWN = /momo|wardrobe|celebrate-piece|torn-stub/

/** Innermost blocks are declarations; removing them leaves selectors and at-rules. */
const selectorsOf = (css: string) => withoutComments(css).replace(/\{[^{}]*\}/g, ';')

/**
 * Font sizes in px. The `font` shorthand carries a line height after a slash,
 * which is not a size, and rem is 16px because nothing rescales the root.
 */
function fontSizesOf(css: string) {
  const sizes: { text: string; px: number }[] = []
  for (const declaration of css.matchAll(/font(?:-size)?\s*:\s*([^;}]+)/g)) {
    const value = declaration[1].replace(/\/\s*[\d.]+[a-z%]*/g, '')
    for (const size of value.matchAll(/(\d*\.?\d+)(px|rem)/g)) {
      sizes.push({ text: size[0], px: size[2] === 'rem' ? Number(size[1]) * 16 : Number(size[1]) })
    }
  }
  return sizes
}

const offContractType = (css: string) => fontSizesOf(css).filter(size => !APPROVED_TYPE.has(size.px))

/** Selector and declarations for each innermost block. Keyframe steps are not rules. */
function* rulesOf(css: string) {
  const block = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = block.exec(css))) {
    const selector = match[1].replace(/\s+/g, ' ').trim()
    if (/^(?:from|to|[\d.]+%)(?:\s*,\s*(?:from|to|[\d.]+%))*$/.test(selector)) continue
    yield { selector, body: match[2] }
  }
}

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
      const offContract = offContractType(css)
      expect(offContract.map(size => size.text), path).toEqual([])
    }
    for (const path of [...MIGRATED, ...FLATTENED]) {
      const css = withoutComments(read(path))
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

  it('lets the flattened sheets keep their old type sizes without adding any', () => {
    for (const path of FLATTENED) {
      const sizes = offContractType(withoutComments(read(path)))
      expect(sizes.length, `${path} sets ${sizes.length} sizes off the contract steps (${sizes.map(size => size.text).join(', ')}); TYPE_DEBT says ${TYPE_DEBT[path]}`).toBe(TYPE_DEBT[path])
    }
  })

  it('forbids resting tilt on migrated text, controls, cards and navigation', () => {
    for (const path of [...MIGRATED, ...FLATTENED]) {
      const css = withoutComments(read(path))
      for (const { selector, body } of rulesOf(css)) {
        if (/:(?:hover|active)\b/.test(selector)) continue
        const rotation = body.match(/(?<![\w-])rotate\s*:\s*([^;}]+)/)
          ?? body.match(/(?<![\w-])transform\s*:\s*([^;}]*rotate\([^)]*\)[^;}]*)/)
        if (!rotation || /none|0deg/.test(rotation[1])) continue
        if (MASCOT_ART.test(selector) || GEOMETRIC_ROTATION.test(rotation[1])) continue
        throw new Error(`${path} ${selector} rests at ${rotation[1]}`)
      }
    }
  })

  it('keeps every resting surface flat, so only overlays, heroes and drawings cast a shadow', () => {
    for (const path of [...MIGRATED, ...FLATTENED]) {
      const css = withoutComments(read(path))
      for (const { selector, body } of rulesOf(css)) {
        for (const shadow of body.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
          const value = shadow[1].trim()
          if (/^none/.test(value) || /inset/.test(value)) continue
          // A focus ring or a hairline is not an offset block.
          if (!/var\(--k-shadow|\d+px\s+\d+px\s+0/.test(value)) continue
          if (FLOATS.test(selector) || HERO.test(selector) || DRAWN.test(selector)) continue
          throw new Error(`${path} ${selector} rests on ${value}`)
        }
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
