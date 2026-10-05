import { describe, expect, it, vi } from 'vitest'
import { createOnceGuard } from './onceGuard'

describe('createOnceGuard', () => {
  it('runs the first call and ignores the rest', () => {
    const guard = createOnceGuard()
    const action = vi.fn()
    guard.run(action)
    guard.run(action)
    guard.run(action)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('runs again after reset', () => {
    const guard = createOnceGuard()
    const action = vi.fn()
    guard.run(action)
    guard.reset()
    guard.run(action)
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('returns whether it ran', () => {
    const guard = createOnceGuard()
    expect(guard.run(() => {})).toBe(true)
    expect(guard.run(() => {})).toBe(false)
    guard.reset()
    expect(guard.run(() => {})).toBe(true)
  })

  it('blocks a re-entrant activation before the first action finishes', () => {
    const guard = createOnceGuard()
    const nested = vi.fn()
    guard.run(() => { expect(guard.run(nested)).toBe(false) })
    expect(nested).not.toHaveBeenCalled()
  })
})
