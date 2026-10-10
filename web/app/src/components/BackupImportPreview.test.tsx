import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { BackupImportPreview } from './BackupImportPreview'

function render(busy = false) {
  const currentState = freshState()
  const validatedState = freshState()
  validatedState.aiSettings.apiKey = 'synthetic-never-render-key'
  return renderToStaticMarkup(createElement(BackupImportPreview, {
    filename: '<script>synthetic-file</script>.json',
    accountLabel: 'Synthetic account <Ada>',
    currentState,
    validatedState,
    cloud: true,
    busy,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }))
}

describe('backup review UI', () => {
  it('escapes file/account text and excludes keys and managed provider/model', () => {
    const html = render()
    expect(html).toContain('&lt;script&gt;synthetic-file&lt;/script&gt;.json')
    expect(html).toContain('Synthetic account &lt;Ada&gt;')
    expect(html).not.toContain('synthetic-never-render-key')
    expect(html).not.toContain('OpenRouter')
    expect(html).not.toContain('google/gemini-2.5-flash')
  })

  it('names the modal and compares validated counts, scope and account consequences', () => {
    const html = render()
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby=')
    expect(html).toContain('Current data compared with the validated backup')
    expect(html).toContain('No logged meals')
    expect(html).toContain('through normal sync, this account.')
    expect(html).toContain('does not merge them')
    expect(html).toContain('There is no import Undo')
    expect(html).toContain('Your sign-in, password and plan stay the same')
    expect(html).toContain('Profile, preferences and AI changes')
  })

  it('puts cancellation first and disables all actions during replacement', () => {
    const html = render(true)
    expect(html.indexOf('Cancel backup import')).toBeLessThan(html.indexOf('Importing…'))
    expect(html.match(/disabled=""/g)).toHaveLength(3)
  })
})
