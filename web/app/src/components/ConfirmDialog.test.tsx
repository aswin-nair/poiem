import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

const render = (destructive?: boolean) => renderToStaticMarkup(
  <ConfirmDialog
    title="Clear chat history?"
    cancelLabel="Keep chat"
    confirmLabel="Clear chat"
    destructive={destructive}
    onCancel={() => {}}
    onConfirm={() => {}}
  >
    <p>This cannot be undone.</p>
  </ConfirmDialog>,
)

describe('ConfirmDialog', () => {
  it('is a modal dialog named by its title', () => {
    const html = render()
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1]
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(labelledBy).toBeTruthy()
    expect(html).toContain(`id="${labelledBy}"`)
    expect(html).toMatch(/<h2[^>]*>Clear chat history\?<\/h2>/)
    expect(html).toContain('This cannot be undone.')
  })

  it('puts the safe choice first, so focus starts there', () => {
    const html = render()
    expect(html.indexOf('Keep chat')).toBeGreaterThan(-1)
    expect(html.indexOf('Keep chat')).toBeLessThan(html.indexOf('Clear chat</'))
  })

  it('styles the confirm button as destructive only for a delete', () => {
    expect(render(true)).toContain('pressable-destructive')
    expect(render(false)).not.toContain('pressable-destructive')
    expect(render()).not.toContain('pressable-destructive')
  })
})
