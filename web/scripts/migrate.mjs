import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Pool } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL to your Neon connection string.')
  process.exit(1)
}

const root = dirname(fileURLToPath(import.meta.url))
const target = process.argv[2] === 'security'
  ? '../db/migrations/20260820_account_security.sql'
  : process.argv[2] === 'refresh'
    ? '../db/migrations/20260820_refresh_sessions.sql'
    : process.argv[2] === 'entities'
      ? '../db/migrations/20260820_entity_contracts.sql'
      : process.argv[2] === 'plans'
        ? '../db/migrations/20260916_plans.sql'
        : process.argv[2] === 'ops'
          ? '../db/migrations/20260917_admin_ops.sql'
          : '../db/schema.sql'
const schema = readFileSync(join(root, target), 'utf8')
const pool = new Pool({ connectionString: url })

console.log('Applying schema to Neon…')
await pool.query(schema)
await pool.end()
console.log('Done.')
