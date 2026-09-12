import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import identity from './identity.json'

const publicDir = new URL('../../public/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', publicDir), 'utf8'))
const config = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'))

describe('Poiem release identity', () => {
  it('packages valid icons and gives installed shortcuts the new name', () => {
    expect(manifest.name).toBe(identity.name)
    expect(manifest.short_name).toBe(identity.name)
    expect(manifest.scope).toBe('./')
    expect(manifest.start_url).toBe('./')
    for (const icon of manifest.icons) {
      const bytes = readFileSync(new URL(icon.src, publicDir))
      const size = Number(icon.sizes.split('x')[0])
      expect(bytes.subarray(1, 4).toString()).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBe(size)
      expect(bytes.readUInt32BE(20)).toBe(size)
    }
  })

  it('exports the component artwork, not a stale copy of the old logo', () => {
    const wordmark = readFileSync(new URL('brand/poiem-wordmark.svg', publicDir), 'utf8')
    const favicon = readFileSync(new URL('favicon.svg', publicDir), 'utf8')
    expect(wordmark).toContain(identity.wordmarkPath)
    expect(favicon).toContain(identity.markPath)
    expect(wordmark).not.toContain('<text')
    expect(existsSync(new URL('brand/momo.svg', publicDir))).toBe(true)
    const momo = readFileSync(new URL('brand/momo.svg', publicDir), 'utf8')
    // The brand Momo is exported from @fud-ai/product/momoArt: flat shapes, no bitmap.
    expect(momo).toContain('viewBox="-4 -2 128 128"')
    expect(momo).toContain('class="momo-body"')
    expect(momo).toContain('class="momo-steam"')
    expect(momo).not.toContain('<image')
  })

  it('serves branding files before the deployment SPA catch-all', () => {
    const catchAll = config.rewrites.findIndex((rule: { source: string }) => rule.source === '/app/(.*)')
    for (const source of ['/app/brand/(.*)', '/app/favicon.svg', '/app/manifest.webmanifest']) {
      const index = config.rewrites.findIndex((rule: { source: string }) => rule.source === source)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(catchAll)
    }
  })
})
