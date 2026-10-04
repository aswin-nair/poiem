import { defineConfig, devices } from '@playwright/test'

/** A tool, not a suite: it rewrites `src/index.css` between tests, so it runs
 *  alone, in order, against the dev server the main config already defines. */
const PORT = 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: '.',
  testMatch: /style-effect\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 20 * 60_000,
  use: { ...devices['Desktop Chrome'], baseURL, timezoneId: 'UTC' },
  webServer: [{
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  }],
})
