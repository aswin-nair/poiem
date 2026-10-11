import { spawn, execFileSync } from 'node:child_process'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs'
import { platform, release } from 'node:os'
import { chromium } from '@playwright/test'
import { VISUAL_USER, VISUAL_NOW, visualSeedState } from '../../../src/lib/visualSeed.ts'

// Run with Node 24+ from any directory. The baseline is exported, never checked out.
// Use --after-ref <commit> to reproduce a committed follow-up instead of the working tree.
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../..')
const repoRoot = resolve(appRoot, '../..')
const args = process.argv.slice(2)
const argument = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
const beforeRef = argument('--before-ref') ?? 'e042f587'
const afterRef = argument('--after-ref')
const out = resolve(argument('--output') ?? here)
const resume = args.includes('--resume')
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
mkdirSync(out, { recursive: true })

function exportRevision(ref, label) {
  const revision = git('rev-parse', ref)
  const directory = resolve(repoRoot, '.cache', `safe-area-${label}-source-${revision.slice(0, 8)}`)
  const marker = join(directory, '.capture-revision')
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
    const archive = resolve(repoRoot, '.cache', `safe-area-${label}-${revision.slice(0, 8)}.tar`)
    execFileSync('git', ['archive', '--format=tar', '--output', archive, revision], { cwd: repoRoot })
    execFileSync('tar', ['-xf', archive, '-C', directory])
    writeFileSync(marker, revision + '\n')
  }
  if (!existsSync(marker) || readFileSync(marker, 'utf8').trim() !== revision) throw new Error(`Unexpected existing export: ${directory}`)
  const dependencyLink = join(directory, 'web/app/node_modules')
  if (!existsSync(dependencyLink)) symlinkSync(join(appRoot, 'node_modules'), dependencyLink, process.platform === 'win32' ? 'junction' : 'dir')
  return { dir: join(directory, 'web/app'), revision }
}

const sources = [
  { id: 'before', ...exportRevision(beforeRef, 'before'), port: 5297 },
  { id: 'after', ...(afterRef ? exportRevision(afterRef, 'after') : { dir: appRoot, revision: 'WORKTREE@' + git('rev-parse', 'HEAD') }), port: 5197 },
]
const scenarios = [
  { id: 'portrait', width: 390, height: 844, top: 44, right: 7, bottom: 34, left: 11 },
  { id: 'desktop', width: 1440, height: 900, top: 0, right: 0, bottom: 0, left: 0 },
  { id: 'landscape', width: 844, height: 390, top: 0, right: 44, bottom: 21, left: 44 },
  { id: 'short', width: 390, height: 400, top: 44, right: 7, bottom: 34, left: 11 },
]
const screens = [
  { id: 'today', title: 'Today', route: '/', signedIn: true, selectors: ['h1', '.nav-item', '.nav-fab'] },
  { id: 'log-sheet', title: 'Log a meal sheet', route: '/', signedIn: true, selectors: ['[role="dialog"] button'] },
  { id: 'settings-toolbar', title: 'Settings after scrolling', route: '/settings?panel=profile', signedIn: true, selectors: ['.you-toolbar select', '.you-toolbar button', '.you-toolbar nav a'] },
  { id: 'backup-preview', title: 'Backup preview', route: '/settings?panel=data', signedIn: true, selectors: ['[role="dialog"] button'] },
  { id: 'welcome', title: 'Welcome header', route: '/welcome', signedIn: false, selectors: ['.wp-header a'] },
  { id: 'login', title: 'Sign in', route: '/login?mode=signin', signedIn: false, selectors: ['.welcome-brand', '.auth-form input', '.auth-form button[type="submit"]'] },
  { id: 'onboarding', title: 'First session introduction', route: '/onboarding', signedIn: false, selectors: ['.k-intro-bar .welcome-brand', '.k-intro button'] },
  { id: 'departure', title: 'Settings departure on a short screen', route: '/settings?panel=profile', signedIn: true, selectors: ['[role="dialog"] button'] },
]
const jobs = scenarios.flatMap(scenario => ['light', 'dark'].flatMap(theme => screens
  .filter(screen => scenario.id === 'landscape' ? ['today', 'log-sheet'].includes(screen.id) : scenario.id === 'short' ? screen.id === 'departure' : screen.id !== 'departure')
  .map(screen => ({ scenario, theme, screen }))))
const servers = []
let browser

async function ready(source) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://localhost:${source.port}`, { signal: AbortSignal.timeout(1000) })).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`${source.id} server unavailable on ${source.port}`)
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const entrances = document.getAnimations().filter(animation => animation.playState === 'running'
      && animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element
      && Number.isFinite(animation.effect.getComputedTiming().endTime))
    await Promise.race([Promise.all(entrances.map(animation => animation.finished.catch(() => undefined))), new Promise(resolve => setTimeout(resolve, 5000))])
  })
}

const previous = resume && existsSync(join(out, 'observations.json')) ? JSON.parse(readFileSync(join(out, 'observations.json'), 'utf8')) : null
const manifest = {
  recordedAt: new Date().toISOString(), browser: null, node: process.version, os: platform(), release: release(),
  beforeRevision: sources[0].revision, afterRevision: sources[1].revision,
  afterAppPatch: afterRef ? null : git('diff', 'HEAD', '--', 'web/app/src', 'web/app/index.html'),
  afterSourceHashes: Object.fromEntries(['index.html', 'src/index.css', 'src/styles/screens/safe-area.css', 'src/styles/system/tokens.css', 'src/styles/welcome-poster.css', 'src/lib/viewportSafety.ts', 'src/components/MomoInterlude.tsx', 'src/mascot/MascotOverlay.tsx']
    .map(file => [file, createHash('sha256').update(readFileSync(resolve(sources[1].dir, file))).digest('hex')])),
  calendar: VISUAL_NOW, scenarios, screens: screens.map(({ id, title, route, signedIn }) => ({ id, title, route, signedIn })),
  method: 'Desktop Chromium, fresh context per screen, UTC, local backend, reduced motion, synthetic CSS inset variables. Device browser chrome, hardware, visualViewport keyboard behavior, Safari env() values and touch gestures are not simulated. API and external requests are blocked. Screenshots use CSS pixels and viewport only. Offscreen controls are recorded but are not treated as unsafe until scrolled into view; interactions are covered by separate safe-area tests. Before is observational, with no pass expectation.',
  dependencyMethod: 'Both exported sources use a link to the current installed node_modules without installation. Shared packages have no changes between the compared baseline and this UI follow-up.',
  observations: previous?.observations ?? [],
}
manifest.captureRuns = [...(previous?.captureRuns ?? (previous ? [previous.recordedAt] : [])), manifest.recordedAt]
if (previous && (previous.beforeRevision !== manifest.beforeRevision || previous.afterRevision !== manifest.afterRevision
  || Object.entries(manifest.afterSourceHashes).some(([file, hash]) => previous.afterSourceHashes[file] !== hash))) {
  throw new Error('Cannot resume across a changed source. Use a separate output directory for a new comparison.')
}
let activePage
let activeJob

try {
  for (const source of sources) {
    const wrapper = resolve(repoRoot, '.cache', `safe-area-vite-${source.id}.config.mjs`)
    const cacheDir = resolve(repoRoot, '.cache', `safe-area-vite-${source.id}-cache`)
    writeFileSync(wrapper, `import original from ${JSON.stringify(pathToFileURL(resolve(source.dir, 'vite.config.ts')).href)}\nimport { mergeConfig } from ${JSON.stringify(pathToFileURL(resolve(appRoot, 'node_modules/vite/dist/node/index.js')).href)}\nexport default async env => mergeConfig(await original(env), { cacheDir: ${JSON.stringify(cacheDir)} })\n`)
    servers.push(spawn(process.execPath, [resolve(source.dir, 'node_modules/vite/bin/vite.js'), '--config', wrapper, '--port', String(source.port), '--strictPort'], {
      cwd: source.dir, env: { ...process.env, VITE_DATA_BACKEND: 'local', VITE_GOOGLE_CLIENT_ID: '' }, stdio: 'ignore', windowsHide: true,
    }))
  }
  await Promise.all(sources.map(ready))
  browser = await chromium.launch()
  manifest.browser = browser.version()
  for (const source of sources) {
    mkdirSync(join(out, source.id), { recursive: true })
    for (const { scenario, theme, screen } of jobs) {
      const id = `${screen.id}-${scenario.id}-${theme}`
      if (resume && manifest.observations.some(row => row.source === source.id && row.id === id)) continue
      const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: theme, timezoneId: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1 })
      const page = await context.newPage()
      activePage = page
      activeJob = { source: source.id, id }
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('dialog', dialog => dialog.dismiss())
      const origin = `http://localhost:${source.port}`
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        return url.origin !== origin || url.pathname.startsWith('/api/') ? route.abort('blockedbyclient') : route.continue()
      })
      const state = visualSeedState()
      state.aiSettings.mascotEnabled = false
      await page.addInitScript(({ state, user, signedIn, theme, scenario }) => {
        localStorage.setItem('fud-appearance-v1', theme)
        sessionStorage.setItem('poiem-splash-seen', '1')
        if (signedIn) {
          localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
          localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
        }
        window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
        const apply = () => {
          if (!document.documentElement) return false
          for (const side of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--k-safe-${side}`, `${scenario[side]}px`, 'important')
          return true
        }
        if (!apply()) {
          const observer = new MutationObserver(() => { if (apply()) observer.disconnect() })
          observer.observe(document, { childList: true })
        }
        document.addEventListener('DOMContentLoaded', apply, { once: true })
      }, { state, user: VISUAL_USER, signedIn: screen.signedIn, theme, scenario })
      await page.clock.install({ time: new Date(VISUAL_NOW) })
      await page.goto(origin + screen.route)
      await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme)
      if (['today', 'log-sheet'].includes(screen.id)) await page.getByRole('progressbar', { name: 'Calories', exact: true }).waitFor()
      else await page.locator('main h1, .app-shell header h1, .wp-hero h1, .k-intro h1').first().waitFor()
      await settle(page)
      if (screen.id === 'log-sheet') {
        await page.getByTestId('fab').click()
        await page.getByRole('dialog', { name: 'Log a meal', exact: true }).waitFor()
      }
      if (screen.id === 'settings-toolbar') {
        await page.getByRole('spinbutton', { name: 'Height', exact: true }).fill('181')
        await page.locator('.you-toolbar').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY + 180))
      }
      if (screen.id === 'backup-preview') {
        await page.getByLabel('Import backup file').setInputFiles({ name: 'synthetic-safe-area-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)) })
        await page.getByRole('dialog', { name: 'Import backup', exact: true }).waitFor()
      }
      if (screen.id === 'departure') {
        await page.getByRole('spinbutton', { name: 'Height', exact: true }).fill('181')
        await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Insights', exact: true }).click()
        await page.getByRole('dialog', { name: 'Keep your Settings changes?', exact: true }).waitFor()
      }
      await settle(page)
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
      await page.waitForTimeout(120)
      await page.screenshot({ path: join(out, source.id, id + '.png'), animations: 'disabled', scale: 'css' })
      const geometry = await page.evaluate(({ selectors, scenario }) => ({
        viewport: { width: innerWidth, height: innerHeight }, scrollY, overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth,
        controls: selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          const displayed = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          const visible = displayed && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
          const edges = []
          if (visible && rect.left < scenario.left - 1) edges.push('left')
          if (visible && rect.right > innerWidth - scenario.right + 1) edges.push('right')
          if (visible && rect.top >= 0 && rect.top < scenario.top - 1) edges.push('top')
          if (visible && rect.bottom <= innerHeight && rect.bottom > innerHeight - scenario.bottom + 1) edges.push('bottom')
          return { selector, label: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 90) || element.getAttribute('name') || element.tagName, displayed, visible, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, insetEdgesEntered: edges }
        })),
      }), { selectors: screen.selectors, scenario })
      manifest.observations.push({ source: source.id, id, screen: screen.id, scenario: scenario.id, theme, filename: `${source.id}/${id}.png`, errors, ...geometry })
      writeFileSync(join(out, 'observations.json'), JSON.stringify(manifest, null, 2) + '\n')
      console.log(`${source.id}: ${id} overflow=${geometry.overflow} errors=${errors.length}`)
      await context.close()
      activePage = null
    }
  }
} catch (error) {
  const failure = { recordedAt: new Date().toISOString(), ...activeJob, error: String(error) }
  if (activePage && !activePage.isClosed()) {
    const diagnostic = resolve(repoRoot, '.cache', `safe-area-capture-failed-${activeJob.source}-${activeJob.id}`)
    await activePage.screenshot({ path: diagnostic + '.png', animations: 'disabled', scale: 'css' }).catch(() => undefined)
    writeFileSync(diagnostic + '.html', await activePage.content())
    failure.location = activePage.url()
    failure.heightInput = await activePage.getByRole('spinbutton', { name: 'Height', exact: true }).evaluate(element => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, display: style.display, visibility: style.visibility, opacity: style.opacity }
    }).catch(() => null)
  }
  writeFileSync(resolve(repoRoot, '.cache', 'safe-area-capture-failure.json'), JSON.stringify(failure, null, 2) + '\n')
  throw error
} finally {
  if (browser) await browser.close()
  for (const server of servers) server.kill()
}

const pairs = jobs.map(({ scenario, theme, screen }) => ({ id: `${screen.id}-${scenario.id}-${theme}`, scenario, theme, screen }))
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
writeFileSync(join(out, 'gallery.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poiem safe-area comparisons</title>
<style>*{box-sizing:border-box}code{overflow-wrap:anywhere}body{margin:0;background:#fff8eb;color:#20221d;font:16px/1.5 system-ui,sans-serif}header,main{max-width:1280px;margin:auto;padding:24px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1}a{color:inherit}p{max-width:80ch}.toolbar{position:sticky;top:0;z-index:2;padding:12px 24px;border-block:2px solid;background:#e9ff54;display:flex;flex-wrap:wrap;gap:16px}select,button{font:inherit;min-height:44px;padding:8px;border:2px solid;background:#fffdf7}article{padding:24px 0;border-bottom:2px solid}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.label{font-weight:700;margin-bottom:8px}.frame{position:relative;line-height:0;max-width:100%;width:var(--width);border:2px solid;background:#fffdf7}.frame img{width:100%;height:auto}.bands{position:absolute;inset:0;pointer-events:none}.bands span{position:absolute;background:repeating-linear-gradient(45deg,#d8255350 0 5px,#d8255325 5px 10px)}.bands .top{left:0;right:0;top:0;height:var(--top)}.bands .right{top:0;bottom:0;right:0;width:var(--right)}.bands .bottom{left:0;right:0;bottom:0;height:var(--bottom)}.bands .left{top:0;bottom:0;left:0;width:var(--left)}body.hide-bands .bands{display:none}[hidden]{display:none!important}small{display:block;margin-block:8px}@media(max-width:600px){header,main{padding:16px}.pair{gap:8px}.toolbar{padding:8px 16px}h2{font-size:21px}}</style>
<header><h1>Poiem: space for every edge</h1><p>34 before/after pairs. The striped regions show synthetic CSS inset geometry. They do not represent physical notches or a Safari certification. Images are unmodified browser screenshots; stripes are an optional gallery overlay.</p><p>Before: <code>${escape(sources[0].revision.slice(0, 8))}</code>. After: safe-area follow-up captured from <code>${escape(sources[1].revision)}</code>. <a href="README.md">Method and limitations</a> · <a href="observations.json">Raw geometry and source hashes</a></p></header>
<div class="toolbar"><label>View <select id="scenario"><option value="all">All shapes</option>${scenarios.map(s => `<option value="${s.id}">${s.id} ${s.width}×${s.height}</option>`).join('')}</select></label><label>Theme <select id="theme"><option value="all">Both themes</option><option>light</option><option>dark</option></select></label><button id="bands" aria-pressed="true">Hide synthetic edge overlay</button></div>
<main>${pairs.map(({ id, scenario: s, theme, screen }) => `<article data-scenario="${s.id}" data-theme="${theme}"><h2>${escape(screen.title)} · ${s.width}×${s.height} · ${theme}</h2><small>Synthetic top/right/bottom/left: ${s.top}/${s.right}/${s.bottom}/${s.left}px. ${s.id === 'desktop' ? 'Zero-inset desktop comparison.' : s.id === 'short' ? 'Short CSS viewport stress; no physical keyboard is simulated.' : 'Synthetic inset stress case.'}</small><div class="pair">${['before', 'after'].map(source => `<div><div class="label">${source === 'before' ? 'Before' : 'After'}</div><a href="${source}/${id}.png" target="_blank" rel="noopener"><div class="frame" style="--width:${s.width}px;--top:${100 * s.top / s.height}%;--right:${100 * s.right / s.width}%;--bottom:${100 * s.bottom / s.height}%;--left:${100 * s.left / s.width}%"><img src="${source}/${id}.png" alt="${escape(screen.title)} ${source}, ${theme}, ${s.id}" loading="lazy" width="${s.width}" height="${s.height}"><div class="bands" aria-hidden="true"><span class="top"></span><span class="right"></span><span class="bottom"></span><span class="left"></span></div></div></a></div>`).join('')}</div></article>`).join('')}</main>
<script>const scenario=document.querySelector('#scenario'),theme=document.querySelector('#theme');function filter(){for(const article of document.querySelectorAll('article'))article.hidden=(scenario.value!=='all'&&article.dataset.scenario!==scenario.value)||(theme.value!=='all'&&article.dataset.theme!==theme.value)}scenario.addEventListener('change',filter);theme.addEventListener('change',filter);document.querySelector('#bands').addEventListener('click',event=>{const hidden=document.body.classList.toggle('hide-bands');event.currentTarget.textContent=hidden?'Show synthetic edge overlay':'Hide synthetic edge overlay';event.currentTarget.setAttribute('aria-pressed',String(!hidden))})</script></html>\n`)
if (manifest.observations.some(row => row.errors.length || row.overflow > 1)) throw new Error('Capture has page errors or horizontal overflow; inspect observations.json')
console.log(`Saved ${manifest.observations.length} screenshots and ${pairs.length} comparison pairs.`)
