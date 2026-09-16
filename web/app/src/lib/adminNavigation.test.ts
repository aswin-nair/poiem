import { describe, expect, it } from 'vitest'
import {
  resolveBlockedAdminNavigation,
  shouldBlockAdminNavigation,
} from './adminNavigation'

const admin = { pathname: '/admin', search: '' }

describe('unsaved admin navigation', () => {
  it('blocks leaving the workspace in either history direction, but not hash-only moves', () => {
    expect(shouldBlockAdminNavigation(false, admin, { pathname: '/settings', search: '' })).toBe(false)
    expect(shouldBlockAdminNavigation(true, admin, { pathname: '/settings', search: '' })).toBe(true)
    expect(shouldBlockAdminNavigation(true, admin, { pathname: '/log/text', search: '' })).toBe(true)
    expect(shouldBlockAdminNavigation(true, admin, admin)).toBe(false)
    expect(shouldBlockAdminNavigation(true, admin, { pathname: '/admin', search: '?tab=usage' })).toBe(true)
  })

  it('keeps the editor mounted when leave is cancelled and continues when confirmed', () => {
    expect(resolveBlockedAdminNavigation('unblocked', () => true)).toBe('ignore')
    expect(resolveBlockedAdminNavigation('blocked', () => false)).toBe('reset')
    expect(resolveBlockedAdminNavigation('blocked', () => true)).toBe('proceed')
  })
})
