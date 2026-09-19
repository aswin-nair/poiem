import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { clay } from './tokens'

const SRC = fileURLToPath(new URL('../', import.meta.url))

function collectCss(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return collectCss(path)
    return entry.name.endsWith('.css') ? [readFileSync(path, 'utf8')] : []
  }).join('\n')
}

const css = collectCss(join(SRC, 'styles'))

function channel(value: number): number {
  const s = value / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function hex(value: string): [number, number, number] {
  const raw = value.replace('#', '')
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ]
}

function luminance(value: string): number {
  const [r, g, b] = hex(value)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  const [hi, lo] = first > second ? [first, second] : [second, first]
  return (hi + 0.05) / (lo + 0.05)
}

function cssHexToken(name: string): string {
  const value = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
  if (!value) throw new Error(`Missing hex token ${name}`)
  return value
}

function mix(foreground: string, background: string, alpha: number): string {
  const [fr, fg, fb] = hex(foreground)
  const [br, bg, bb] = hex(background)
  const r = Math.round(fr * alpha + br * (1 - alpha))
  const g = Math.round(fg * alpha + bg * (1 - alpha))
  const b = Math.round(fb * alpha + bb * (1 - alpha))
  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`
}

describe('enamel contrast and paint budgets', () => {
  it('keeps action labels AA-readable on every brand and danger fill', () => {
    const onBrand = cssHexToken('--ink')
    const onDanger = cssHexToken('--on-danger')
    const brandFills = [
      cssHexToken('--coral-hue'),
      cssHexToken('--coral-start'),
      cssHexToken('--clay-coral-base'),
      cssHexToken('--clay-coral-lift'),
    ]

    expect(css).toContain('--on-brand: var(--ink)')
    for (const fill of brandFills) {
      expect(contrast(onBrand, fill)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(onDanger, cssHexToken('--danger'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps ink readable on enamel, including inset darkening', () => {
    const darkened = mix('#1A1410', clay.base, clay.innerDarkAlpha)
    expect(contrast(clay.ink, clay.base)).toBeGreaterThanOrEqual(7)
    expect(contrast(clay.ink, clay.lift)).toBeGreaterThanOrEqual(7)
    expect(contrast(clay.ink, darkened)).toBeGreaterThanOrEqual(7)
    expect(contrast(clay.inkSoft, clay.base)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(clay.inkSoft, clay.lift)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the clay recipe on tokens and list rows on the cheap elevation', () => {
    expect(css).toContain('--clay-e1:')
    expect(css).toContain('--clay-e2:')
    expect(css).toContain('--clay-e3:')
    expect(css).toContain('--clay-squish:')
    const e1 = css.match(/--clay-e1:([^;]+);/)?.[1] ?? ''
    expect(e1).toContain('0 8px 14px')
    expect(e1).not.toContain('0 20px 36px')
  })

  it('does not encode over-budget as extra depth or danger', () => {
    const over = css.match(/\.k-meter\.is-over \.k-meter-fill\s*\{([^}]*)\}/g)?.join(' ') ?? ''
    expect(over).toContain('var(--k-over-fill)')
    expect(over).not.toMatch(/clay-e3|danger/)
  })

  it('never paints ticket totals with danger', () => {
    const ticket = css.match(/\.ticket[\s\S]{0,4000}/)?.[0] ?? ''
    expect(ticket).not.toMatch(/--danger/)
    expect(contrast(cssHexToken('--ink'), cssHexToken('--enamel'))).toBeGreaterThanOrEqual(7)
  })
})
