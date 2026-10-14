import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../../../../e2e',
  testMatch: /(?:auth|meal-flow|saved-library-sorting|momo-interlude|journey-release)\.spec\.ts/,
  workers: 1, retries: 0, timeout: 60000, reporter: 'list',
  expect: { timeout: 10000 },
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5196', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --port 5196 --strictPort', url: 'http://localhost:5196',
    reuseExistingServer: false, timeout: 120000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  },
})
