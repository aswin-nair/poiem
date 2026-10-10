import { defineConfig } from '@playwright/test'
import base from '../../../../playwright.config'

// Isolated worktree ports. Never reuse the user's 5173/4173 servers.
export default defineConfig({
  ...base,
  testDir: '../../../../e2e',
  workers: 2,
  use: { ...base.use, baseURL: 'http://localhost:5194' },
  projects: base.projects?.filter(project => project.name !== 'visual').map(project => ({
    ...project,
    use: { ...project.use, baseURL: project.name === 'production' ? 'http://localhost:4194' : 'http://localhost:5194' },
  })),
  webServer: [
    { command: 'npm run dev -- --port 5194 --strictPort', url: 'http://localhost:5194', reuseExistingServer: true, timeout: 120000, env: { VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' } },
    { command: 'npm run preview -- --port 4194 --strictPort', url: 'http://localhost:4194/app/login', reuseExistingServer: true, timeout: 120000 },
  ],
})

