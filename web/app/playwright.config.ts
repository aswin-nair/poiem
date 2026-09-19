import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.012,
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /production\.spec\.ts|visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
        timezoneId: 'UTC',
        viewport: { width: 390, height: 900 },
      },
    },
    {
      name: 'production',
      testMatch: /production\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_GOOGLE_CLIENT_ID: '',
        VITE_DATA_BACKEND: 'local',
      },
    },
    {
      command: 'npm run preview -- --port 4173 --strictPort --mode production',
      url: 'http://localhost:4173/app/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
