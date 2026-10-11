import { defineConfig, devices } from '@playwright/test'

// Fictional intercepted accounts; no live account data or credentials.
export default defineConfig({
  testDir: '../../../../e2e',
  testMatch: /(?:connection-recovery|session-expiry|photo-upload)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5395', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', testMatch: /connection-recovery\.spec\.ts/, grep: /new session.*390px/, use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'pixel', testMatch: /connection-recovery\.spec\.ts/, grep: /new session.*390px/, use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev:cloud -- --host 127.0.0.1 --port 5395 --strictPort',
    url: 'http://127.0.0.1:5395',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'neon' },
  },
})
