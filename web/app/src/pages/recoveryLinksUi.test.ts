import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SupportPage } from './SupportPage'
import { AboutPage } from './AboutPage'

vi.mock('../components/BottomNav', () => ({ BottomNav: () => null }))
vi.mock('../components/MomoSticker', () => ({ MomoSticker: () => null }))

describe('Support and About recovery navigation', () => {
  it('links to exact Settings controls without changing a setting', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SupportPage)))
    expect(html).toContain('/settings?panel=preferences#setting-pause')
    expect(html).toContain('/settings?panel=ai#setting-own-api')
    expect(html).toContain('/settings?panel=data#setting-export')
    expect(html).toContain('/settings?panel=account#setting-account-identity')
    expect(html).toContain('aria-labelledby="support-app-title"')
  })

  it('About offers Support and a journal backup destination', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AboutPage)))
    expect(html).toContain('href="/support"')
    expect(html).toContain('/settings?panel=data#setting-export')
    expect(html).toContain('aria-label="More about Poiem"')
  })
})
