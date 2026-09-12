import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../', import.meta.url))
const read = (path: string) => readFileSync(join(SRC, path), 'utf8')
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const LAYERED = {
  'styles/system/tokens.css': 'system',
  'styles/system/components.css': 'system',
  'styles/screens/kitchen.css': 'screens',
  'styles/screens/flows.css': 'screens',
} as const

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
})
