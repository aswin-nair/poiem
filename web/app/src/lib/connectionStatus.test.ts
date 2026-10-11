import { describe, expect, it } from 'vitest'
import { ApiError, ApiResponseError } from './apiClient'
import { accountReadFailureMessage, connectionStatusMessage, isRetryableAccountReadError } from './connectionStatus'

const connected = { cloud: true, online: true, error: null, conflict: false, pending: 0, recoveredFromDevice: false, storageRecovery: null }

describe('connection status distinguishes device connectivity from account requests', () => {
  it('clears the offline message on reconnect without requiring a queued write', () => {
    expect(connectionStatusMessage({ ...connected, online: false })).toMatch(/^Offline\./)
    expect(connectionStatusMessage(connected)).toBeNull()
  })
  it.each([0, 429, 500, 503])('does not call a retryable account error offline (%i)', status => {
    const error = new ApiError('Request failed', status)
    expect(isRetryableAccountReadError(error)).toBe(true)
    expect(accountReadFailureMessage(error)).not.toMatch(/offline/i)
    expect(connectionStatusMessage({ ...connected, error: accountReadFailureMessage(error) })).not.toMatch(/offline/i)
  })
  it('keeps server trouble visible after the browser reconnects', () => {
    const error = accountReadFailureMessage(new ApiError('Unavailable', 503))
    expect(connectionStatusMessage({ ...connected, error, online: false })).toMatch(/^Offline\./)
    expect(connectionStatusMessage({ ...connected, error })).toContain('temporarily unavailable')
  })
  it('never hides a conflict behind a connectivity message', () => {
    expect(connectionStatusMessage({ ...connected, conflict: true, online: false, error: 'Both copies are preserved.' })).toContain('Download the device copy')
  })
  it.each([false, true])('keeps disconnected local/guest mode free of cloud messaging (pending %s)', hasPending => {
    expect(connectionStatusMessage({ ...connected, cloud: false, online: false, pending: hasPending ? 1 : 0, error: 'Server failed' })).toBeNull()
    expect(connectionStatusMessage({ ...connected, cloud: false, online: false, storageRecovery: 'Storage needs recovery.' })).toBe('Storage needs recovery.')
  })
  it('does not treat an invalid successful response as a network failure', () => {
    expect(isRetryableAccountReadError(new ApiResponseError('Invalid version'))).toBe(false)
  })
})
