import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'

describe('account recovery presentation', () => {
  it('makes a missing reset link actionable without a disabled password form', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/reset-password?claim=1']}><ResetPasswordPage /></MemoryRouter>)
    expect(html).toContain('This page needs the reset link from your email.')
    expect(html).not.toContain('<form')
    expect(html).toContain('href="/forgot-password?claim=1"')
    expect(html).toContain('>Request a new reset link</a>')
    expect(html).toContain('href="/login?claim=1"')
  })
  it('keeps valid reset inputs named and masked without including the token in return links', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/reset-password?token=synthetic&setup=1']}><ResetPasswordPage /></MemoryRouter>)
    expect(html).toContain('New password')
    expect(html.match(/type="password"/g)).toHaveLength(2)
    expect(html).toContain('aria-busy="false"')
    expect(html).toContain('href="/forgot-password?setup=1"')
    expect(html).not.toContain('synthetic')
  })
  it('retains safe guest flow context through the forgot-password page', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/forgot-password?claim=1&setup=1']}><ForgotPasswordPage /></MemoryRouter>)
    expect(html).toContain('href="/login?claim=1&amp;setup=1"')
    expect(html).toContain('autoCapitalize="none"')
    expect(html).toContain('aria-busy="false"')
  })
})
