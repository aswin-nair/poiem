import type { AISettings } from './aiConfig'
import type { AiStatus, ManagedTask } from '../../../shared/aiPlans'
import { usesByok } from './aiClient'

export type AiAvailabilityKind =
  | 'checking'
  | 'ready'
  | 'limit_reached'
  | 'premium_required'
  | 'unavailable'

export type AiUnavailableReason = 'unsigned' | 'disabled' | 'error' | 'missing_key'

export type AiAvailability =
  | { kind: 'checking' }
  | { kind: 'ready'; remaining: number | null; limit: number | null; resetAt: string | null; byok: boolean }
  | { kind: 'limit_reached'; remaining: 0; limit: number; resetAt: string }
  | { kind: 'premium_required' }
  | { kind: 'unavailable'; reason: AiUnavailableReason; retryable: boolean }

export function quotaFor(status: AiStatus, task: ManagedTask) {
  return task === 'coach' ? status.coach : status.food
}

export function resolveAiAvailability(input: {
  signedIn: boolean
  loading: boolean
  error: string | null
  status: AiStatus | null
  settings: AISettings
  task: ManagedTask
  cloud: boolean
}): AiAvailability {
  if (!input.signedIn) {
    return { kind: 'unavailable', reason: 'unsigned', retryable: false }
  }

  if (usesByok(input.settings)) {
    if (!input.settings.apiKey.trim()) {
      return { kind: 'unavailable', reason: 'missing_key', retryable: false }
    }
    return { kind: 'ready', remaining: null, limit: null, resetAt: null, byok: true }
  }

  if (input.loading && !input.status) return { kind: 'checking' }
  if (input.error && !input.status) {
    return { kind: 'unavailable', reason: 'error', retryable: true }
  }
  if (!input.cloud || !input.status?.enabled) {
    return { kind: 'unavailable', reason: 'disabled', retryable: true }
  }

  if (input.task === 'coach' && input.status.plan !== 'premium') {
    return { kind: 'premium_required' }
  }

  const quota = quotaFor(input.status, input.task)
  if (quota.remaining <= 0) {
    return {
      kind: 'limit_reached',
      remaining: 0,
      limit: quota.limit,
      resetAt: input.status.resetAt,
    }
  }

  return {
    kind: 'ready',
    remaining: quota.remaining,
    limit: quota.limit,
    resetAt: input.status.resetAt,
    byok: false,
  }
}

export function canRunAi(availability: AiAvailability): boolean {
  return availability.kind === 'ready'
}

export function allowanceCopy(
  availability: AiAvailability,
  task: ManagedTask,
  now = Date.now(),
): string | null {
  if (availability.kind === 'ready' && availability.byok) return 'Using your own API key'
  if (availability.kind === 'ready' && availability.remaining != null && availability.limit != null) {
    const unit = task === 'coach' ? 'Coach messages' : 'food scans'
    return `${availability.remaining} of ${availability.limit} ${unit} left · ${resetCopy(availability.resetAt, now)}`
  }
  if (availability.kind === 'limit_reached') {
    return `Daily ${task === 'coach' ? 'Coach' : 'food scan'} limit reached · ${resetCopy(availability.resetAt, now)}`
  }
  return null
}

export function resetCopy(resetAt: string | null, now = Date.now()): string {
  if (!resetAt) return 'resets at midnight UTC'
  const reset = Date.parse(resetAt)
  if (!Number.isFinite(reset)) return 'resets at midnight UTC'
  const hours = Math.max(0, Math.round((reset - now) / 3_600_000))
  if (hours <= 0) return 'resets within the hour (midnight UTC)'
  if (hours === 1) return 'resets in about 1 hour (midnight UTC)'
  return `resets in about ${hours} hours (midnight UTC)`
}
