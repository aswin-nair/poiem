import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Meter } from './Meter'

describe('Meter motion', () => {
  it('uses scaleX with a left origin and no width', () => {
    const html = renderToStaticMarkup(<Meter label="Protein" value={25} max={100} />)
    expect(html).toContain('transform:scaleX(0.25)')
    expect(html).not.toMatch(/style="[^"]*width:/)
    const css = readFileSync(new URL('../styles/system/components.css', import.meta.url), 'utf8')
    const fill = css.match(/\.k-meter-fill\s*\{([^}]+)\}/)?.[1]
    expect(fill).toMatch(/transform-origin:\s*left/)
    expect(fill).toMatch(/transition:\s*transform\s+240ms\s+var\(--k-ease\)/)
    expect(fill).not.toMatch(/transition:[^;]*width/)
  })

  it.each([[-10, 100, 0], [200, 100, 1], [10, 0, 0]])('clamps %s of %s to %s', (value, max, progress) => {
    expect(renderToStaticMarkup(<Meter label="Progress" value={value} max={max} />)).toContain(`transform:scaleX(${progress})`)
  })
})
