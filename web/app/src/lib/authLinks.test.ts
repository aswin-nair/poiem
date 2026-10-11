import { describe, expect, it } from 'vitest'
import { authContextPath } from './authLinks'

describe('public account-flow links', () => {
  it('preserves the default recovery destination', () => {
    expect(authContextPath('/forgot-password', new URLSearchParams())).toBe('/forgot-password')
  })
  it('keeps only exact public flags, excluding credentials, tokens and arbitrary returns', () => {
    const params = new URLSearchParams('claim=1&setup=1&token=private&email=private&returnTo=https://example.test&password=private')
    expect(authContextPath('/login', params)).toBe('/login?claim=1&setup=1')
    expect(authContextPath('/login', params, true)).toBe('/login?claim=1&setup=1&passwordUpdated=1')
    expect(authContextPath('/login', new URLSearchParams('claim=yes&setup=0'))).toBe('/login')
  })
})
