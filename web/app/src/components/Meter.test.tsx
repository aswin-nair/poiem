import { renderToStaticMarkup } from 'react-dom/server'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Meter } from './Meter'

const stylesDir = new URL('../styles/', import.meta.url)
const stylesheets = (dir: URL): URL[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory()
    ? stylesheets(new URL(`${entry.name}/`, dir))
    : entry.name.endsWith('.css') ? [new URL(entry.name, dir)] : [])
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const fillTransform = (progress: number) => `transform:translateX(calc((${progress} - 1) * 100%))`

describe('Meter motion', () => {
  it('translates a full-width fill and never sets width or scale', () => {
    const html = renderToStaticMarkup(<Meter label="Protein" value={25} max={100} />)
    expect(html).toContain(fillTransform(0.25))
    expect(html).not.toContain('scale')
    expect(html).not.toMatch(/style="[^"]*width:/)
    const css = strip(readFileSync(new URL('system/components.css', stylesDir), 'utf8'))
    const fill = css.match(/\.k-meter-fill\s*\{([^}]+)\}/)?.[1]
    expect(fill).toMatch(/width:\s*100%/)
    expect(fill).toMatch(/transition:\s*transform\s+240ms\s+var\(--k-ease\)/)
    expect(fill).not.toMatch(/transition:[^;]*width/)
    expect(css.match(/\.k-meter\s*\{([^}]+)\}/)?.[1]).toMatch(/overflow:\s*hidden/)
  })

  it('does not scale the striped calorie fill, so its stripes keep their period', () => {
    const html = renderToStaticMarkup(<Meter label="Calories" value={1000} max={2000} tone="acid" />)
    expect(html).toContain(fillTransform(0.5))
    expect(html).not.toContain('scale')
    const today = strip(readFileSync(new URL('screens/today.css', stylesDir), 'utf8'))
    const striped = [...today.matchAll(/([^{}]+)\{([^{}]*repeating-linear-gradient[^{}]*)\}/g)]
      .filter(([, selector]) => selector.includes('.k-meter-fill'))
    expect(striped.length).toBeGreaterThan(0)
    for (const [, selector, body] of striped) expect(body, selector.trim()).not.toMatch(/\bscale|transform|background-size/)
  })

  it('no stylesheet puts scale on a meter fill', () => {
    for (const sheet of stylesheets(stylesDir)) {
      for (const [, selector, body] of strip(readFileSync(sheet, 'utf8')).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!selector.includes('.k-meter-fill')) continue
        expect(body, `${sheet.pathname.split('/').slice(-2).join('/')}: ${selector.trim()}`).not.toMatch(/scale/)
      }
    }
  })

  it('keeps the progressbar semantics unchanged', () => {
    const html = renderToStaticMarkup(<Meter label="Protein" value={25} max={100} valueText="25 of 100 g" />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-label="Protein"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).toContain('aria-valuenow="25"')
    expect(html).toContain('aria-valuetext="25 of 100 g"')
  })

  it.each([[-10, 100, 0], [200, 100, 1], [10, 0, 0]])('clamps %s of %s to %s', (value, max, progress) => {
    expect(renderToStaticMarkup(<Meter label="Progress" value={value} max={max} />)).toContain(fillTransform(progress))
  })
})
