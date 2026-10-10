import { describe, expect, it } from 'vitest'
import { lockModalScroll } from './modalScrollLock'

describe('modal scroll ownership', () => {
  it('locks the background and restores its original inline value', () => {
    const body = { style: { overflow: 'auto' } } as HTMLElement
    const release = lockModalScroll(body)
    expect(body.style.overflow).toBe('hidden')
    release()
    expect(body.style.overflow).toBe('auto')
    release()
    expect(body.style.overflow).toBe('auto')
  })

  it('keeps the lock when overlapping dialogs close in either order', () => {
    const body = { style: { overflow: '' } } as HTMLElement
    const first = lockModalScroll(body)
    const second = lockModalScroll(body)
    first()
    expect(body.style.overflow).toBe('hidden')
    second()
    expect(body.style.overflow).toBe('')
  })
})
