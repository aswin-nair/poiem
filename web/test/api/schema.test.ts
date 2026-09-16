import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8')

describe('account security schema', () => {
  it('cascades all user-owned security and state records on account deletion', () => {
    for (const table of [
      'user_states',
      'auth_sessions',
      'state_mutations',
      'password_reset_tokens',
      'account_entities',
      'entity_tombstones',
      'device_cursors',
      'entity_mutations',
      'migration_attempts',
    ]) {
      const declaration = new RegExp(
        `CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?REFERENCES users\\(id\\) ON DELETE CASCADE`,
      )
      expect(schema).toMatch(declaration)
    }
  })

  it('installs a per-user idempotent state mutation function and ledger key', () => {
    expect(schema).toContain('PRIMARY KEY (user_id, mutation_id)')
    expect(schema).toContain('CREATE OR REPLACE FUNCTION save_user_state_idempotent')
    expect(schema).toContain('pg_advisory_xact_lock')
    expect(schema).toContain("'mutation_conflict'::TEXT")
  })

  it('records rotating refresh hashes on auth sessions', () => {
    expect(schema).toContain('refresh_token_hash')
    expect(schema).toContain('previous_refresh_token_hash')
    expect(schema).toContain('family_id')
  })

  it('counts managed-AI fallbacks on the reservation that actually retried', () => {
    expect(schema).toContain('fallback_count integer NOT NULL DEFAULT 0')
    expect(schema).toContain('SET fallback_count = fallback_count + 1')
  })

  it('adds calendar-stable entity tables without replacing snapshot writes', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS account_entities')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS entity_tombstones')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS device_cursors')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS migration_attempts')
    expect(schema).toContain('CREATE OR REPLACE FUNCTION apply_entity_mutation')
    expect(schema).toContain('CREATE OR REPLACE FUNCTION save_user_state_idempotent')
    expect(schema).toContain('account_entities_calendar_required')
  })
})
