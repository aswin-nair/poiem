import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  HOBBY_SERVERLESS_FUNCTION_LIMIT,
  listVercelServerlessFunctions,
} from '../../scripts/vercel-function-count.mjs'

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '../../api')

describe('Vercel Hobby function count', () => {
  it('keeps serverless entrypoints at or under the Hobby limit', () => {
    const files = listVercelServerlessFunctions(apiRoot)
    expect(files).toEqual([
      'account.ts',
      'admin.ts',
      'ai.ts',
      'auth.ts',
      'cron/retention.ts',
      'entities.ts',
      'gemini.js',
      'health.ts',
      'migrations.ts',
      'ready.ts',
      'state.ts',
    ])
    expect(files.length).toBeLessThanOrEqual(HOBBY_SERVERLESS_FUNCTION_LIMIT)
    expect(files.some(file => file.startsWith('_') || file.includes('/_'))).toBe(false)
  })
})
