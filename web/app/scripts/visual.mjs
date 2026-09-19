import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const repoRoot = resolve(appRoot, '../..')
const update = process.argv.includes('--update')
const inContainer = existsSync('/.dockerenv') || process.env.PLAYWRIGHT_CONTAINER === '1'
const args = ['test', '--project=visual', ...(update ? ['--update-snapshots'] : [])]

if (inContainer) {
  const result = spawnSync('npx', ['playwright', ...args], {
    cwd: appRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  })
  process.exit(result.status ?? 1)
}

const volume = `${repoRoot}:/work`
const result = spawnSync('docker', [
  'run', '--rm',
  '-v', volume,
  '-v', 'poiem-visual-nm:/work/web/app/node_modules',
  '-w', '/work/web/app',
  '-e', 'CI=1',
  '-e', 'PLAYWRIGHT_CONTAINER=1',
  '-e', 'VITE_GOOGLE_CLIENT_ID=',
  '-e', 'VITE_DATA_BACKEND=local',
  'mcr.microsoft.com/playwright:v1.61.1-noble',
  'bash', '-lc', `npm ci && npm run build:local && npx playwright ${args.join(' ')}`,
], { stdio: 'inherit', cwd: repoRoot })

process.exit(result.status ?? 1)
