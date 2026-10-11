import { describe, expect, it } from 'vitest'
import { findSettingDestination, searchSettings, SETTING_DESTINATIONS, settingHref } from './settingDestinations'

describe('exact Settings destinations', () => {
  it('has unique, known destinations and valid fallbacks', () => {
    const ids = SETTING_DESTINATIONS.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of SETTING_DESTINATIONS) {
      expect(findSettingDestination(`#${item.id}`)).toBe(item)
      expect(settingHref(item)).toMatch(/^\/settings(?:\?panel=(?:profile|preferences|momo|ai|account|data))?#[a-z-]+$/)
      if (item.fallback) expect(ids).toContain(item.fallback)
    }
  })
  it('matches public field names and synonyms, promoting exact names', () => {
    expect(searchSettings('  HEIGHT  ')[0].id).toBe('setting-height')
    expect(searchSettings('dark mode')[0].id).toBe('you-appearance')
    expect(searchSettings('mute momo')[0].id).toBe('setting-momo-mute')
    expect(searchSettings('authentication method')[0].id).toBe('ai-auth-type')
    expect(searchSettings('weight')[0].id).toBe('setting-weight')
    expect(searchSettings('')).toEqual([])
    expect(searchSettings('xyz-no-match')).toEqual([])
  })
  it('accepts only known hashes and never contains user values', () => {
    for (const hash of ['setting-height', '#__proto__', '#setting-height%20', '#setting-height input', '#<script>']) expect(findSettingDestination(hash)).toBeUndefined()
    expect(searchSettings('my-private-test-key')).toEqual([])
    expect(searchSettings('aswin@example.com')).toEqual([])
  })
})
