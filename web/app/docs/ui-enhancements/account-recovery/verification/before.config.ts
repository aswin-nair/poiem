import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repository = path.resolve(here, '../../../../../..')
const baselineApp = path.join(repository, '.cache/account-recovery-baseline-060337c8/web/app')

// Exact archived baseline; fictional intercepted accounts only.
export default defineConfig({
  testDir: here,
  testMatch: /before\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: path.join(here, 'before-results.json') }]],
  outputDir: path.join(here, 'before-results'),
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5397',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node scripts/dev.mjs neon --config "${path.join(here, 'before.vite.config.mjs')}" --host 127.0.0.1 --port 5397 --strictPort`,
    cwd: baselineApp,
    url: 'http://127.0.0.1:5397',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'neon', BROWSER: 'none' },
  },
})
