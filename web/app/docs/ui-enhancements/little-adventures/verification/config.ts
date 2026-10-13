import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../../../../e2e', testMatch: 'little-adventures.spec.ts', workers: 1,
  timeout: 60000, expect: { timeout: 10000 },
  use: { baseURL: 'http://localhost:5194', trace: 'retain-on-failure', screenshot: 'only-on-failure', timezoneId: 'UTC' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'pixel', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5194 --strictPort', url: 'http://localhost:5194',
    reuseExistingServer: true, timeout: 120000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  },
})
