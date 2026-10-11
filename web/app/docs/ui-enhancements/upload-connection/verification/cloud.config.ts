import { defineConfig, devices } from '@playwright/test'

// Cloud client lifecycle against intercepted fictional service responses only.
export default defineConfig({
  testDir: '../../../../e2e',
  testMatch: /(?:connection-recovery|photo-upload)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5295', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev:cloud -- --host 127.0.0.1 --port 5295 --strictPort',
    url: 'http://127.0.0.1:5295',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'neon' },
  },
})
