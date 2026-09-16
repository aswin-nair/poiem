import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles/product-ui.css', import.meta.url), 'utf8')
const darkStyles = readFileSync(new URL('../styles/dark-mode.css', import.meta.url), 'utf8')
const imports = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

type Theme = 'light' | 'dark'
const [lightTokens, darkTokens] = tokens.split(':root[data-theme="dark"]')

function color(name: string, theme: Theme = 'light'): string {
  const pattern = new RegExp(`${name}:\\s*(#[0-9a-f]{6}|var\\(--[a-z-]+\\));`, 'i')
  const value = (theme === 'dark' ? darkTokens.match(pattern)?.[1] : undefined)
    ?? lightTokens.match(pattern)?.[1]
  if (!value) throw new Error(`Missing ${theme} theme color: ${name}`)
  return value.startsWith('var(') ? color(value.slice(4, -1), theme) : value.slice(1)
}

function luminance(hex: string) {
  const channels = [0, 2, 4].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}

function contrast(text: string, background: string, theme: Theme = 'light') {
  const a = luminance(color(text, theme))
  const b = luminance(color(background, theme))
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}

describe('shared visual theme', () => {
  it('owns button and field recipes in their component files, after page styles', () => {
    expect(imports.indexOf('components/buttons.css')).toBeGreaterThan(imports.indexOf('product-ui.css'))
    expect(imports.indexOf('components/forms.css')).toBeGreaterThan(imports.indexOf('product-ui.css'))
    expect(styles).not.toContain('.pressable-face')
    expect(contrast('--ink-soft', '--disabled-fill')).toBeGreaterThanOrEqual(4.5)
  })
  it('resolves every stylesheet import from the source folder', () => {
    for (const [, relativePath] of imports.matchAll(/@import ['"]([^'"]+)['"]/g)) {
      expect(existsSync(new URL(`../${relativePath}`, import.meta.url)), relativePath).toBe(true)
    }
  })
  it('serves the first-paint appearance script before the production app fallback', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    const config = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8')) as {
      rewrites: { source: string; destination: string }[]
    }
    expect(html).toContain('<script src="%BASE_URL%appearance-init.js"></script>')
    expect(existsSync(new URL('../../public/appearance-init.js', import.meta.url))).toBe(true)
    const scriptRoute = config.rewrites.findIndex(route => route.source === '/app/appearance-init.js')
    const fallbackRoute = config.rewrites.findIndex(route => route.source === '/app/(.*)')
    expect(scriptRoute).toBeGreaterThanOrEqual(0)
    expect(fallbackRoute).toBeGreaterThan(scriptRoute)
    expect(config.rewrites[scriptRoute].destination).toBe('/appearance-init.js')
  })
  it('keeps ink readable on every colourful sticker and action surface', () => {
    for (const background of ['--fun-yellow', '--fun-green', '--fun-blue', '--fun-pink', '--fun-lilac', '--coral-hue']) {
      expect(contrast('--ink', background), `Ink on ${background}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps regular labels readable against both neutral light surfaces', () => {
    for (const text of ['--ink', '--ink-soft', '--ink-mute', '--coral-text']) {
      for (const background of ['--paper', '--paper-card']) {
        expect(contrast(text, background), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('gives dark mode a deliberate raised and floating surface hierarchy', () => {
    expect(tokens).toContain(':root[data-theme="dark"]')
    const levels = ['--paper', '--paper-card', '--paper-raised', '--paper-float']
      .map(name => luminance(color(name, 'dark')))
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]).toBeGreaterThan(levels[index - 1])
    }
    expect(darkStyles).toContain('.you-refresh .you-header')
    expect(darkStyles).toContain('.app-shell .bottom-nav')
    expect(imports.indexOf('dark-mode.css')).toBeGreaterThan(imports.indexOf('appearance.css'))
  })

  for (const theme of ['light', 'dark'] as const) {
    it(`keeps ${theme} reading, sticker, and selected surfaces readable`, () => {
      for (const text of ['--ink', '--ink-soft', '--ink-mute']) {
        for (const background of ['--paper', '--paper-card', '--paper-raised', '--paper-float']) {
          expect(contrast(text, background, theme), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5)
        }
      }
      for (const background of ['--fun-yellow', '--fun-blue', '--fun-green', '--fun-pink', '--fun-lilac']) {
        expect(contrast('--ink', background, theme), `Ink on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const background of ['--selection-soft', '--selection-hover']) {
        expect(contrast('--selection', background, theme), `Selection on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrast('--on-selection', '--selection', theme)).toBeGreaterThanOrEqual(4.5)
      expect(contrast('--ink-soft', '--disabled-fill', theme)).toBeGreaterThanOrEqual(4.5)
      expect(contrast('--control-border', '--paper-card', theme)).toBeGreaterThanOrEqual(3)
    })

    it(`keeps ${theme} brand and Momo scene labels readable`, () => {
      for (const background of ['--coral-hue', '--coral-start', '--clay-coral-base', '--clay-coral-lift']) {
        expect(contrast('--on-brand', background, theme), `Brand label on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const background of ['--scene', '--scene-lift']) {
        expect(contrast('--scene-ink', background, theme), `Scene label on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const [text, background] of [['--protein-text', '--fun-blue'], ['--carbs-text', '--fun-yellow'], ['--fat-text', '--fun-green'], ['--danger-text', '--danger-soft']]) {
        expect(contrast(text, background, theme), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('keeps the first paint and browser chrome aligned with the page palette', () => {
    const bootstrap = readFileSync(new URL('../../public/appearance-init.js', import.meta.url), 'utf8')
    const appearance = readFileSync(new URL('./appearance.ts', import.meta.url), 'utf8')
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    for (const theme of ['light', 'dark'] as const) {
      const background = `#${color('--paper', theme)}`
      expect(bootstrap).toContain(background)
      expect(appearance).toContain(background)
    }
    expect(html).toContain(`<meta name="theme-color" content="#${color('--paper')}" />`)
  })

  it('leaves accessibility rules last and pairs the colourful heatmap with its legend', () => {
    expect(imports.trim().endsWith("@import './styles/a11y.css';")).toBe(true)
    expect(imports.indexOf('product-ui.css')).toBeGreaterThan(imports.indexOf('you-ui.css'))
    expect(styles).toContain('.insights-refresh .consistency-card .insights-heat-cell.is-logged, .insights-refresh .consistency-card .insights-legend .is-logged { background: var(--ink); }')
    expect(styles).toContain('.insights-heat-cell.is-future, .insights-legend .is-future')
  })

  it('keeps decorative Momo stickers stationary and styles the welcome route too', () => {
    expect(styles).toContain('.momo-sticker .momo-art, .momo-sticker .momo-art * { animation: none !important; transition: none !important; }')
    expect(readFileSync(new URL('../styles/welcome-ui.css', import.meta.url), 'utf8')).toContain('.welcome-refresh .welcome-content')
    expect(readFileSync(new URL('../styles/setup-ui.css', import.meta.url), 'utf8')).toContain('.setup-refresh .setup-form')
  })
})
