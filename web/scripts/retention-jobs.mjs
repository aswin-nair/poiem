function asCount(value) {
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid cleanup count')
  return count
}

function pickCounts(row, fields) {
  return Object.fromEntries(fields.map(field => [field, asCount(row?.[field])]))
}

const CLEANUP_FIELDS = [
  'sessions',
  'mutations',
  'reset_tokens',
  'rate_buckets',
  'entity_mutations',
  'migrations',
]

const ORPHAN_FIELDS = [
  'orphan_states',
  'orphan_sessions',
  'orphan_mutations',
  'orphan_reset_tokens',
  'orphan_entities',
  'orphan_tombstones',
  'orphan_cursors',
  'orphan_entity_mutations',
  'orphan_migrations',
]

export function formatRetentionCleanup(counts) {
  return CLEANUP_FIELDS.map(field => `${field}=${counts[field]}`).join(' ')
}

export function formatDeletionOrphans(counts) {
  return ORPHAN_FIELDS.map(field => `${field}=${counts[field]}`).join(' ')
}

export async function runRetentionCleanup(sql) {
  const rows = await sql`
    WITH removed_sessions AS (
      DELETE FROM auth_sessions
      WHERE expires_at < NOW() - INTERVAL '30 days'
         OR revoked_at < NOW() - INTERVAL '30 days'
      RETURNING 1
    ), removed_mutations AS (
      DELETE FROM state_mutations
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING 1
    ), removed_resets AS (
      DELETE FROM password_reset_tokens
      WHERE expires_at < NOW() - INTERVAL '7 days'
         OR consumed_at < NOW() - INTERVAL '7 days'
      RETURNING 1
    ), removed_rate_buckets AS (
      DELETE FROM rate_limit_buckets
      WHERE updated_at < NOW() - INTERVAL '24 hours'
      RETURNING 1
    ), removed_entity_mutations AS (
      DELETE FROM entity_mutations
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING 1
    ), removed_migrations AS (
      DELETE FROM migration_attempts
      WHERE stage IN ('confirmed', 'rolled_back', 'failed')
        AND last_attempt_at < NOW() - INTERVAL '90 days'
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*)::bigint FROM removed_sessions) AS sessions,
      (SELECT COUNT(*)::bigint FROM removed_mutations) AS mutations,
      (SELECT COUNT(*)::bigint FROM removed_resets) AS reset_tokens,
      (SELECT COUNT(*)::bigint FROM removed_rate_buckets) AS rate_buckets,
      (SELECT COUNT(*)::bigint FROM removed_entity_mutations) AS entity_mutations,
      (SELECT COUNT(*)::bigint FROM removed_migrations) AS migrations
  `
  return pickCounts(rows[0], CLEANUP_FIELDS)
}

export async function runDeletionReconciliation(sql) {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::bigint FROM user_states us
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = us.user_id)) AS orphan_states,
      (SELECT COUNT(*)::bigint FROM auth_sessions s
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id)) AS orphan_sessions,
      (SELECT COUNT(*)::bigint FROM state_mutations m
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id)) AS orphan_mutations,
      (SELECT COUNT(*)::bigint FROM password_reset_tokens t
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)) AS orphan_reset_tokens,
      (SELECT COUNT(*)::bigint FROM account_entities e
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id)) AS orphan_entities,
      (SELECT COUNT(*)::bigint FROM entity_tombstones e
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id)) AS orphan_tombstones,
      (SELECT COUNT(*)::bigint FROM device_cursors c
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)) AS orphan_cursors,
      (SELECT COUNT(*)::bigint FROM entity_mutations m
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id)) AS orphan_entity_mutations,
      (SELECT COUNT(*)::bigint FROM migration_attempts a
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id)) AS orphan_migrations
  `
  return pickCounts(rows[0], ORPHAN_FIELDS)
}

export async function runRetentionJobs(sql) {
  const cleanup = await runRetentionCleanup(sql)
  const orphans = await runDeletionReconciliation(sql)
  try { await runAiRetentionCleanup(sql) } catch { /* plan migration may be pending */ }
  return { cleanup, orphans }
}

/** Additive managed-AI retention. Kept separate so older rehearsal fixtures remain stable. */
export async function runAiRetentionCleanup(sql) {
  await sql`DELETE FROM ai_usage_reservations WHERE created_at < NOW() - INTERVAL '14 days' OR (status = 'reserved' AND expires_at < NOW() - INTERVAL '1 day')`
  await sql`DELETE FROM ai_usage_daily WHERE day < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 90`
  await sql`DELETE FROM ai_scope_daily WHERE day < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 90`
}
