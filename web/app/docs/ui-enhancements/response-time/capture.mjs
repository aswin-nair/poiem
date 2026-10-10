import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { platform, release } from 'node:os'
import { createServer } from 'node:net'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { VISUAL_NOW, VISUAL_USER, visualSeedState } from '../../../src/lib/visualSeed.ts'

// Node 24+, from any directory. No builds, installs or checkout changes.
// Run after other browser work has stopped; ports 5297 and 5197 must be free.
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../..')
const repoRoot = resolve(appRoot, '../..')
const args = process.argv.slice(2)
const argument = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
const out = resolve(argument('--output') ?? here)
const baselineRoot = resolve(argument('--baseline-root') ?? join(repoRoot, '.cache/response-time-baseline-131bd0d7'))
const git = (...values) => execFileSync('git', values, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
const sha256 = data => createHash('sha256').update(data).digest('hex')
const blobHash = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
const sourcePaths = [
  'web/app/src', 'web/app/public', 'web/app/index.html', 'web/app/vite.config.ts',
  'web/app/package.json', 'web/app/package-lock.json', 'web/app/tsconfig.json',
  'web/app/tsconfig.app.json', 'web/app/tsconfig.node.json',
  'web/shared', 'web/assets', 'web/vercel.json', 'packages',
]
const sources = [
  { id: 'before', title: 'Baseline', root: baselineRoot, revision: git('rev-parse', '131bd0d7'), port: 5297 },
  { id: 'after', title: 'Candidate', root: repoRoot, revision: git('rev-parse', '40be9ec3'), port: 5197 },
]
const views = [{ id: 'phone', title: 'Phone', width: 390, height: 900 }, { id: 'desktop', title: 'Desktop', width: 1440, height: 900 }]
const themes = ['light', 'dark']
const screens = [
  { id: 'today', title: 'Today', route: '/', signedIn: true, ready: '.k-home [role="progressbar"][aria-label="Calories"]' },
  { id: 'welcome', title: 'Welcome', route: '/welcome', signedIn: false, ready: '.wp-hero h1' },
  { id: 'login', title: 'Sign in', route: '/login?mode=signin', signedIn: false, ready: '.auth-form button[type="submit"]' },
  { id: 'onboarding', title: 'First session introduction', route: '/onboarding', signedIn: false, ready: '.k-intro h1' },
  { id: 'admin', title: 'Admin · local preview', route: '/admin', signedIn: true, ready: '.admin-body' },
  { id: 'coach', title: 'Coach · synthetic conversation', route: '/coach', signedIn: true, ready: '.k-coach-msg.is-assistant .k-coach-text' },
]
const jobs = screens.flatMap(screen => views.flatMap(view => themes.map(theme => ({ screen, view, theme, id: `${screen.id}-${view.id}-${theme}` }))))

function prepareBaseline() {
  if (!existsSync(baselineRoot)) {
    mkdirSync(baselineRoot, { recursive: true })
    const archive = join(repoRoot, '.cache', `response-time-gallery-baseline-${process.pid}.tar`)
    try {
      execFileSync('git', ['archive', '--format=tar', '--output', archive, sources[0].revision, ...sourcePaths], { cwd: repoRoot })
      execFileSync('tar', ['-xf', archive, '-C', baselineRoot], { windowsHide: true })
    } finally { if (existsSync(archive)) unlinkSync(archive) }
  }
  const link = join(baselineRoot, 'web/app/node_modules')
  if (!existsSync(link)) symlinkSync(join(appRoot, 'node_modules'), link, process.platform === 'win32' ? 'junction' : 'dir')
}

// Verify every tracked input in the source trees, including shared packages and
// visual assets. Accept checkout CRLF only when normalization matches the blob.
function snapshot(source) {
  source.dir = join(source.root, 'web/app')
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', source.revision, '--', ...sourcePaths], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  const files = tree.split('\0').filter(Boolean).map(row => {
    const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(row)
    if (!match || !['100644', '100755'].includes(match[1])) throw new Error(`Unsupported source entry: ${row}`)
    const [, , committedBlob, file] = match
    const raw = readFileSync(join(source.root, file))
    let canonical = raw
    if (blobHash(raw) !== committedBlob) {
      canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'))
      if (blobHash(canonical) !== committedBlob) throw new Error(`${source.id} differs from ${source.revision}: ${file}`)
    }
    return { file, gitBlob: committedBlob, sha256: sha256(canonical), checkoutSha256: sha256(raw), bytes: raw.length }
  }).sort((a, b) => a.file.localeCompare(b.file))
  if (!files.length) throw new Error(`No verified input files for ${source.id}`)
  return { revision: source.revision, sourceTreeSha256: sha256(files.map(file => `${file.file}\0${file.sha256}\n`).join('')), files }
}

function seed(screen) {
  const state = visualSeedState()
  state.aiSettings.mascotEnabled = false
  if (screen.id === 'coach') state.chatMessages = [
    { id: 'visual-coach-user', role: 'user', content: 'Help me think of a balanced next meal.', timestamp: VISUAL_NOW },
    { id: 'visual-coach-assistant', role: 'assistant', content: '**A few easy ideas**\n\n- Rice, beans and crunchy vegetables\n- Eggs on toast with a side of fruit\n\nChoose what sounds good and adjust it to your appetite.', timestamp: VISUAL_NOW },
  ]
  return state
}

const servers = []
const wrappers = []
let browser
let activePage
let activeJob
let interrupted = false
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const manifest = {
  schemaVersion: 1, status: 'running', recordedAt: new Date().toISOString(), browser: null,
  runtime: { node: process.version, os: platform(), release: release() },
  calendar: VISUAL_NOW, timezone: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1,
  syntheticInsets: { top: 0, right: 0, bottom: 0, left: 0 }, views, themes,
  screens: screens.map(({ id, title, route, signedIn }) => ({ id, title, route, signedIn })),
  sources: {}, observations: [], galleryChecks: [],
  method: '24 baseline/candidate pairs (48 unmodified viewport PNGs). Fresh Desktop Chromium context per screen; CSS viewports 390×900 and 1440×900, both themes, fixed UTC calendar, reduced motion, zero synthetic CSS insets. Same synthetic account and Coach conversation in both sources. Mascot interludes and overlay are suppressed; inline Momo drawings remain. APIs and external origins are blocked, no AI call is submitted. Dev servers use the committed Vite configurations with isolated caches, explicit local backend and empty Google client ID. No source changes or builds during capture. This captures settled static appearance, not animation fidelity, physical-device behavior or response-time acceptance.',
  dependencyMethod: 'The baseline reuses installed candidate node_modules through a directory link; both dependency lockfiles and all tracked package source inputs must match. No installation or build is performed.',
}
mkdirSync(out, { recursive: true })
const saveManifest = () => writeFileSync(join(out, 'observations.json'), JSON.stringify(manifest, null, 2) + '\n')

async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', error => reject(new Error(`Port ${port} must be free: ${error.message}`)))
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, () => probe.close(resolve))
  })
}

async function ready(source) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (interrupted) throw new Error('Capture interrupted')
    if (source.child.exitCode !== null || source.child.signalCode !== null || source.spawnError) throw new Error(`${source.id} Vite exited before becoming ready: ${source.spawnError ?? source.child.exitCode ?? source.child.signalCode}`)
    try { if ((await fetch(`http://127.0.0.1:${source.port}/`, { signal: AbortSignal.timeout(1000) })).ok) return } catch {}
    await pause(200)
  }
  throw new Error(`${source.id} Vite unavailable on ${source.port}; its port must be free`)
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const finite = document.getAnimations().filter(animation => animation.playState === 'running'
      && animation.effect && Number.isFinite(animation.effect.getComputedTiming().endTime))
    await Promise.race([Promise.all(finite.map(animation => animation.finished.catch(() => undefined))), new Promise(resolve => setTimeout(resolve, 5000))])
  })
  // Motion's opacity entrances use animation frames; reduced-motion captures
  // retain their completed pose without changing app animation durations.
  await page.waitForTimeout(500)
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function stopServer(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 }) } catch {}
  } else {
    try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), pause(2000)])
    if (child.exitCode === null && child.signalCode === null) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  }
}

const interrupt = () => { interrupted = true; if (browser) void browser.close().catch(() => undefined) }
process.once('SIGINT', interrupt)
process.once('SIGTERM', interrupt)

try {
  prepareBaseline()
  for (const source of sources) manifest.sources[source.id] = { title: source.title, port: source.port, ...snapshot(source) }
  const lockHashes = sources.map(source => manifest.sources[source.id].files.find(file => file.file === 'web/app/package-lock.json').sha256)
  if (lockHashes[0] !== lockHashes[1]) throw new Error('Dependency lockfiles differ')
  const shared = source => manifest.sources[source.id].files.filter(file => /^(packages\/|web\/(shared|assets)\/)/.test(file.file)).map(file => `${file.file}\0${file.sha256}`).join('\n')
  if (shared(sources[0]) !== shared(sources[1])) throw new Error('Shared packages or assets differ; the shared installed dependency link is unsuitable')
  saveManifest()
  await Promise.all(sources.map(source => requireFreePort(source.port)))
  for (const source of sources) {
    const wrapper = join(repoRoot, '.cache', `response-time-gallery-${source.id}-${process.pid}.config.mjs`)
    const cacheDir = join(repoRoot, '.cache', `response-time-gallery-${source.id}-${process.pid}-vite-cache`)
    wrappers.push(wrapper)
    writeFileSync(wrapper, `import original from ${JSON.stringify(pathToFileURL(join(source.dir, 'vite.config.ts')).href)}\nimport { mergeConfig } from ${JSON.stringify(pathToFileURL(join(appRoot, 'node_modules/vite/dist/node/index.js')).href)}\nexport default async env => mergeConfig(await original(env), { cacheDir: ${JSON.stringify(cacheDir)}, envDir: false, define: { 'import.meta.env.VITE_DATA_BACKEND': '"local"', 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '""' }, server: { host: '127.0.0.1', port: ${source.port}, strictPort: true, open: false } })\n`)
    source.child = spawn(process.execPath, [join(source.dir, 'node_modules/vite/bin/vite.js'), '--config', wrapper, '--host', '127.0.0.1', '--port', String(source.port), '--strictPort'], {
      cwd: source.dir, env: { ...process.env, VITE_DATA_BACKEND: 'local', VITE_GOOGLE_CLIENT_ID: '' }, stdio: 'ignore', windowsHide: true, detached: process.platform !== 'win32',
    })
    source.child.on('error', error => { source.spawnError = String(error) })
    servers.push(source.child)
  }
  await Promise.all(sources.map(ready))
  browser = await chromium.launch()
  manifest.browser = browser.version()
  // Pair source order within each screen rather than capturing an entire source first.
  for (const job of jobs) for (const source of sources) {
    if (interrupted) throw new Error('Capture interrupted')
    const { screen, view, theme, id } = job
    activeJob = { source: source.id, id }
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, colorScheme: theme, timezoneId: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1, serviceWorkers: 'block' })
    try {
      const page = await context.newPage()
      activePage = page
      page.setDefaultTimeout(30_000)
      const errors = []
      const blocked = new Set()
      page.on('pageerror', error => errors.push(error.message))
      page.on('dialog', dialog => dialog.dismiss())
      const origin = `http://127.0.0.1:${source.port}`
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== origin || /^\/(?:app\/)?api(?:\/|$)/.test(url.pathname)) {
          blocked.add(url.origin === origin ? url.pathname : url.origin)
          return route.abort('blockedbyclient')
        }
        return route.continue()
      })
      await page.addInitScript(({ state, user, signedIn, theme }) => {
        localStorage.clear()
        sessionStorage.clear()
        localStorage.setItem('fud-appearance-v1', theme)
        sessionStorage.setItem('poiem-splash-seen', '1')
        if (signedIn) {
          localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
          localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
        }
        window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
        const apply = () => {
          if (!document.documentElement) return false
          for (const side of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--k-safe-${side}`, '0px', 'important')
          return true
        }
        if (!apply()) {
          const observer = new MutationObserver(() => { if (apply()) observer.disconnect() })
          observer.observe(document, { childList: true })
        }
        document.addEventListener('DOMContentLoaded', apply, { once: true })
      }, { state: seed(screen), user: VISUAL_USER, signedIn: screen.signedIn, theme })
      await page.clock.setFixedTime(new Date(VISUAL_NOW))
      await page.goto(origin + screen.route)
      await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme)
      if (screen.id === 'today') await page.getByRole('progressbar', { name: 'Calories', exact: true }).waitFor()
      else await page.locator(screen.ready).first().waitFor({ state: 'visible' })
      if (screen.id === 'admin') await page.getByLabel('Local design preview', { exact: true }).waitFor()
      await settle(page)
      const geometry = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight }, scrollY,
        overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth,
        theme: document.documentElement.dataset.theme,
        insets: Object.fromEntries(['top', 'right', 'bottom', 'left'].map(side => [side, getComputedStyle(document.documentElement).getPropertyValue(`--k-safe-${side}`).trim()])),
      }))
      mkdirSync(join(out, source.id), { recursive: true })
      const filename = `${source.id}/${id}.png`
      await page.screenshot({ path: join(out, filename), fullPage: false, animations: 'disabled', scale: 'css' })
      const png = readFileSync(join(out, filename))
      manifest.observations.push({ source: source.id, revision: source.revision, id, screen: screen.id, view: view.id, theme, filename, sha256: sha256(png), bytes: png.length, errors, blockedRequests: [...blocked].sort(), ...geometry })
      saveManifest()
      console.log(`${source.id}: ${id}; overflow=${geometry.overflow}; pageErrors=${errors.length}`)
    } catch (error) {
      if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: join(out, 'capture-failure.png'), animations: 'disabled' }).catch(() => undefined)
      throw error
    } finally { activePage = null; await context.close() }
  }
  activeJob = { phase: 'gallery-validation' }
  writeFileSync(join(out, 'gallery.html'), gallery())
  // Native selects are keyboard controls. Exercise them in the generated file,
  // then check its own layout at 320px without adding product screenshots.
  const galleryContext = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' })
  try {
    const page = await galleryContext.newPage()
    await page.goto(pathToFileURL(join(out, 'gallery.html')).href)
    const allViews = await page.evaluate(() => ({
      width: innerWidth, overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth,
      view: 'all', theme: 'all', visiblePairs: [...document.querySelectorAll('article')].filter(article => !article.hidden).length,
    }))
    manifest.galleryChecks.push(allViews)
    if (allViews.overflow > 1 || allViews.visiblePairs !== jobs.length) throw new Error('Unfiltered gallery overflows at 320px or has missing pairs')
    await page.getByLabel('View', { exact: true }).focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.getByLabel('Theme', { exact: true }).focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    const check = await page.evaluate(() => ({
      width: innerWidth, overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth,
      view: document.querySelector('#view').value, theme: document.querySelector('#theme').value,
      visiblePairs: [...document.querySelectorAll('article')].filter(article => !article.hidden).length,
    }))
    manifest.galleryChecks.push(check)
    if (check.overflow > 1 || check.view !== 'phone' || check.theme !== 'light' || check.visiblePairs !== screens.length) throw new Error('Gallery keyboard filters or 320px layout check failed')
  } finally { await galleryContext.close() }
  const invalid = manifest.observations.filter(row => row.errors.length || (row.source === 'after' && row.overflow > 1))
  if (manifest.observations.length !== jobs.length * sources.length || invalid.length) throw new Error(`Incomplete or invalid captures: ${invalid.map(row => `${row.source}/${row.id}`).join(', ')}`)
  // Recheck source hashes after capture to reject concurrent product edits.
  for (const source of sources) if (snapshot(source).sourceTreeSha256 !== manifest.sources[source.id].sourceTreeSha256) throw new Error(`${source.id} changed during capture`)
  manifest.status = 'complete'
  manifest.completedAt = new Date().toISOString()
  saveManifest()
  console.log(`Saved ${jobs.length} pairs and ${manifest.observations.length} PNGs. Static appearance evidence only; review before claiming parity.`)
} catch (error) {
  manifest.status = 'failed'
  manifest.failure = { ...activeJob, error: String(error), recordedAt: new Date().toISOString() }
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: join(out, 'capture-failure.png'), animations: 'disabled' }).catch(() => undefined)
  saveManifest()
  throw error
} finally {
  if (browser) await browser.close().catch(() => undefined)
  await Promise.all(servers.map(stopServer))
  for (const wrapper of wrappers) { try { unlinkSync(wrapper) } catch {} }
  process.removeListener('SIGINT', interrupt)
  process.removeListener('SIGTERM', interrupt)
}

function gallery() {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poiem · response-time appearance comparison</title>
<style>*{box-sizing:border-box}body{margin:0;background:#fff8eb;color:#20221d;font:16px/1.5 system-ui,sans-serif}header,main,.filters-inner{max-width:1280px;margin:auto;padding:24px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1}h2{font-size:clamp(21px,3vw,28px)}a{color:inherit;text-underline-offset:3px}p{max-width:80ch}code{overflow-wrap:anywhere}a:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid #8739e8;outline-offset:3px}.filters{position:sticky;top:0;z-index:2;border-block:2px solid;background:#e9ff54}.filters-inner{display:flex;flex-wrap:wrap;align-items:end;gap:12px;padding-block:12px}label{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;min-width:0;max-width:100%;font-weight:700}select{width:100%;min-width:0}select,button{max-width:100%;min-height:44px;font:inherit;padding:8px;border:2px solid;background:#fffdf7}button{cursor:pointer}output{flex-basis:100%}article{padding:16px 0 24px;border-bottom:2px solid}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pair>div{min-width:0}.label{font-weight:800;margin-bottom:8px}.frame{display:block;width:100%;max-width:var(--width);border:2px solid;line-height:0;background:#fffdf7}.frame img{display:block;width:100%;height:auto}small{display:block;margin-block:8px}[hidden]{display:none!important}@media(max-width:600px){header,main,.filters-inner{padding-inline:16px}.filters-inner{gap:8px}.filters-inner label{flex:1 1 120px}.pair{grid-template-columns:minmax(0,1fr);gap:20px}}</style></head>
<body><header><h1>Poiem: response-time follow-up</h1><p>${jobs.length} baseline/candidate pairs, ${jobs.length * sources.length} browser screenshots. Compare the settled appearance after deferring screen animation features and reusing unchanged Momo drawings, Toast context and Coach message formatting.</p><p>Baseline <code>${escape(sources[0].revision)}</code><br>Candidate <code>${escape(sources[1].revision)}</code></p><p>Both themes · reduced motion · fixed UTC calendar · zero synthetic insets. These static captures do not establish animation fidelity or a response-time improvement. Phone means a Chromium CSS viewport, not a physical-device certification.</p><p><a href="README.md">Delivery report</a> · <a href="observations.json">Capture method, source hashes and PNG hashes</a> · <a href="performance/initial-load.json">Separate initial-load measurements</a></p></header>
<div class="filters"><div class="filters-inner" role="group" aria-label="Filter comparisons"><label>Screen<select id="screen" aria-label="Screen"><option value="all">All screens</option>${screens.map(screen => `<option value="${screen.id}">${escape(screen.title)}</option>`).join('')}</select></label><label>View<select id="view" aria-label="View"><option value="all">Both views</option>${views.map(view => `<option value="${view.id}">${view.title} ${view.width}×${view.height}</option>`).join('')}</select></label><label>Theme<select id="theme" aria-label="Theme"><option value="all">Both themes</option><option value="light">Light</option><option value="dark">Dark</option></select></label><button type="button" id="reset">Reset filters</button><output id="count" aria-live="polite">${jobs.length} pairs shown</output></div></div>
<main>${jobs.map(({ id, screen, view, theme }) => `<article id="${id}" data-screen="${screen.id}" data-view="${view.id}" data-theme="${theme}"><h2>${escape(screen.title)} · ${view.title} ${view.width}×${view.height} · ${theme}</h2><small>${screen.id === 'coach' ? 'Same synthetic saved conversation; no model request. ' : screen.id === 'admin' ? 'Read-only fictional admin samples; no admin endpoint. ' : ''}Reduced motion, zero synthetic insets, viewport capture.</small><div class="pair">${sources.map(source => `<div><div class="label">${source.title} · ${source.revision.slice(0, 8)}</div><a class="frame" style="--width:${view.width}px" href="${source.id}/${id}.png" target="_blank" rel="noopener"><img src="${source.id}/${id}.png" alt="${escape(screen.title)}, ${source.title.toLowerCase()}, ${theme}, ${view.title.toLowerCase()}" loading="lazy" width="${view.width}" height="${view.height}"></a></div>`).join('')}</div></article>`).join('')}</main>
<script>const filters=['screen','view','theme'].map(id=>document.getElementById(id));function filter(){let count=0;for(const article of document.querySelectorAll('article')){article.hidden=filters.some(select=>select.value!=='all'&&article.dataset[select.id]!==select.value);if(!article.hidden)count++}document.getElementById('count').textContent=count+' '+(count===1?'pair':'pairs')+' shown'}for(const select of filters)select.addEventListener('change',filter);document.getElementById('reset').addEventListener('click',()=>{for(const select of filters)select.value='all';filter()})</script></body></html>\n`
}
