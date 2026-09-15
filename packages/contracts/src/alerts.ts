export const ALERT_CATALOG_VERSION = 1 as const

export interface AlertRule {
  id: string
  signal: string
  condition: string
  owner: 'UNASSIGNED' | string
  blocking: boolean
}

export interface AlertCatalog {
  schemaVersion: typeof ALERT_CATALOG_VERSION
  sink: 'disabled'
  privacyApproval: 'pending'
  rules: AlertRule[]
}

export const ALERT_CATALOG: AlertCatalog = {
  schemaVersion: 1,
  sink: 'disabled',
  privacyApproval: 'pending',
  rules: [
    { id: 'api-5xx', signal: 'api_requests', condition: '5xx >2% for 5 minutes', owner: 'UNASSIGNED', blocking: true },
    { id: 'api-p95', signal: 'api_latency', condition: 'p95 >1.5s for 10 minutes', owner: 'UNASSIGNED', blocking: true },
    { id: 'db-ready', signal: 'database_ready', condition: 'readiness probe failed', owner: 'UNASSIGNED', blocking: true },
    { id: 'auth-failures', signal: 'auth_failures', condition: '3x seven-day baseline or rate-limit saturation', owner: 'UNASSIGNED', blocking: true },
    { id: 'state-conflicts', signal: 'state_conflicts', condition: '>1% of state writes for 10 minutes', owner: 'UNASSIGNED', blocking: true },
    { id: 'sync-backlog', signal: 'sync_backlog', condition: 'p95 oldest mutation >15 minutes while online', owner: 'UNASSIGNED', blocking: true },
    { id: 'sync-persistence', signal: 'accepted_entry_persistence', condition: 'below 99.95%', owner: 'UNASSIGNED', blocking: true },
    { id: 'migration-failure', signal: 'migration_failures', condition: 'any failure', owner: 'UNASSIGNED', blocking: true },
    { id: 'deletion-failure', signal: 'destructive_deletion', condition: 'any unconfirmed or failed deletion', owner: 'UNASSIGNED', blocking: true },
    { id: 'ai-provider-errors', signal: 'ai_requests', condition: 'provider error >10% for 10 minutes', owner: 'UNASSIGNED', blocking: true },
    { id: 'managed-ai-invoked', signal: 'managed_ai_invoked', condition: 'unauthorized/unentitled serving or unexpected enablement', owner: 'UNASSIGNED', blocking: true },
    { id: 'crash-free', signal: 'crash_free_sessions', condition: 'below 99.8%', owner: 'UNASSIGNED', blocking: true },
  ],
}

export interface AlertMetrics {
  api5xxRate?: number
  apiP95Ms?: number
  databaseReady?: boolean
  authFailureMultiple?: number
  stateConflictRate?: number
  syncBacklogMinutes?: number
  persistenceRate?: number
  migrationFailures?: number
  deletionFailures?: number
  aiProviderErrorRate?: number
  managedAiInvocations?: number
  /** Authorized managed calls are expected traffic; only this metric pages. */
  managedAiUnauthorizedInvocations?: number
  crashFreeRate?: number
}

export function evaluateAlertRules(metrics: AlertMetrics): string[] {
  const firing: string[] = []
  if (metrics.api5xxRate != null && metrics.api5xxRate > 0.02) firing.push('api-5xx')
  if (metrics.apiP95Ms != null && metrics.apiP95Ms > 1500) firing.push('api-p95')
  if (metrics.databaseReady === false) firing.push('db-ready')
  if (metrics.authFailureMultiple != null && metrics.authFailureMultiple >= 3) firing.push('auth-failures')
  if (metrics.stateConflictRate != null && metrics.stateConflictRate > 0.01) firing.push('state-conflicts')
  if (metrics.syncBacklogMinutes != null && metrics.syncBacklogMinutes > 15) firing.push('sync-backlog')
  if (metrics.persistenceRate != null && metrics.persistenceRate < 0.9995) firing.push('sync-persistence')
  if ((metrics.migrationFailures ?? 0) > 0) firing.push('migration-failure')
  if ((metrics.deletionFailures ?? 0) > 0) firing.push('deletion-failure')
  if (metrics.aiProviderErrorRate != null && metrics.aiProviderErrorRate > 0.1) firing.push('ai-provider-errors')
  if ((metrics.managedAiUnauthorizedInvocations ?? metrics.managedAiInvocations ?? 0) > 0) firing.push('managed-ai-invoked')
  if (metrics.crashFreeRate != null && metrics.crashFreeRate < 0.998) firing.push('crash-free')
  return firing
}
