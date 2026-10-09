import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptSessionAccount, clearSessionNavigation, getSessionReturnLabel, markSessionNavigationExpired, rememberSessionNavigation, safeSessionDestination, SESSION_NAVIGATION_KEY, SESSION_RETURN_TTL_MS, takeSessionReturn } from './sessionNavigation'

describe('account session navigation', () => {
  const stored = new Map<string, string>()
  const now = Date.UTC(2026, 9, 9, 12)
  beforeEach(() => {
    stored.clear()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    })
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('keeps active navigation separate from an expired session return', () => {
    rememberSessionNavigation('one', { pathname: '/review', search: '' })
    expect(getSessionReturnLabel()).toBeNull()
    expect(takeSessionReturn('one')).toBeNull()
    markSessionNavigationExpired('one')
    expect(getSessionReturnLabel()).toBe('your meal review')
    expect(takeSessionReturn('one')).toEqual({ pathname: '/review', search: '' })
    expect(takeSessionReturn('one')).toBeNull()
  })

  it('only copies the named safe context', () => {
    expect(safeSessionDestination('/review', '?key=secret&token=private', {
      mealType: 'dinner', firstMeal: true, image: 'data:private', analysis: { name: 'private' }, background: { pathname: '/settings' },
    })).toEqual({ pathname: '/review', search: '', state: { mealType: 'dinner', firstMeal: true } })
    expect(safeSessionDestination('/settings', '?panel=ai&apiKey=private')).toEqual({ pathname: '/settings', search: '?panel=ai' })
    expect(safeSessionDestination('/settings', '?panel=unknown')).toEqual({ pathname: '/settings', search: '' })
  })

  it.each(['https://example.com', '//example.com', '/admin', '/login', '/reset-password', '/edit/../settings', '/edit/key?secret'])('rejects unsafe or privileged route %s', pathname => {
    expect(safeSessionDestination(pathname)).toBeNull()
  })

  it('preserves a valid past journal day but rejects future days and rollovers', () => {
    expect(safeSessionDestination('/', '', { journalDay: '2026-10-08' })?.state).toEqual({ journalDay: '2026-10-08' })
    expect(safeSessionDestination('/', '', { journalDay: '2026-10-10' })?.state).toBeUndefined()
    expect(safeSessionDestination('/', '', { journalDay: '2026-02-31' })?.state).toBeUndefined()
  })

  it('retains a pending destination while the same account is hydrating', () => {
    rememberSessionNavigation('one', { pathname: '/log/manual', search: '', state: { mealType: 'lunch' } })
    markSessionNavigationExpired('one')
    rememberSessionNavigation('one', { pathname: '/', search: '' })
    expect(takeSessionReturn('one')?.pathname).toBe('/log/manual')
  })

  it('clears return context on an account mismatch', () => {
    rememberSessionNavigation('one', { pathname: '/review', search: '' })
    markSessionNavigationExpired('one')
    acceptSessionAccount('two')
    expect(getSessionReturnLabel()).toBeNull()
    expect(stored.size).toBe(0)
  })

  it('expires even a pending return after thirty minutes', () => {
    rememberSessionNavigation('one', { pathname: '/settings', search: '?panel=profile' })
    markSessionNavigationExpired('one')
    vi.advanceTimersByTime(SESSION_RETURN_TTL_MS)
    expect(takeSessionReturn('one')).toBeNull()
    expect(stored.size).toBe(0)
  })

  it('clears malformed and excessively long lived records', () => {
    stored.set(SESSION_NAVIGATION_KEY, '{bad')
    expect(getSessionReturnLabel()).toBeNull()
    stored.set(SESSION_NAVIGATION_KEY, JSON.stringify({ version: 1, pathname: '/review', search: '', accountId: 'one', pending: true, expiresAt: now + SESSION_RETURN_TTL_MS + 1 }))
    expect(getSessionReturnLabel()).toBeNull()
    expect(stored.size).toBe(0)
  })

  it('deliberate sign-out can clear the destination without touching account data', () => {
    rememberSessionNavigation('one', { pathname: '/review', search: '' })
    markSessionNavigationExpired('one')
    clearSessionNavigation()
    expect(getSessionReturnLabel()).toBeNull()
  })
})
