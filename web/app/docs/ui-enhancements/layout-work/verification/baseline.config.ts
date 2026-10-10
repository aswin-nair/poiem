import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import base from '../../../../playwright.config'

// Exact exported product source; unchanged timer fixtures run from this checkout.
const baselineApp = fileURLToPath(new URL('../../../../../../.cache/layout-work-baseline-84d0cf1e/web/app', import.meta.url))
const baseURL = 'http://127.0.0.1:5296'

export default defineConfig({
  ...base,
  testDir: '../../../../e2e',
  workers: 1,
  retries: 0,
  use: { ...base.use, baseURL },
  projects: base.projects?.filter(project => project.name === 'chromium').map(project => ({
    ...project,
    use: { ...project.use, baseURL },
  })),
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5296 --strictPort',
    cwd: baselineApp,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  },
})
