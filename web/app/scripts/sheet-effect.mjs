/**
 * Asks, for each legacy stylesheet: if this import disappears, does any pixel move?
 *
 * A sheet whose classes still render can still be inert, because the system layer
 * may already win every declaration it sets. Class-name pruning cannot see that;
 * removing the import and comparing the committed baselines can.
 *
 * Run inside the Playwright container, from web/app:
 *   node scripts/sheet-effect.mjs            # every legacy sheet, one at a time
 *   node scripts/sheet-effect.mjs --together # all the inert ones at once
 *
 * A clean result is a candidate, not a verdict: the baselines cover nine surfaces,
 * so confirm with the full e2e suite before deleting anything.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const indexPath = join(appRoot, 'src/index.css')
const original = readFileSync(indexPath, 'utf8')

const SYSTEM = /^styles\/(system|a11y)/
const MIGRATED = /^styles\/screens\/(kitchen|today|flows|insights|you|admin|first-run|pages|account)\.css$/
const sheets = [...original.matchAll(/@import '\.\/([^']+)'/g)]
  .map(match => match[1])
  .filter(path => !SYSTEM.test(path) && !MIGRATED.test(path))

const withoutSheets = (css, paths) =>
  paths.reduce((acc, path) => acc.replace(new RegExp(`@import '\\./${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}';\\r?\\n`), ''), css)

function baselinesHold(label) {
  const build = spawnSync('npm', ['run', 'build:local'], { cwd: appRoot, encoding: 'utf8', shell: process.platform === 'win32' })
  if (build.status !== 0) return { ok: false, note: 'build failed' }
  const run = spawnSync('npx', ['playwright', 'test', '--project=visual', '--retries=0', '--workers=1', '--reporter=line'], {
    cwd: appRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1', VITE_GOOGLE_CLIENT_ID: '', VITE_DATA_BACKEND: 'local' },
  })
  const output = `${run.stdout}${run.stderr}`
  const moved = [...output.matchAll(/screenshots-(.+?)-visual\//g)].map(match => match[1])
  console.log(`${run.status === 0 ? 'INERT   ' : 'IN USE  '} ${label}${moved.length ? `  (${[...new Set(moved)].length} baselines moved)` : ''}`)
  return { ok: run.status === 0, moved: [...new Set(moved)] }
}

try {
  if (process.argv.includes('--together')) {
    const inert = JSON.parse(readFileSync(join(appRoot, '.inert-sheets.json'), 'utf8'))
    writeFileSync(indexPath, withoutSheets(original, inert))
    baselinesHold(`all ${inert.length} inert sheets at once`)
  } else {
    const inert = []
    for (const sheet of sheets) {
      writeFileSync(indexPath, withoutSheets(original, [sheet]))
      if (baselinesHold(sheet).ok) inert.push(sheet)
    }
    writeFileSync(join(appRoot, '.inert-sheets.json'), `${JSON.stringify(inert, null, 2)}\n`)
    console.log(`\n${inert.length} of ${sheets.length} legacy sheets move no pixel on their own`)
  }
} finally {
  writeFileSync(indexPath, original)
}
