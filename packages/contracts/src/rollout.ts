export const ROLLOUT_CONTRACT_VERSION = 1 as const

export const ROLLOUT_THRESHOLDS = {
  onboardingCompletion: 0.75,
  firstSessionFirstLog: 0.65,
  p75LogSeconds: 20,
  crashFree: 0.998,
  persistence: 0.9995,
} as const

export const ROLLOUT_COHORTS = {
  internal: { id: 'internal', min: 20, max: 30, inviteRequired: true, publicPercent: null },
  invite: { id: 'invite', min: 50, max: 150, inviteRequired: true, publicPercent: null },
  'public-5': { id: 'public-5', min: null, max: null, inviteRequired: false, publicPercent: 5 },
  'public-25': { id: 'public-25', min: null, max: null, inviteRequired: false, publicPercent: 25 },
  'public-50': { id: 'public-50', min: null, max: null, inviteRequired: false, publicPercent: 50 },
  'public-100': { id: 'public-100', min: null, max: null, inviteRequired: false, publicPercent: 100 },
} as const

export type RolloutCohortId = keyof typeof ROLLOUT_COHORTS

export const PUBLIC_ROLLOUT_STEPS = ['public-5', 'public-25', 'public-50', 'public-100'] as const

export const KILL_SWITCHES = [
  { id: 'cloud-writes', env: 'ENABLE_CLOUD_WRITES', closesWhen: 'false' },
  { id: 'account-creation', env: 'ENABLE_ACCOUNT_CREATION', closesWhen: 'false' },
  { id: 'local-migration', env: 'ENABLE_LOCAL_MIGRATION', opensWhen: 'true' },
  { id: 'entity-projection', env: 'ENABLE_ENTITY_PROJECTION', opensWhen: 'true' },
  { id: 'mobile-auth', env: 'ENABLE_MOBILE_AUTH', opensWhen: 'true' },
  { id: 'remote-telemetry', env: 'ENABLE_REMOTE_TELEMETRY', opensWhen: 'true' },
] as const

export const DOGFOOD_EXERCISES = [
  'export',
  'delete',
  'logout-all',
  'offline-logging',
  'conflict-recovery',
] as const

export interface EnrollmentInput {
  cohort?: string | null
  inviteConfigured: boolean
  invited: boolean
  accountCount: number
  capOverride?: number
}

export type EnrollmentDenial =
  | 'unknown_cohort'
  | 'invite_not_configured'
  | 'not_invited'
  | 'cohort_full'

export function parseRolloutCohort(value: string | null | undefined): RolloutCohortId | null {
  const raw = value?.trim() ?? ''
  if (!raw) return null
  return raw in ROLLOUT_COHORTS ? raw as RolloutCohortId : null
}

export function evaluateEnrollment(input: EnrollmentInput):
  | { ok: true }
  | { ok: false; reason: EnrollmentDenial } {
  const raw = input.cohort?.trim() ?? ''
  if (!raw) return { ok: true }

  const cohort = parseRolloutCohort(raw)
  if (!cohort) return { ok: false, reason: 'unknown_cohort' }
  const spec = ROLLOUT_COHORTS[cohort]
  if (spec.inviteRequired && !input.inviteConfigured) {
    return { ok: false, reason: 'invite_not_configured' }
  }
  if (spec.inviteRequired && !input.invited) {
    return { ok: false, reason: 'not_invited' }
  }
  const cap = input.capOverride ?? spec.max ?? undefined
  if (cap != null && input.accountCount >= cap) {
    return { ok: false, reason: 'cohort_full' }
  }
  return { ok: true }
}

export interface RolloutIncidents {
  crossAccountWrite?: boolean
  lostAcceptedEntry?: boolean
  secretSync?: boolean
  failedDeletion?: boolean
  unsafeTargetBypass?: boolean
  /** Authorized managed traffic is expected; this incident means unauthorized serving. */
  managedAiUnauthorized?: boolean
  /** @deprecated use managedAiUnauthorized. Kept for old rollout callers. */
  managedAiInvoked?: boolean
  unresolvedHighFinding?: boolean
  onboardingCompletion?: number
  firstSessionFirstLog?: number
  p75LogSeconds?: number
  crashFreeRate?: number
  persistenceRate?: number
}

export function evaluateRolloutHalt(signals: RolloutIncidents): string[] {
  const halt: string[] = []
  if (signals.crossAccountWrite) halt.push('cross-account-write')
  if (signals.lostAcceptedEntry) halt.push('lost-accepted-entry')
  if (signals.secretSync) halt.push('secret-sync')
  if (signals.failedDeletion) halt.push('failed-deletion')
  if (signals.unsafeTargetBypass) halt.push('unsafe-target-bypass')
  if (signals.managedAiUnauthorized || signals.managedAiInvoked) halt.push('managed-ai-invoked')
  if (signals.unresolvedHighFinding) halt.push('unresolved-high-finding')
  if (
    signals.onboardingCompletion != null
    && signals.onboardingCompletion < ROLLOUT_THRESHOLDS.onboardingCompletion
  ) {
    halt.push('onboarding-completion')
  }
  if (
    signals.firstSessionFirstLog != null
    && signals.firstSessionFirstLog < ROLLOUT_THRESHOLDS.firstSessionFirstLog
  ) {
    halt.push('first-session-first-log')
  }
  if (signals.p75LogSeconds != null && signals.p75LogSeconds > ROLLOUT_THRESHOLDS.p75LogSeconds) {
    halt.push('standard-log-time')
  }
  if (signals.crashFreeRate != null && signals.crashFreeRate < ROLLOUT_THRESHOLDS.crashFree) {
    halt.push('crash-free')
  }
  if (signals.persistenceRate != null && signals.persistenceRate < ROLLOUT_THRESHOLDS.persistence) {
    halt.push('accepted-entry-persistence')
  }
  return halt
}

export function canPromoteCohort(
  from: string | null | undefined,
  to: string,
  input: { reviewRecorded: boolean; haltReasons: readonly string[] },
): { ok: true } | { ok: false; reason: 'halt' | 'review_required' | 'invalid_step' } {
  if (input.haltReasons.length > 0) return { ok: false, reason: 'halt' }
  if (!input.reviewRecorded) return { ok: false, reason: 'review_required' }

  const next = parseRolloutCohort(to)
  if (!next) return { ok: false, reason: 'invalid_step' }
  const current = parseRolloutCohort(from)

  if (!current && next === 'internal') return { ok: true }
  if (current === 'internal' && next === 'invite') return { ok: true }
  if (current === 'invite' && next === 'public-5') return { ok: true }

  const fromIndex = PUBLIC_ROLLOUT_STEPS.indexOf(current as typeof PUBLIC_ROLLOUT_STEPS[number])
  const toIndex = PUBLIC_ROLLOUT_STEPS.indexOf(next as typeof PUBLIC_ROLLOUT_STEPS[number])
  if (fromIndex >= 0 && toIndex === fromIndex + 1) return { ok: true }
  return { ok: false, reason: 'invalid_step' }
}

export function rolloutCertification(): { certified: false; dogfoodStarted: false } {
  return { certified: false, dogfoodStarted: false }
}
