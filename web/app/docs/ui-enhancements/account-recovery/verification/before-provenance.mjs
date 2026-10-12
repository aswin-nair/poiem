import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repository = path.resolve(here, '../../../../../..')
const revision = '060337c80c99efd836062f0fb77357f9bf30c82b'
const baseline = path.join(repository, '.cache/account-recovery-baseline-060337c8')
const phase = process.argv[2] ?? 'before'
const sourcePaths = ['web/app/src', 'web/app/public', 'web/app/index.html', 'web/app/vite.config.ts',
  'web/app/package.json', 'web/app/package-lock.json', 'web/app/tsconfig.json', 'web/app/tsconfig.app.json',
  'web/app/tsconfig.node.json', 'web/app/scripts', 'web/shared', 'web/assets', 'web/vercel.json', 'packages']
const tree = execFileSync('git', ['ls-tree', '-r', '-z', revision, '--', ...sourcePaths], { cwd: repository, encoding: 'utf8' })
const sourceFiles = []
const failures = []
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const matchingFormat = (bytes, expected) => {
  if (gitBlob(bytes) === expected) return 'raw'
  // Git archive and this Windows checkout apply the tracked text EOL policy.
  const normalized = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'))
  return gitBlob(normalized) === expected ? 'crlf-normalized' : null
}
for (const line of tree.split('\0').filter(Boolean)) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
  if (!match) continue
  const [, expectedBlob, relative] = match
  const bytes = fs.readFileSync(path.join(baseline, relative))
  const format = matchingFormat(bytes, expectedBlob)
  if (!format) failures.push(relative)
  let reusedDependencyFormat
  if (relative.startsWith('packages/')) {
    const shared = fs.readFileSync(path.join(repository, relative))
    reusedDependencyFormat = matchingFormat(shared, expectedBlob)
    if (!reusedDependencyFormat) failures.push(`reused-dependency:${relative}`)
  }
  sourceFiles.push({ path: relative, gitBlob: expectedBlob, sha256: sha256(bytes), format, reusedDependencyFormat })
}
const harnessFiles = ['before.config.ts', 'before.spec.ts', 'before.vite.config.mjs', 'before-provenance.mjs']
const harness = harnessFiles.map(relative => ({ path: relative, sha256: sha256(fs.readFileSync(path.join(here, relative))) }))
const seedFiles = ['web/app/e2e/seed.ts', 'web/app/src/lib/visualSeed.ts']
const seeds = seedFiles.map(relative => ({ path: relative, sha256: sha256(fs.readFileSync(path.join(repository, relative))) }))
const archiveHash = createHash('sha256')
await new Promise((resolve, reject) => {
  const stream = fs.createReadStream(`${baseline}.tar`)
  stream.on('data', bytes => archiveHash.update(bytes))
  stream.on('end', resolve)
  stream.on('error', reject)
})
const report = { phase, checkedAt: new Date().toISOString(), revision, baseline, sourceMatchesRevision: failures.length === 0,
  failures, sourceFiles, harness, seeds, archiveSha256: archiveHash.digest('hex'),
  environment: { node: process.version, platform: process.platform, port: 5397, backend: 'neon', googleClientId: '',
    liveApi: false, liveDatabase: false, cacheDir: path.join(baseline, '.cache/vite'),
    appDependencies: fs.realpathSync(path.join(baseline, 'web/app/node_modules')) } }
fs.writeFileSync(path.join(here, `before-provenance-${phase}.json`), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ revision, phase, sourceMatchesRevision: report.sourceMatchesRevision,
  sourceFileCount: sourceFiles.length, archiveSha256: report.archiveSha256, failureCount: failures.length, firstFailures: failures.slice(0, 5) }))
if (failures.length) process.exitCode = 1
