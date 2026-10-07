import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('releases the claim and rethrows when the action throws', () => {
    const guard = createOnceGuard()
    const failure = new Error('save failed')
    expect(() => guard.run(() => { throw failure })).toThrow(failure)
    const retry = vi.fn()
    expect(guard.run(retry)).toBe(true)
    expect(retry).toHaveBeenCalledTimes(1)
  })
})

describe('createOnceGuard with releaseAfterMs', () => {
  afterEach(() => { vi.useRealTimers() })

  it('runs the action at once, with no timer in its path', () => {
    vi.useFakeTimers()
    const guard = createOnceGuard({ releaseAfterMs: 400 })
    const action = vi.fn()
    expect(guard.run(action)).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('stays claimed until the bound, then releases on its own', () => {
    vi.useFakeTimers()
    const guard = createOnceGuard({ releaseAfterMs: 400 })
    const action = vi.fn()
    guard.run(action)
    vi.advanceTimersByTime(399)
    expect(guard.run(action)).toBe(false)
    vi.advanceTimersByTime(1)
    expect(guard.run(action)).toBe(true)
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('a reset cancels the pending release, so it cannot free a later claim early', () => {
    vi.useFakeTimers()
    const guard = createOnceGuard({ releaseAfterMs: 400 })
    guard.run(() => {})
    vi.advanceTimersByTime(100)
    guard.reset()
    vi.advanceTimersByTime(100)
    guard.run(() => {})
    // The first claim's timer would have fired at 400; the second claim holds until 600.
    vi.advanceTimersByTime(250)
    expect(guard.run(() => {})).toBe(false)
    vi.advanceTimersByTime(150)
    expect(guard.run(() => {})).toBe(true)
  })

  it('a reset leaves no timer behind (as on unmount)', () => {
    vi.useFakeTimers()
    const guard = createOnceGuard({ releaseAfterMs: 400 })
    guard.run(() => {})
    guard.reset()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('releases at once and leaves no timer when the action throws', () => {
    vi.useFakeTimers()
    const guard = createOnceGuard({ releaseAfterMs: 400 })
    expect(() => guard.run(() => { throw new Error('boom') })).toThrow('boom')
    expect(vi.getTimerCount()).toBe(0)
    expect(guard.run(() => {})).toBe(true)
  })
})
