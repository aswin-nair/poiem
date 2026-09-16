import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'

afterEach(() => vi.unstubAllEnvs())

function render() {
  const router = createMemoryRouter(
    [{ path: '*', element: createElement(AdminPage) }],
    { initialEntries: ['/admin'] },
  )
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

describe('admin workspace preview boundary', () => {
  it('shows the complete local workspace with every write form locked and sample data labelled', () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'local')
    const html = render()
    expect(html).toContain('Design preview. Sample data. No live changes.')
    expect(html).toContain('PLAN RECIPES')
    expect(html).toContain('MODEL PANTRY')
    expect(html).toContain('CLUB MEMBERS')
    expect(html).toContain('member@example.com')
    const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? []
    expect(forms).toHaveLength(4)
    for (const form of forms) {
      expect(form).toMatch(/<button\b[^>]*type="submit"[^>]*disabled=""/)
    }
    expect(html.match(/<fieldset\b[^>]*disabled=""/g)).toHaveLength(3)
    // The pantry can still be explored without connecting to an API.
    expect(html).toMatch(/<input\b(?=[^>]*type="search")(?=[^>]*placeholder="Search by name or model ID")(?![^>]*disabled)[^>]*>/)
  })

  it('keeps sample accounts and write controls out of a cloud workspace awaiting authorization', () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'neon')
    const html = render()
    expect(html).toContain('Opening the kitchen')
    expect(html).toContain('role="status"')
    expect(html).not.toContain('member@example.com')
    expect(html).not.toContain('example/everyday-vision')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Design preview.')
  })

  it('blocks back and forward through the router and distinguishes audit load failures from an empty trail', () => {
    const source = readFileSync(new URL('./AdminPage.tsx', import.meta.url), 'utf8')
    expect(source).toContain('useUnsavedAdminNavigation')
    expect(source).not.toContain('history.go(')
    expect(source).toContain('You have unsaved account changes. Search anyway?')
    expect(source).toContain('onDirtyChange?.(false)')
    expect(source).toContain('Could not load the audit trail. Please retry.')
    expect(source).toContain('await loadAudit()')
    expect(source).not.toMatch(/setAudit\(\[\]\)/)
  })
})
