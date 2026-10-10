import { defineConfig, devices } from '@playwright/test'
import base from '../../../../playwright.config'

// Focused checks in the same pinned Linux image as the canonical visual pass.
// Run from web/app; leave the user's development and preview ports alone.
export default defineConfig({
  ...base,
  testDir: '../../../../e2e',
  testMatch: /backup-import\.spec\.ts|settings-departure\.spec\.ts|sheet-ready\.spec\.ts|settings-deep-link-recovery\.spec\.ts|route-download-recovery\.spec\.ts|navigation\.spec\.ts/,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: { ...base.use, baseURL: 'http://localhost:5196', timezoneId: 'UTC' },
  projects: [
    { name: 'webkit-recovery', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox-recovery', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [{
    command: 'npm run dev -- --port 5196 --strictPort',
    url: 'http://localhost:5196',
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  }],
})
