import { defineConfig, mergeConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repository = path.resolve(here, '../../../../../..')
const baseline = path.join(repository, '.cache/account-recovery-baseline-060337c8')
const baselineApp = path.join(baseline, 'web/app')

export default defineConfig(async env => {
  const module = await import(pathToFileURL(path.join(baselineApp, 'vite.config.ts')).href)
  const original = typeof module.default === 'function' ? await module.default(env) : module.default
  return mergeConfig(original, {
    root: baselineApp,
    cacheDir: path.join(baseline, '.cache/vite'),
    server: { open: false },
  })
})
