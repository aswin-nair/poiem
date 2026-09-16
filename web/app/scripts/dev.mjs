import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = process.argv[2] ?? process.env.VITE_DATA_BACKEND
if (backend !== 'local' && backend !== 'neon') {
  console.error('Choose an explicit backend: npm run dev or npm run dev:cloud')
  process.exit(1)
}

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const env = { ...process.env, VITE_DATA_BACKEND: backend }
const extra = process.argv.slice(3)

if (backend === 'neon') {
  const proxy = (env.VITE_API_PROXY ?? 'http://127.0.0.1:3001').replace(/\/$/, '')
  console.warn(
    `[poiem] Cloud backend: /api is proxied to ${proxy}. Start the API first (from web/: npm run dev:all).`,
  )
}

const result = spawnSync(
  process.execPath,
  [join(appRoot, 'node_modules/vite/bin/vite.js'), ...extra],
  { cwd: appRoot, env, stdio: 'inherit' },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
