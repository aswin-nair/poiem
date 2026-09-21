import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { motionCssEase, motionFade, motionMs } from './motionPresets'

const SRC = fileURLToPath(new URL('../', import.meta.url))

describe('motion presets', () => {
  it('exports a CSS ease that matches the shared fade recipe', () => {
    expect(motionCssEase).toBe(`cubic-bezier(${motionFade.ease.join(', ')})`)
    expect(motionFade.duration).toBe(motionMs.fade / 1000)
  })

  it('keeps the welcome poster on the shared ease and durations', () => {
    const css = readFileSync(join(SRC, 'styles/welcome-poster.css'), 'utf8')
    expect(css).toContain(`--wp-ease: ${motionCssEase}`)
    expect(css).toContain(`--wp-duration-fade: ${motionMs.fade / 1000}s`)
    expect(css).toContain(`--wp-duration-enter: ${motionMs.enter / 1000}s`)
    expect(css).toContain(`--wp-duration-press: ${motionMs.press / 1000}s`)
  })
})
