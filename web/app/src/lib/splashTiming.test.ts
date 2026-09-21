import { describe, expect, it } from 'vitest'
import {
  SPLASH_HOLD_MS,
  SPLASH_SHOW_AFTER_MS,
  shouldSkipSplash,
  splashHoldRemaining,
  splashRevealWait,
} from './splashTiming'

describe('splash timing', () => {
  it('skips splash on a return visit that finishes before the reveal', () => {
    expect(shouldSkipSplash(true, false)).toBe(true)
    expect(shouldSkipSplash(true, true)).toBe(false)
    expect(shouldSkipSplash(false, false)).toBe(false)
  })

  it('waits out the reveal delay, then holds once shown', () => {
    expect(splashRevealWait(0, 50)).toBe(SPLASH_SHOW_AFTER_MS - 50)
    expect(splashRevealWait(0, SPLASH_SHOW_AFTER_MS + 20)).toBe(0)
    expect(splashHoldRemaining(1000, 1200)).toBe(SPLASH_HOLD_MS - 200)
    expect(splashHoldRemaining(1000, 1000 + SPLASH_HOLD_MS + 80)).toBe(0)
  })
})
