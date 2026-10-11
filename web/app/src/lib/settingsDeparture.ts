import type { AISettings } from './aiConfig'
import { apiFormatFor, authHeaderFor, authTypeFor, defaultEndpointFor } from './aiConfig'
import { authHeaderIssue, endpointIssue } from '../../../shared/aiConnection'

export function shouldProtectSettingsDeparture(dirty: boolean, currentPath: string, nextPath: string): boolean {
  return dirty && currentPath.replace(/\/$/, '') === '/settings' && nextPath.replace(/\/$/, '') !== '/settings'
}

/** These destinations point at existing fields; validation remains in the profile library. */
export function profileIssueControl(issue: string): string {
  if (/height/i.test(issue) && !/goal/i.test(issue)) return 'setting-height'
  if (/goal.*weight|goal of/i.test(issue)) return 'setting-goal-weight'
  if (/weight greater/i.test(issue)) return 'setting-weight'
  if (/weekly change/i.test(issue)) return 'setting-weekly-change'
  // Date of birth and imported legacy targets have no editable control on this page.
  return 'you-profile-error'
}

/** Match the existing connection validator's first failing field, including closed auth. */
export function aiIssueControl(settings: AISettings, issue: string): string {
  const endpoint = settings.endpointUrl?.trim() || (settings.provider === 'custom' ? '' : defaultEndpointFor(settings.provider, apiFormatFor(settings)))
  if (endpointIssue(endpoint, settings.apiKey)) return 'ai-endpoint'
  if (/model ID/i.test(issue)) return 'ai-model'
  if (authTypeFor(settings) === 'api-key' && (authHeaderIssue(authHeaderFor(settings)) || /header/i.test(issue))) return 'ai-auth-header'
  return 'setting-api-key'
}
