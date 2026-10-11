import { ApiError } from './apiClient'

/** A failed account request does not establish that the device is offline. */
export function isRetryableAccountReadError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500)
}

export function accountReadFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'The account server is busy. Your device copy is available. Try checking again shortly.'
  }
  if (error instanceof ApiError && error.status >= 500) {
    return 'The account server is temporarily unavailable. Your device copy is available.'
  }
  if (error instanceof ApiError && error.status === 0) {
    return 'The account server could not be reached. Your device copy is available.'
  }
  return 'The account server copy could not be validated. Your device copy is preserved.'
}

interface ConnectionStatus {
  cloud: boolean
  online: boolean
  error: string | null
  conflict: boolean
  pending: number
  recoveredFromDevice: boolean
  storageRecovery: string | null
}

/** Connectivity, server failures and local-storage recovery have separate facts. */
export function connectionStatusMessage(status: ConnectionStatus): string | null {
  if (!status.cloud) return status.storageRecovery
  if (status.conflict) {
    return `${status.error ?? 'Sync needs recovery.'} Download the device copy before choosing which version to keep.`
  }
  if (!status.online) {
    return `Offline. ${status.pending > 0 ? `${status.pending} change${status.pending === 1 ? '' : 's'} saved on this device.` : 'Your saved device copy is available.'}`
  }
  if (status.error) return `${status.error}${status.pending > 0 ? ' Retry is scheduled.' : ''}`
  if (status.pending > 0) return `Syncing ${status.pending} saved change${status.pending === 1 ? '' : 's'}…`
  if (status.recoveredFromDevice) return 'Recovered your last saved device copy. Check the account connection when you are ready.'
  return status.storageRecovery
}
