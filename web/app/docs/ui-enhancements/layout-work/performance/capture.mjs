import { spawn, execFileSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'
import { appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { platform, release, cpus } from 'node:os'
import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { chromium } from '@playwright/test'
import { VISUAL_USER, VISUAL_NOW, visualSeedState } from '../../../../src/lib/visualSeed.ts'

const root = process.cwd()
const helperSha256 = createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')
const candidateRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const out = resolve(root, 'web/app/docs/ui-enhancements/layout-work/performance')
mkdirSync(out, { recursive: true })
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
const runOut = join(out, 'runs', runId)
mkdirSync(runOut, { recursive: true })
const sources = [
  { id: 'baseline', root: resolve(root, '.cache/layout-work-baseline-84d0cf1e'), dir: resolve(root, '.cache/layout-work-baseline-84d0cf1e/web/app'), port: 5299, revision: execFileSync('git', ['rev-parse', '84d0cf1e'], { cwd: root, encoding: 'utf8' }).trim() },
  { id: 'candidate', root, dir: resolve(root, 'web/app'), port: 5199, revision: candidateRevision },
]
const sha256 = data => createHash('sha256').update(data).digest('hex')
const blobHash = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const sourcePaths = [
  'web/app/src', 'web/app/public', 'web/app/scripts', 'web/app/index.html', 'web/app/vite.config.ts',
  'web/app/package.json', 'web/app/package-lock.json', 'web/app/tsconfig.json',
  'web/app/tsconfig.app.json', 'web/app/tsconfig.node.json',
  'web/shared', 'web/assets', 'web/vercel.json', 'packages',
]
const sourceFiles = ['src/App.tsx', 'src/components/Momo.tsx', 'src/components/Toast.tsx', 'src/pages/CoachPage.tsx', 'src/pages/HomePage.tsx', 'src/components/LogMoment.tsx', 'src/mascot/MascotOverlay.tsx', 'src/lib/motionFeatures.ts', 'src/components/MotionScreen.tsx']

// Check every tracked input against its labelled Git blob. Checkout CRLF is
// accepted only when normalizing it reproduces that exact blob.
function sourceSnapshot(source) {
  const tree = git(['ls-tree', '-r', '-z', source.revision, '--', ...sourcePaths])
  const files = tree.split('\0').filter(Boolean).map(row => {
    const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row)
    if (!match || !['100644', '100755'].includes(match[1])) throw new Error(`Unsupported source entry: ${row}`)
    const [, , gitBlob, file] = match
    const raw = readFileSync(join(source.root, file))
    let canonical = raw
    if (blobHash(raw) !== gitBlob) {
      canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'))
      if (blobHash(canonical) !== gitBlob) throw new Error(`${source.id} differs from ${source.revision}: ${file}`)
    }
    return { file, gitBlob, sha256: sha256(canonical), checkoutSha256: sha256(raw), bytes: raw.length }
  }).sort((a, b) => a.file.localeCompare(b.file))
  if (!files.length) throw new Error(`No verified inputs for ${source.id}`)
  if (source.id === 'candidate') {
    const tracked = [...new Set(git(['ls-files', '-z', '--', ...sourcePaths]).split('\0').filter(Boolean))].sort()
    const expected = files.map(file => file.file).sort()
    if (JSON.stringify(tracked) !== JSON.stringify(expected)) throw new Error('Candidate tracked input paths differ from its revision')
  }
  return { revision: source.revision, sourceTreeSha256: sha256(files.map(file => `${file.file}\0${file.sha256}\n`).join('')), files }
}

function distSnapshot(source) {
  const dir = join(source.dir, 'dist')
  const files = []
  const visit = folder => {
    for (const name of readdirSync(folder).sort()) {
      const file = join(folder, name)
      const stat = lstatSync(file)
      if (stat.isDirectory()) visit(file)
      else if (stat.isFile()) {
        const data = readFileSync(file)
        files.push({ file: relative(dir, file).replace(/\\/g, '/'), sha256: sha256(data), bytes: data.length })
      } else throw new Error(`${source.id} unsupported dist entry: ${relative(dir, file)}`)
    }
  }
  visit(dir)
  files.sort((a, b) => a.file.localeCompare(b.file))
  if (!files.some(file => file.file === 'index.html')) throw new Error(`${source.id} dist has no index.html`)
  return { distTreeSha256: sha256(files.map(file => `${file.file}\0${file.sha256}\n`).join('')), files }
}

// Preserve previous reports and every attempt's logs. Primary report paths are
// kept for the gallery; a failed new run cannot silently reuse older reports.
function preservePreviousReports() {
  for (const name of ['initial-load.json', 'baseline-interactions.json', 'candidate-interactions.json', 'comparison.json']) {
    const file = join(out, name)
    if (!existsSync(file)) continue
    const prior = join(runOut, 'prior')
    mkdirSync(prior, { recursive: true })
    copyFileSync(file, join(prior, name))
    unlinkSync(file)
  }
}
function writeReport(name, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`
  writeFileSync(join(runOut, name), serialized)
  writeFileSync(join(out, name), serialized)
}

// Both sources use the same process, runtime and explicit build settings. No
// environment-file client values are embedded; inherited VITE_* values are
// discarded and the only supplied client settings are recorded below.
const buildSettings = { backend: 'local', googleClientId: '', release: 'unassigned', sourceMap: false, mode: 'production', envFiles: false }
const buildEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^VITE_/i.test(key) && !['RELEASE_ID', 'VERCEL_GIT_COMMIT_SHA'].includes(key)))
Object.assign(buildEnv, { VITE_DATA_BACKEND: 'local', VITE_GOOGLE_CLIENT_ID: '', VITE_RELEASE_ID: 'unassigned', VITE_SOURCEMAP: '' })
async function controlledBuild(source) {
  const config = join(runOut, `${source.id}-vite.config.mjs`)
  // Retain the committed plugins, rewrites, aliases, root and build options.
  // Only environment-file loading, the explicit client values and the owned
  // dist destination are overridden for this controlled comparison.
  writeFileSync(config, `import original from ${JSON.stringify(pathToFileURL(join(source.dir, 'vite.config.ts')).href)}\nimport { mergeConfig } from ${JSON.stringify(pathToFileURL(join(source.dir, 'node_modules/vite/dist/node/index.js')).href)}\nexport default async env => mergeConfig(await original(env), { envDir: false, define: { 'import.meta.env.VITE_DATA_BACKEND': '"local"', 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '""', 'import.meta.env.VITE_RELEASE_ID': '"unassigned"' }, build: { outDir: ${JSON.stringify(join(source.dir, 'dist'))}, emptyOutDir: true } })\n`)
  const log = join(runOut, `${source.id}-build.log`)
  const identity = {
    source: source.id, revision: source.revision, sourceTreeSha256: source.inputSnapshot.sourceTreeSha256,
    lockfileSha256: source.lockfileSha256, dependencyRoot: source.dependencyRoot, runtime: { node: process.version, os: platform(), release: release() },
    settings: buildSettings, wrapperSha256: sha256(readFileSync(config)),
    method: 'Committed Vite configuration wrapped only for explicit client values, disabled env files and owned dist path; forced TypeScript project check, then fresh Vite production build, then the normal local release-info record.',
    log: relative(out, log).replace(/\\/g, '/'), commands: [], startedAt: new Date().toISOString(), status: 'running',
  }
  source.buildIdentity = identity
  source.buildConfig = config
  const record = () => writeFileSync(join(runOut, `${source.id}-build.json`), `${JSON.stringify(identity, null, 2)}\n`)
  record()
  for (const [modulePath, args] of [
    [join(source.dir, 'node_modules/typescript/bin/tsc'), ['-b', '--force']],
    [join(source.dir, 'node_modules/vite/bin/vite.js'), ['build', '--mode', 'production', '--config', config]],
  ]) {
    const command = { executable: process.execPath, module: modulePath, args, startedAt: new Date().toISOString() }
    identity.commands.push(command)
    appendFileSync(log, `\n${JSON.stringify({ module: relative(source.dir, modulePath), args })}\n`)
    record()
    let code
    try {
      code = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [modulePath, ...args], { cwd: source.dir, env: buildEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
        child.stdout.on('data', data => appendFileSync(log, data))
        child.stderr.on('data', data => appendFileSync(log, data))
        child.on('error', reject)
        child.on('exit', (code, signal) => resolve({ code: code ?? 1, signal }))
      })
    } catch (error) {
      Object.assign(command, { error: error.message, finishedAt: new Date().toISOString() })
      identity.status = 'failed'
      record()
      throw new Error(`${source.id} build could not start; retained identity: ${relative(out, join(runOut, `${source.id}-build.json`)).replace(/\\/g, '/')}`)
    }
    Object.assign(command, code, { finishedAt: new Date().toISOString() })
    if (code.code !== 0) {
      identity.status = 'failed'
      record()
      throw new Error(`${source.id} build failed (${code.code}); retained log: ${identity.log}`)
    }
    record()
  }
  writeFileSync(join(source.dir, 'dist/release-info.json'), `${JSON.stringify({ backend: 'local', release: 'unassigned', domainPackage: '@fud-ai/domain' }, null, 2)}\n`)
  identity.status = 'complete'
  identity.finishedAt = new Date().toISOString()
  identity.distSnapshot = distSnapshot(source)
  record()
  source.distSnapshot = identity.distSnapshot
  source.buildIndexSha256 = source.distSnapshot.files.find(file => file.file === 'index.html').sha256
}

function recheckSource(source) {
  const current = sourceSnapshot(source)
  if (JSON.stringify(current) !== JSON.stringify(source.inputSnapshot)) throw new Error(`${source.id} source changed during capture`)
  if (sha256(readFileSync(join(source.dir, 'package-lock.json'))) !== source.lockfileSha256) throw new Error(`${source.id} lockfile changed during capture`)
  if (realpathSync(join(source.dir, 'node_modules')) !== source.dependencyRoot) throw new Error(`${source.id} dependency link changed during capture`)
}
function recheckDist(source) {
  if (JSON.stringify(distSnapshot(source)) !== JSON.stringify(source.distSnapshot)) throw new Error(`${source.id} dist files changed during capture`)
}

const servers = []
async function ready(source) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (servers[sources.indexOf(source)].exitCode !== null) throw new Error(`${source.id} preview exited before readiness`)
    try { if ((await fetch(`http://localhost:${source.port}/app/`, { signal: AbortSignal.timeout(1000) })).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`${source.id} preview unavailable`)
}
let browser
const observations = []
const interactionExits = {}
try {
  preservePreviousReports()
  if (platform() !== 'win32') throw new Error('This comparison requires matching Windows builds')
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('This comparison requires Node 24+')
  for (const source of sources) {
    source.inputSnapshot = sourceSnapshot(source)
    const hashes = new Map(source.inputSnapshot.files.map(file => [file.file, file.sha256]))
    source.sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, hashes.get(`web/app/${file}`) ?? null]))
    source.lockfileSha256 = sha256(readFileSync(join(source.dir, 'package-lock.json')))
    source.dependencyRoot = realpathSync(join(source.dir, 'node_modules'))
    writeFileSync(join(runOut, `${source.id}-inputs.json`), `${JSON.stringify(source.inputSnapshot, null, 2)}\n`)
  }
  if (sources[0].lockfileSha256 !== sources[1].lockfileSha256) throw new Error('Dependency lockfiles differ')
  if (sources[0].dependencyRoot !== sources[1].dependencyRoot) throw new Error('Sources must reuse the same existing dependency installation')
  // Local file: package dependencies resolve through the reused installation.
  // Their source must match across revisions before that reuse is valid.
  const packageTrees = sources.map(source => sha256(source.inputSnapshot.files.filter(input => input.file.startsWith('packages/')).map(input => `${input.file}\0${input.sha256}\n`).join('')))
  if (packageTrees[0] !== packageTrees[1]) throw new Error('Shared package sources differ; the reused dependency installation would not establish an exact baseline')
  // The same unchanged measurement fixture and interaction harness drive both
  // revisions; they must not smuggle a different product fixture into one run.
  for (const file of ['web/app/src/lib/visualSeed.ts', 'web/app/scripts/interaction-trace.mjs', 'packages/product/src/wardrobe.ts']) {
    const hashes = sources.map(source => source.inputSnapshot.files.find(input => input.file === file)?.sha256)
    if (!hashes[0] || hashes[0] !== hashes[1]) throw new Error(`Measurement fixture differs between revisions: ${file}`)
  }
  for (const source of sources) {
    await controlledBuild(source)
    recheckSource(source)
  }
  // Recheck both input trees after both builds, before any browser starts.
  for (const source of sources) { recheckSource(source); recheckDist(source) }
  await Promise.all(sources.map(source => new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(source.port, () => probe.close(resolve))
  })))
  for (const source of sources) servers.push(spawn(process.execPath, [resolve(source.dir, 'node_modules/vite/bin/vite.js'), 'preview', '--mode', 'production', '--config', source.buildConfig, '--port', String(source.port), '--strictPort'], { cwd: source.dir, env: buildEnv, stdio: 'ignore', windowsHide: true }))
  await Promise.all(sources.map(ready))
  browser = await chromium.launch()
  for (let sample = 0; sample < 3; sample++) for (const width of [390, 1440]) for (const source of sources) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, timezoneId: 'UTC' })
    const page = await context.newPage()
    const failures = []
    const assets = new Map()
    page.on('pageerror', error => failures.push(error.message))
    page.on('response', response => {
      const url = new URL(response.url())
      if (response.ok() && /\.(?:js|css)$/.test(url.pathname)) {
        const filename = url.pathname.replace(/^\/(?:app\/)?/, '')
        const data = readFileSync(resolve(source.dir, 'dist', filename))
        assets.set(filename, { filename, sha256: sha256(data), type: filename.endsWith('.js') ? 'js' : 'css', raw: data.length, gzip: gzipSync(data).length, contentEncoding: response.headers()['content-encoding'] ?? 'identity' })
      }
    })
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin !== `http://localhost:${source.port}` || url.pathname.startsWith('/api/') ? route.abort('blockedbyclient') : route.continue()
    })
    await page.addInitScript(({ user, state, now }) => {
      const NativeDate = Date
      const offset = new NativeDate(now).getTime() - NativeDate.now()
      window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [NativeDate.now() + offset])) } static now() { return NativeDate.now() + offset } }
      localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
      localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
      sessionStorage.setItem('poiem-splash-seen', '1')
      window.__POIEM_TEST__ = { rng: () => .5, hideOverlay: true }
      window.__loadMetrics = { lcp: 0, shifts: [] }
      new PerformanceObserver(list => { for (const item of list.getEntries()) window.__loadMetrics.lcp = item.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.__loadMetrics.shifts.push({ value: item.value, start: item.startTime }) }).observe({ type: 'layout-shift', buffered: true })
    }, { user: VISUAL_USER, state: visualSeedState(), now: VISUAL_NOW })
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(`http://localhost:${source.port}/app/`)
    await page.getByRole('progressbar', { name: 'Calories', exact: true }).waitFor()
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => setTimeout(resolve, 2000)) })
    const metrics = await page.evaluate(() => {
      const shifts = window.__loadMetrics.shifts
      let max = 0, value = 0, start = 0, last = 0
      for (const shift of shifts) {
        if (!start || shift.start - last > 1000 || shift.start - start > 5000) { value = 0; start = shift.start }
        value += shift.value; max = Math.max(max, value); last = shift.start
      }
      return { lcpMs: window.__loadMetrics.lcp, cls: max, fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        resourceTransfers: performance.getEntriesByType('resource').filter(item => /\.(js|css)$/.test(new URL(item.name).pathname)).map(item => ({ name: new URL(item.name).pathname, encodedBodySize: item.encodedBodySize, decodedBodySize: item.decodedBodySize, transferSize: item.transferSize })) }
    })
    const rows = [...assets.values()].sort((a, b) => a.filename.localeCompare(b.filename))
    observations.push({ revision: source.revision, source: source.id, sourceHashes: source.sourceHashes, sourceTreeSha256: source.inputSnapshot.sourceTreeSha256, lockfileSha256: source.lockfileSha256, buildIndexSha256: source.buildIndexSha256, distTreeSha256: source.distSnapshot.distTreeSha256, width, sample: sample + 1, assets: rows, jsGzip: rows.filter(row => row.type === 'js').reduce((sum, row) => sum + row.gzip, 0), cssGzip: rows.filter(row => row.type === 'css').reduce((sum, row) => sum + row.gzip, 0), metrics, failures })
    console.log(`${source.id} ${width} sample ${sample + 1}: ${observations.at(-1).jsGzip} JS gzip bytes`)
    await context.close()
  }
  writeReport('initial-load.json', { recordedAt: new Date().toISOString(), runId, helperSha256, browser: browser.version(), node: process.version, os: platform(), release: release(), cpu: cpus()[0]?.model, cpuThrottle: 4, buildSettings, network: 'Unthrottled local preview, fresh context and disabled browser cache; only same-origin assets allowed', method: 'Cold signed-in Today, synthetic account/fixed calendar context, real performance clock. Successful requested JS/CSS gzip footprint computed from matching freshly built files through Calories + fonts + two seconds; gzip is an asset estimate, not measured wire transfer. Actual local resource sizes and content encodings are recorded separately. LCP/CLS/FCP are three controlled samples per width, not field percentiles or INP. Baseline precedes candidate within each width/sample; order is not randomized.', observations })
  await browser.close()
  browser = null
  for (const source of sources) {
    const interactionFile = join(runOut, `${source.id}-interactions.json`)
    const child = spawn(process.execPath, [resolve(root, 'web/app/scripts/interaction-trace.mjs'), '--url', `http://localhost:${source.port}/app/`, '--revision', source.revision, '--repetitions', '10', '--output', interactionFile], { cwd: resolve(root, 'web/app'), stdio: 'inherit', windowsHide: true })
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)) })
    interactionExits[source.id] = code
    if (!existsSync(interactionFile)) throw new Error(`${source.id} interaction harness exited without a report (${code})`)
    copyFileSync(interactionFile, join(out, `${source.id}-interactions.json`))
    console.log(`${source.id} interaction budget exit: ${code}`)
  }
  for (const source of sources) {
    recheckSource(source)
    recheckDist(source)
  }
  if (sha256(readFileSync(new URL(import.meta.url))) !== helperSha256) throw new Error('Measurement helper changed during capture')
  writeReport('comparison.json', { recordedAt: new Date().toISOString(), runId, helperSha256, status: 'complete', buildSettings,
    sourceRecheckedAfterMeasurement: true, allDistFilesRecheckedAfterMeasurement: true, lockfilesRecheckedAfterMeasurement: true,
    sources: sources.map(({ id, revision, sourceHashes, lockfileSha256, buildIndexSha256, inputSnapshot, distSnapshot, buildIdentity }) => ({ id, revision, sourceHashes, lockfileSha256, buildIndexSha256, inputSnapshot, distSnapshot, buildIdentity })), interactionExits,
    retainedAttempt: relative(out, runOut).replace(/\\/g, '/'),
    note: 'Budget child exits are retained. Complete means capture and freeze verification finished; it is not an acceptance pass.' })
} catch (error) {
  if (observations.length) writeFileSync(join(runOut, 'partial-initial-load.json'), `${JSON.stringify({ runId, helperSha256, status: 'partial', observations }, null, 2)}\n`)
  const failure = { recordedAt: new Date().toISOString(), runId, helperSha256, status: 'failed', error: error.message, buildSettings,
    sourceRecheckedAfterMeasurement: false, allDistFilesRecheckedAfterMeasurement: false, lockfilesRecheckedAfterMeasurement: false,
    interactionExits, retainedAttempt: relative(out, runOut).replace(/\\/g, '/'),
    sources: sources.map(({ id, revision, inputSnapshot, buildIdentity, distSnapshot }) => ({ id, revision, inputSnapshot, buildIdentity, distSnapshot })),
    note: 'Failed attempts, any partial measurements, build identities and build logs are retained. Helper failure is not an acceptance pass.' }
  writeFileSync(join(runOut, 'failure.json'), `${JSON.stringify(failure, null, 2)}\n`)
  writeReport('comparison.json', failure)
  throw error
} finally {
  if (browser) await browser.close()
  for (const server of servers) server.kill()
}
