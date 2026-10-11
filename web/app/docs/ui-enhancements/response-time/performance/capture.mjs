import { spawn, execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { platform, release, cpus } from 'node:os'
import { createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { VISUAL_USER, VISUAL_NOW, visualSeedState } from '../../../../src/lib/visualSeed.ts'

const root = process.cwd()
const candidateRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const out = resolve(root, 'web/app/docs/ui-enhancements/response-time/performance')
mkdirSync(out, { recursive: true })
const sources = [
  { id: 'baseline', dir: resolve(root, '.cache/response-time-baseline-131bd0d7/web/app'), port: 5299, revision: '131bd0d74ebdef897e31e962377f295f758ce927' },
  { id: 'candidate', dir: resolve(root, 'web/app'), port: 5199, revision: candidateRevision },
]
const sha256 = data => createHash('sha256').update(data).digest('hex')
const sourceFiles = ['src/App.tsx', 'src/components/Momo.tsx', 'src/components/Toast.tsx', 'src/pages/CoachPage.tsx', 'src/lib/motionFeatures.ts', 'src/components/MotionScreen.tsx']
for (const source of sources) {
  source.sourceHashes = Object.fromEntries(sourceFiles.map(file => {
    if (!existsSync(resolve(source.dir, file))) {
      const committedExists = execFileSync('git', ['ls-tree', source.revision, `web/app/${file}`], { cwd: root, encoding: 'utf8' }).trim()
      if (committedExists) throw new Error(`${source.id} source file missing: ${file}`)
      return [file, null]
    }
    const actual = readFileSync(resolve(source.dir, file), 'utf8').replace(/\r\n/g, '\n')
    const committed = execFileSync('git', ['show', `${source.revision}:web/app/${file}`], { cwd: root, encoding: 'utf8' })
    if (actual !== committed) throw new Error(`${source.id} source differs from its revision: ${file}`)
    return [file, sha256(actual)]
  }))
  source.lockfileSha256 = sha256(readFileSync(resolve(source.dir, 'package-lock.json')))
  source.buildIndexSha256 = sha256(readFileSync(resolve(source.dir, 'dist/index.html')))
}
if (sources[0].lockfileSha256 !== sources[1].lockfileSha256) throw new Error('Dependency lockfiles differ')
const servers = sources.map(source => spawn(process.execPath, [resolve(source.dir, 'node_modules/vite/bin/vite.js'), 'preview', '--mode', 'production', '--port', String(source.port), '--strictPort'], { cwd: source.dir, stdio: 'ignore', windowsHide: true }))
async function ready(source) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`http://localhost:${source.port}/app/`)).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`${source.id} preview unavailable`)
}
let browser
const observations = []
try {
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
    observations.push({ revision: source.revision, source: source.id, sourceHashes: source.sourceHashes, lockfileSha256: source.lockfileSha256, buildIndexSha256: source.buildIndexSha256, width, sample: sample + 1, assets: rows, jsGzip: rows.filter(row => row.type === 'js').reduce((sum, row) => sum + row.gzip, 0), cssGzip: rows.filter(row => row.type === 'css').reduce((sum, row) => sum + row.gzip, 0), metrics, failures })
    console.log(`${source.id} ${width} sample ${sample + 1}: ${observations.at(-1).jsGzip} JS gzip bytes`)
    await context.close()
  }
  writeFileSync(resolve(out, 'initial-load.json'), JSON.stringify({ recordedAt: new Date().toISOString(), browser: browser.version(), node: process.version, os: platform(), release: release(), cpu: cpus()[0]?.model, cpuThrottle: 4, network: 'Unthrottled local preview, fresh context and disabled browser cache; only same-origin assets allowed', method: 'Cold signed-in Today, synthetic account/fixed calendar context, real performance clock. Successful requested JS/CSS gzip footprint computed from matching build files through Calories + fonts + two seconds; gzip is an asset estimate, not measured wire transfer. Actual local resource sizes and content encodings are recorded separately. LCP/CLS/FCP are three controlled samples per width, not field percentiles or INP. Source order alternates baseline/candidate within each width/sample.', observations }, null, 2) + '\n')
  await browser.close()
  browser = null
  for (const source of sources) {
    const child = spawn(process.execPath, [resolve(root, 'web/app/scripts/interaction-trace.mjs'), '--url', `http://localhost:${source.port}/app/`, '--revision', source.revision, '--repetitions', '10', '--output', resolve(out, `${source.id}-interactions.json`)], { cwd: resolve(root, 'web/app'), stdio: 'inherit', windowsHide: true })
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)) })
    console.log(`${source.id} interaction budget exit: ${code}`)
  }
} finally {
  if (browser) await browser.close()
  for (const server of servers) server.kill()
}
