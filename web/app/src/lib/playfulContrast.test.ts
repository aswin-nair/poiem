import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(new URL('../styles/system/tokens.css', import.meta.url), 'utf8')
const [light, dark] = tokens.split(':root[data-theme="dark"]')

function color(name: string, theme: 'light' | 'dark'): string {
  const pattern = new RegExp(`${name}:\\s*(#[0-9a-f]{6}|var\\((--[\\w-]+)\\))\\s*;`, 'i')
  const match = (theme === 'dark' ? dark.match(pattern) : null) ?? light.match(pattern)
  if (!match) throw new Error(`Missing ${name} in ${theme}`)
  return match[2] ? color(match[2], theme) : match[1]
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}

describe('playful panel contrast', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`keeps dark text and focus ink readable on every bright panel in ${theme}`, () => {
      for (const tone of ['butter', 'peach', 'pink', 'sky', 'mint']) {
        const a = luminance(color('--k-sticker-ink', theme))
        const b = luminance(color(`--k-sticker-${tone}`, theme))
        expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), tone).toBeGreaterThanOrEqual(4.5)
      }
      const muted = luminance(color('--k-sticker-muted', theme))
      const mint = luminance(color('--k-sticker-mint', theme))
      expect((mint + .05) / (muted + .05), 'ring legend').toBeGreaterThanOrEqual(4.5)
    })
  }
})
