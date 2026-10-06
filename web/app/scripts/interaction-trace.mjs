import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform, release, cpus } from 'node:os'
import { VISUAL_USER, VISUAL_NOW, visualSeedState } from '../src/lib/visualSeed.ts'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(appRoot, '../..')
const value = (flag, fallback) => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : fallback
const baseURL = value('--url', 'http://localhost:4298/app/')
const output = resolve(value('--output', resolve(repoRoot, '.cache/interaction-trace.json')))
const repetitions = Number(value('--repetitions', '10'))
const baseline = process.argv.includes('--baseline')
if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error('Repetitions must be a positive integer')
const pieces = [...readFileSync(resolve(repoRoot, 'packages/product/src/wardrobe.ts'), 'utf8').matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1])
const browser = await chromium.launch()
const results = []
const errors = []
const route = path => new URL(path, baseURL).href

async function prepare(first = false, second = false) {
  const state = visualSeedState()
  state.foodEntries = second ? state.foodEntries.slice(0, 1) : []
  state.profile.loggingCommitment = 'detailed'
  state.profile.mascotReducedMotion = false
  state.gamification = { ...state.gamification, xp: 0, level: 1, pendingLevelUp: null,
    xpEvents: [], awardedKeys: [], ownedCosmeticIds: first ? [] : pieces,
    waterByDate: {}, notesByDate: {}, outfit: {}, streakFreezes: 0 }
  state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: 'local-trace-not-a-credential', mascotEnabled: false }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'UTC' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.route('https://openrouter.ai/api/v1/chat/completions', request => request.fulfill({ json: { choices: [{ message: { content: 'A grain, protein and vegetables can make a balanced meal.' } }] } }))
  await page.route('**/api/**', request => request.abort('blockedbyclient'))
  await page.addInitScript(({ state, user, day }) => {
    const NativeDate = Date
    const offset = new NativeDate(day).getTime() - NativeDate.now()
    // Fix calendar context only; performance.now, timers, rAF and trusted input stay real.
    class FixtureDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [NativeDate.now() + offset])) }
      static now() { return NativeDate.now() + offset }
    }
    window.Date = FixtureDate
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    if (!sessionStorage.getItem('trace-seeded')) {
      localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
      localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
      sessionStorage.setItem('poiem-splash-seen', '1')
      sessionStorage.setItem('trace-seeded', '1')
    }
    const longTasks = []
    new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true })
    let armed = null
    window.addEventListener('click', event => {
      if (armed && event.isTrusted && armed.start === null) armed.start = performance.now()
    }, true)
    window.__interactionTrace = {
      arm(selector, absent = false) {
        armed = { selector, absent, start: null, end: null, feedbackMs: null, longTasks: [] }
        const poll = () => {
          if (!armed || armed.end !== null) return
          const element = document.querySelector(selector)
          const visible = element && element.getBoundingClientRect().height > 0
            && getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > 0
          if (armed.start !== null && (absent ? !element : visible)) {
            // The next frame is a conservative paint proxy, not an animation-completion wait.
            requestAnimationFrame(() => {
              if (!armed) return
              armed.end = performance.now()
              armed.feedbackMs = armed.end - armed.start
            })
          } else requestAnimationFrame(poll)
        }
        requestAnimationFrame(poll)
      },
      result() {
        if (!armed || armed.end === null) return null
        return { ...armed, longTasks: longTasks.filter(task => task.start < armed.end && task.start + task.duration > armed.start) }
      },
    }
  }, { state, user: VISUAL_USER, day: VISUAL_NOW })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  return { page, context }
}

async function measure(page, label, target, feedback, absent = false) {
  await target.waitFor({ state: 'visible' })
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
  await page.evaluate(({ feedback, absent }) => window.__interactionTrace.arm(feedback, absent), { feedback, absent })
  await target.click()
  await page.waitForFunction(() => window.__interactionTrace.result() !== null, undefined, { timeout: 10_000 })
  // Let the observer deliver any completed task overlapping the feedback window.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 60)))
  const result = await page.evaluate(() => window.__interactionTrace.result())
  results.push({ interaction: label, ...result })
}

try {
  for (let repeat = 0; repeat < repetitions; repeat++) {
    for (const scenario of ['sheet', 'manual-save', 'saved-relog', 'first-meal-moment', 'second-log-toast', 'coach-send']) {
      const { page, context } = await prepare(scenario === 'first-meal-moment', scenario === 'second-log-toast')
      try {
        if (scenario === 'sheet') {
          await page.goto(route(''))
          await measure(page, 'sheet-open', page.getByTestId('fab'), '[role="dialog"]')
          const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
          await measure(page, 'sheet-close', sheet.getByRole('button', { name: 'Close', exact: true }), '[role="dialog"]', true)
        } else if (scenario === 'saved-relog') {
          await page.goto(route('discover'))
          const saved = page.getByRole('article', { name: 'Overnight oats', exact: true })
          await measure(page, scenario, saved.getByRole('button', { name: 'Log Overnight oats, 1 times portion', exact: true }), baseline ? '.toast, [role="dialog"]' : '.k-log-moment, .toast')
        } else if (scenario === 'coach-send') {
          await page.goto(route('coach'))
          await page.getByRole('textbox', { name: 'Message Coach' }).fill('Help me plan lunch.')
          await measure(page, scenario, page.getByRole('button', { name: 'Send', exact: true }), '.k-coach-thread article')
        } else {
          await page.goto(route('log/manual'))
          await page.getByLabel('Food name').fill('Trace oats')
          await page.getByLabel(/^Calories/).fill('250')
          await page.getByRole('button', { name: 'Snack', exact: true }).click()
          await measure(page, scenario, page.getByRole('button', { name: 'Log meal', exact: true }), baseline ? '.toast, [role="dialog"]' : scenario === 'second-log-toast' ? '.toast' : '.k-log-moment')
        }
      } catch (error) { errors.push(`${scenario} sample ${repeat + 1}: ${error.message}`) }
      finally { await context.close() }
    }
    console.error(`Trace ${baseline ? 'baseline' : 'candidate'}: ${repeat + 1}/${repetitions} repetitions, ${results.length} measured interactions, ${errors.length} errors`)
  }
} finally { await browser.close() }
const p95 = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1]
const summary = [...new Set(results.map(result => result.interaction))].map(interaction => {
  const rows = results.filter(result => result.interaction === interaction)
  return { interaction, samples: rows.length, p95Ms: p95(rows.map(row => row.feedbackMs)), longTasks: rows.reduce((sum, row) => sum + row.longTasks.length, 0) }
})
const git = args => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
const report = { recordedAt: new Date().toISOString(), commit: value('--revision', git(['rev-parse', 'HEAD'])), harnessCommit: git(['rev-parse', 'HEAD']), dirty: Boolean(git(['status', '--porcelain'])),
  browser: browser.version(), device: { os: platform(), release: release(), cpu: cpus()[0]?.model, viewport: '390×844', cpuThrottle: 4 },
  baseURL, repetitions, baseline, method: 'Trusted click capture → first present/absent feedback DOM with nonzero opacity → following real rAF (conservative paint proxy). Long tasks overlap that window; excludes initial loading. Cold navigation per sample; no fake performance clock. Coach response is mocked; send metric is local message feedback, not model latency. Baseline mode accepts retired dialogs/toasts as its save acknowledgement.',
  budgets: { p95Ms: 100, attributableLongTasks: 0 }, summary, results, errors }
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ output, ...report, results: undefined }, null, 2))
if (errors.length || summary.some(row => row.p95Ms > 100 || row.longTasks > 0)) process.exitCode = 1
