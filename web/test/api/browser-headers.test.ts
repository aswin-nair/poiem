import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  APP_HEADER_SOURCES,
  APP_SECURITY_HEADERS,
} from '../../shared/browserSecurityHeaders.js'

const webRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const vercel = JSON.parse(readFileSync(join(webRoot, 'vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

describe('browser security headers for /app', () => {
  it('pins the same header policy on every /app source in vercel.json', () => {
    const sources = vercel.headers.map(entry => entry.source)
    expect(sources).toEqual(APP_HEADER_SOURCES)

    for (const entry of vercel.headers) {
      expect(entry.headers).toEqual(APP_SECURITY_HEADERS)
    }
  })

  it('allows chosen HTTPS BYOK destinations while keeping resource restrictions', () => {
    const csp = APP_SECURITY_HEADERS.find(header => header.key === 'Content-Security-Policy')?.value ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('https://accounts.google.com')
    expect(csp.split('; ').find(directive => directive.startsWith('connect-src '))).toBe("connect-src 'self' https:")
    expect(csp).toContain("script-src 'self' https://accounts.google.com https://www.gstatic.com")
    expect(csp).toContain('frame-src https://accounts.google.com')
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
    expect(APP_SECURITY_HEADERS).toContainEqual({
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin-allow-popups',
    })
    expect(APP_SECURITY_HEADERS).toContainEqual({
      key: 'X-Frame-Options',
      value: 'DENY',
    })
    expect(APP_SECURITY_HEADERS).toContainEqual({
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    })
    expect(APP_SECURITY_HEADERS).toContainEqual({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    })
  })
})
