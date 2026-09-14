import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearDurableUser, enqueueDurableMutation, loadDurableState, saveDurableLocalSnapshot } from './durableState'
import { finalizeGuestClaim, guestUserId, hasPendingGuestClaim, stageGuestStateForAccount } from './guestMode'
import { freshState, loadPrivateAIKey, savePrivateAIKey } from './storage'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('guest progress claim', () => {
  it('copies a completed first-log journey and retains the source until final acknowledgement', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('indexedDB', undefined)
    const guestId = guestUserId()
    const state = freshState()
    state.onboarded = true
    state.foodEntries.push({
      id: 'first', name: 'Breakfast', calories: 320, protein: 12, carbs: 45, fat: 9,
      timestamp: '2026-08-30T08:00:00.000Z', source: 'manual', mealType: 'breakfast',
    })
    await saveDurableLocalSnapshot(guestId, state)

    expect(await stageGuestStateForAccount('account-1')).toBe(true)
    expect(hasPendingGuestClaim('account-1')).toBe(true)
    expect((await loadDurableState('account-1'))?.state.foodEntries).toHaveLength(1)
    expect(await loadDurableState(guestId)).not.toBeNull()

    await finalizeGuestClaim('account-1')
    expect(hasPendingGuestClaim('account-1')).toBe(false)
    expect(await loadDurableState(guestId)).toBeNull()
    await clearDurableUser('account-1')
  })

  it('carries the device-local AI key onto the account so BYOK features keep working', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('indexedDB', undefined)
    const guestId = guestUserId()
    savePrivateAIKey(guestId, 'sk-or-guest-key')
    const state = freshState()
    state.onboarded = true
    state.foodEntries.push({
      id: 'first', name: 'Breakfast', calories: 320, protein: 12, carbs: 45, fat: 9,
      timestamp: '2026-08-30T08:00:00.000Z', source: 'manual', mealType: 'breakfast',
    })
    await saveDurableLocalSnapshot(guestId, state)

    expect(await stageGuestStateForAccount('account-1')).toBe(true)
    expect(loadPrivateAIKey('account-1')).toBe('sk-or-guest-key')

    // Finalizing wipes the guest slot, so the account copy is the only one left.
    await finalizeGuestClaim('account-1')
    expect(loadPrivateAIKey('account-1')).toBe('sk-or-guest-key')
    expect(loadPrivateAIKey(guestId)).toBe('')
    await clearDurableUser('account-1')
  })

  it('never overwrites queued account work', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('indexedDB', undefined)
    const guestId = guestUserId()
    const guest = freshState()
    guest.onboarded = true
    guest.foodEntries.push({
      id: 'guest', name: 'Guest meal', calories: 250, protein: 10, carbs: 30, fat: 8,
      timestamp: '2026-08-30T08:00:00.000Z', source: 'manual', mealType: 'breakfast',
    })
    await saveDurableLocalSnapshot(guestId, guest)

    const account = freshState()
    account.profile.name = 'Existing'
    await saveDurableLocalSnapshot('account-1', account)
    await enqueueDurableMutation({
      userId: 'account-1',
      sessionSubject: 'account-1',
      sessionIssuedAt: 1,
      state: { ...account, profile: { ...account.profile, name: 'Unsynced' } },
      confirmedVersion: 0,
    })

    expect(await stageGuestStateForAccount('account-1')).toBe(false)
    expect((await loadDurableState('account-1'))?.state.profile.name).toBe('Unsynced')
    expect(await loadDurableState(guestId)).not.toBeNull()
  })
})
