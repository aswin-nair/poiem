import { canStageGuestClaim, guestUserIdFromDevice } from '@fud-ai/product/guestClaim'
import { clearDurableUser, loadDurableState, saveDurableLocalSnapshot } from './durableState'
import { clearOnboardingDraft } from './onboarding'
import { clearUserState, savePrivateAIKey } from './storage'

const DEVICE_ID_KEY = 'fud-ai-guest-device-id'
const CLAIM_PREFIX = 'fud-ai-guest-claim-'
const ACCOUNT_SEEN_KEY = 'fud-ai-account-seen'

/**
 * Remembers that this device has held a real account, so signing out lands on
 * the login screen instead of restarting the guest journey. Without it a
 * returning person is dropped into onboarding with no route back to their own
 * data. Deleting the account clears it and the device is genuinely fresh again.
 */
export function markAccountSeen(): void {
  try { localStorage.setItem(ACCOUNT_SEEN_KEY, '1') } catch { /* private mode */ }
}

export function hasSeenAccount(): boolean {
  try { return localStorage.getItem(ACCOUNT_SEEN_KEY) === '1' } catch { return false }
}

export function clearAccountSeen(): void {
  try { localStorage.removeItem(ACCOUNT_SEEN_KEY) } catch { /* private mode */ }
}

export function guestUserId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return guestUserIdFromDevice(id)
}

/**
 * Copy the completed device-only journey under the authenticated account key.
 * The source is retained until the account copy is durable (and, in cloud
 * mode, acknowledged by the server).
 */
export async function stageGuestStateForAccount(accountId: string): Promise<boolean> {
  const sourceId = guestUserId()
  const guest = await loadDurableState(sourceId)
  const account = await loadDurableState(accountId)
  // Never overwrite unsynced work from a previous account session. The guest
  // copy stays intact on its own key and can be exported or claimed later.
  if (!canStageGuestClaim({
    guestOnboarded: Boolean(guest?.state.onboarded),
    guestFoodCount: guest?.state.foodEntries.length ?? 0,
    accountPendingCount: account?.pendingCount ?? 0,
  })) return false
  if (!guest) return false

  await saveDurableLocalSnapshot(accountId, guest.state)
  // The BYOK key is deliberately stored outside AppState, so the snapshot above
  // cannot carry it. Copy it across before finalizing clears the guest slot,
  // otherwise signing in silently destroys the only copy and AI logging stops.
  const guestApiKey = guest.state.aiSettings.apiKey.trim()
  if (guestApiKey) savePrivateAIKey(accountId, guestApiKey)
  localStorage.setItem(`${CLAIM_PREFIX}${accountId}`, sourceId)
  return true
}

export function hasPendingGuestClaim(accountId: string): boolean {
  return Boolean(localStorage.getItem(`${CLAIM_PREFIX}${accountId}`))
}

export async function finalizeGuestClaim(accountId: string): Promise<void> {
  const key = `${CLAIM_PREFIX}${accountId}`
  const sourceId = localStorage.getItem(key)
  if (!sourceId) return
  await clearDurableUser(sourceId)
  clearUserState(sourceId)
  clearOnboardingDraft(sourceId)
  localStorage.removeItem(key)
}
