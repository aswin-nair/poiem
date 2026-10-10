import { defineConfig, devices } from '@playwright/test'

// Cloud client paths against intercepted local service responses. No live account service is used.
export default defineConfig({
  testDir: './e2e',
  testMatch: /session-expiry\.spec\.ts/,
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  outputDir: './.cache/session-continuity-results',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5294', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev:cloud -- --port 5294 --strictPort',
    url: 'http://localhost:5294',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'neon' },
  },
})
