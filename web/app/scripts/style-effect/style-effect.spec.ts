/**
 * Which legacy sheets does the system already override completely?
 *
 * `DESIGN.md` asks for a computed-style comparison of every screen before a
 * legacy sheet is deleted. This is that comparison, automated. For each sheet it
 * comments out the import, reloads every route, and compares the resolved style
 * of every element — plus both pseudo-elements and the box each one occupies —
 * against the same page with the whole cascade present. A sheet that changes
 * nothing anywhere is a sheet the system outranks on every selector it owns.
 *
 * It is stronger than the pixel baselines in two ways: it reads properties a
 * screenshot cannot separate, and it covers the nine screens the baselines skip.
 * It is weaker in one: it only sees a page at rest, in the seeded state. Deleting
 * on this evidence still ends with the 44 baselines and the chromium suite.
 *
 *   npx playwright test -c scripts/style-effect/playwright.config.ts
 */
import { expect, test, type Browser, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { VISUAL_NOW, VISUAL_USER, visualSeedState } from '../../src/lib/visualSeed'

const APP = process.cwd()
const INDEX = path.join(APP, 'src/index.css')
/* Gitignored, and inside the repo rather than /tmp so a container run leaves the
   evidence behind: the cache is what a later run compares against. */
const CACHE = path.join(APP, 'artifacts/style-effect/cache')
const REPORT = path.join(APP, 'artifacts/style-effect/report.json')
const AUTH_KEY = 'fud-ai-auth-session'

/** Every sheet in the `legacy` layer, in cascade order, read from the imports. */
function legacySheets(css: string): string[] {
  const imports = [...css.matchAll(/^@import '\.\/styles\/(.+?)';$/gm)].map(m => m[1])
  return imports.slice(0, imports.indexOf('system/fonts.css'))
}

type Mode = 'user' | 'guest' | 'fresh'
type Route = { name: string, path: string, mode: Mode, ready: string }

/* Every route the app serves, not just the ones a baseline covers. */
const ALL_ROUTES: readonly Route[] = [
  { name: 'today', path: '/', mode: 'user', ready: '.k-today-main' },
  { name: 'reference', path: '/dev/components', mode: 'user', ready: 'h1' },
  { name: 'log-sheet', path: '/log', mode: 'user', ready: '[role=dialog]' },
  { name: 'describe', path: '/log/text', mode: 'user', ready: 'h1' },
  { name: 'manual', path: '/log/manual', mode: 'user', ready: 'h1' },
  { name: 'photo', path: '/log/photo', mode: 'user', ready: 'h1' },
  { name: 'saved', path: '/discover', mode: 'user', ready: 'h1' },
  { name: 'insights', path: '/progress', mode: 'user', ready: 'h1' },
  { name: 'you', path: '/settings', mode: 'user', ready: 'h1' },
  { name: 'coach', path: '/coach', mode: 'user', ready: 'h1' },
  { name: 'journey', path: '/journey', mode: 'user', ready: 'h1' },
  { name: 'about', path: '/about', mode: 'user', ready: 'h1' },
  { name: 'support', path: '/support', mode: 'user', ready: 'h1' },
  { name: 'admin', path: '/admin', mode: 'user', ready: 'h1' },
  { name: 'review', path: '/review', mode: 'user', ready: 'h1' },
  { name: 'welcome', path: '/welcome', mode: 'guest', ready: 'body > div' },
  { name: 'login', path: '/login', mode: 'guest', ready: 'h1, form' },
  { name: 'onboarding', path: '/onboarding', mode: 'fresh', ready: 'body > div' },
]

/** `STYLE_EFFECT_ROUTES=today,login` narrows a run while iterating on the tool. */
const ONLY = process.env.STYLE_EFFECT_ROUTES?.split(',').map(name => name.trim()).filter(Boolean)
const ROUTES = ONLY ? ALL_ROUTES.filter(route => ONLY.includes(route.name)) : ALL_ROUTES

/* The phone column and the desktop rail, in both themes. */
const VIEWS = [
  { name: '390-light', width: 390, theme: 'light' as const },
  { name: '390-dark', width: 390, theme: 'dark' as const },
  { name: '1440-light', width: 1440, theme: 'light' as const },
  { name: '1440-dark', width: 1440, theme: 'dark' as const },
]

/** Everything that can change how an element looks or where it sits. */
const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'z-index', 'visibility', 'opacity', 'overflow-x', 'overflow-y',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'box-sizing', 'aspect-ratio',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-clip',
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'text-decoration-line', 'text-indent', 'white-space', 'word-break', 'text-overflow',
  '-webkit-line-clamp', '-webkit-text-stroke-width', '-webkit-text-stroke-color', 'text-shadow',
  'box-shadow', 'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'filter', 'backdrop-filter',
  'mix-blend-mode', 'isolation', 'transform', 'transform-origin', 'rotate', 'scale', 'translate',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self',
  'justify-content', 'justify-items', 'justify-self', 'row-gap', 'column-gap', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-rows',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'place-items', 'place-content',
  'list-style-type', 'cursor', 'pointer-events', 'user-select', 'content', 'clip-path', 'object-fit', 'object-position',
  'writing-mode', 'vertical-align', 'table-layout', 'caret-color', 'accent-color', 'scroll-behavior', 'touch-action',
] as const

type Row = { key: string, tag: string, box: string, self: string, before: string, after: string }
type Shot = { url: string, scroll: string, rules: number, rows: Row[] }

async function seed(page: Page, mode: Mode) {
  const user = VISUAL_USER
  const state = { ...visualSeedState(), ...(mode === 'fresh' ? { onboarded: false } : {}) }
  await page.addInitScript(({ user, state, authKey, mode }) => {
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    try {
      sessionStorage.setItem('poiem-splash-seen', '1')
      if (mode !== 'guest') {
        localStorage.setItem(authKey, JSON.stringify(user))
        localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
      }
    } catch { /* private mode */ }
  }, { user, state, authKey: AUTH_KEY, mode })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
}

/** Counts every rule the browser holds, nested ones included. Stringified so it
 *  can be handed to `page.evaluate` in either place that needs it. */
const COUNT_RULES = `() => {
  const deep = sheet => [...(sheet.cssRules ?? [])].reduce((n, rule) => n + 1 + ('cssRules' in rule ? deep(rule) : 0), 0)
  return [...document.styleSheets].reduce((n, sheet) => n + deep(sheet), 0)
}`

/** Holds until the page stops changing on its own. Without this the first visit
 *  to a lazily-loaded route is measured mid-Suspense and the second is not, which
 *  reads as a difference the CSS never made. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  const signature = () => page.evaluate(() =>
    `${document.querySelectorAll('*').length}|${document.documentElement.scrollHeight}|${document.body.innerText.length}`)
  let last = await signature()
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(150)
    const next = await signature()
    if (next === last) return
    last = next
  }
  throw new Error(`${page.url()} never stopped changing`)
}

/** One element per row, depth-first, so an index path is a stable identity. */
async function measure(page: Page, props: readonly string[]): Promise<Shot> {
  await settle(page)
  await page.evaluate(() => new Promise(requestAnimationFrame))
  return page.evaluate(props => {
    const deep = (sheet: CSSStyleSheet | CSSGroupingRule): number => {
      let n = 0
      for (const rule of [...(sheet.cssRules ?? [])]) {
        n += 1
        if ('cssRules' in rule) n += deep(rule as CSSGroupingRule)
      }
      return n
    }
    const pack = (style: CSSStyleDeclaration) => props.map(p => style.getPropertyValue(p)).join('\u0001')
    const round = (n: number) => Math.round(n * 100) / 100
    const rows: Row[] = []
    const walk = (el: Element, key: string) => {
      const box = el.getBoundingClientRect()
      rows.push({
        key,
        tag: `${el.tagName}|${typeof el.className === 'string' ? el.className : ''}`,
        box: [box.x, box.y, box.width, box.height].map(round).join(','),
        self: pack(getComputedStyle(el)),
        before: pack(getComputedStyle(el, '::before')),
        after: pack(getComputedStyle(el, '::after')),
      })
      for (const [i, child] of [...el.children].entries()) walk(child, `${key}/${i}`)
    }
    walk(document.documentElement, '0')
    return {
      url: location.pathname,
      scroll: `${document.documentElement.scrollWidth},${document.documentElement.scrollHeight}`,
      rules: [...document.styleSheets].reduce((n, sheet) => n + deep(sheet), 0),
      rows,
    }
  }, props as unknown as string[])
}

/** Load a route once, then re-measure at each view: a reload per view is slower
 *  and no more honest, since both sides of the comparison see the same sequence.
 *  A context of its own per route, so a signed-in seed cannot leak into a guest. */
async function shoot(browser: Browser, route: Route): Promise<Record<string, Shot>> {
  const context = await browser.newContext({ viewport: { width: VIEWS[0].width, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' })
  // Nothing off the dev server. Otherwise a status line like "Checking Poiem AI
  // availability…" resolves at a different moment in each pass, and since the row
  // around it is a content-sized grid, the whole column resizes and thousands of
  // properties read as differences the CSS never made.
  await context.route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => route.abort())
  const page = await context.newPage()
  try {
    const out: Record<string, Shot> = {}
    await seed(page, route.mode)
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(route.ready).first()).toBeVisible({ timeout: 20_000 })
    for (const view of VIEWS) {
      await page.setViewportSize({ width: view.width, height: 900 })
      await page.emulateMedia({ colorScheme: view.theme, reducedMotion: 'reduce' })
      // Both halves of the theme, because they settle separately: the attribute is
      // the app's answer to the media query, and a rule can read either one. Reading
      // styles while they disagree reports a whole palette as a difference.
      await expect(page.locator('html')).toHaveAttribute('data-theme', view.theme)
      await page.waitForFunction(dark => matchMedia('(prefers-color-scheme: dark)').matches === dark, view.theme === 'dark')
      out[view.name] = await measure(page, PROPS)
    }
    return out
  } finally {
    await context.close()
  }
}

/** Vite serves `index.css` from its own cache, so an edit lands a moment later
 *  than the write. Poll until the browser reports a different cascade. Always the
 *  same probe page, because a lazy route can bring stylesheets of its own. */
async function waitForCascade(browser: Browser, differsFrom: number | null): Promise<number> {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    for (let attempt = 0; attempt < 25; attempt++) {
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
      const rules = await page.evaluate(`(${COUNT_RULES})()`) as number
      expect(Number.isFinite(rules), 'the rule count did not come back a number').toBe(true)
      if (rules !== differsFrom) return rules
      await page.waitForTimeout(400)
    }
    throw new Error(`the cascade still holds ${differsFrom} rules, so the edit never landed`)
  } finally {
    await context.close()
  }
}

type Change = { key: string, tag: string, prop: string, from: string, to: string }

/* A few elements re-render on their own — a content-sized grid track on You, two
   admin inputs — so the control records exactly which property of which element
   moves without any CSS changing, and every verdict ignores those and no more. */
const UNSTABLE = path.join(CACHE, 'unstable.json')
const tuple = (route: string, change: Change) => `${route}|${change.prop}|${change.key}`
const loadMask = () => new Set<string>(fs.existsSync(UNSTABLE) ? JSON.parse(fs.readFileSync(UNSTABLE, 'utf8')) : [])

function diff(base: Shot, next: Shot): Change[] {
  const changes: Change[] = []
  const byKey = new Map(base.rows.map(row => [row.key, row]))
  if (base.scroll !== next.scroll) {
    changes.push({ key: '0', tag: 'document', prop: 'scroll-size', from: base.scroll, to: next.scroll })
  }
  if (base.rows.length !== next.rows.length) {
    changes.push({ key: '0', tag: 'document', prop: 'element-count', from: String(base.rows.length), to: String(next.rows.length) })
  }
  for (const row of next.rows) {
    const was = byKey.get(row.key)
    if (!was || was.tag !== row.tag) continue // structural, already reported by the count
    if (was.box !== row.box) changes.push({ key: row.key, tag: row.tag, prop: 'box', from: was.box, to: row.box })
    for (const pseudo of ['self', 'before', 'after'] as const) {
      if (was[pseudo] === row[pseudo]) continue
      const left = was[pseudo].split('\u0001')
      const right = row[pseudo].split('\u0001')
      PROPS.forEach((prop, i) => {
        if (left[i] !== right[i]) {
          const where = pseudo === 'self' ? prop : `::${pseudo} ${prop}`
          changes.push({ key: row.key, tag: row.tag, prop: where, from: left[i], to: right[i] })
        }
      })
    }
  }
  return changes
}

const cachePath = (route: string, view: string) => path.join(CACHE, `${route}-${view}.json`)
const original = fs.readFileSync(INDEX, 'utf8')
const SHEETS = legacySheets(original)

function withoutSheet(sheet: string) {
  const line = `@import './styles/${sheet}';`
  if (!original.includes(line)) throw new Error(`no import for ${sheet}`)
  fs.writeFileSync(INDEX, original.replace(line, `/* style-effect: ${line} */`))
}

test.describe.configure({ mode: 'serial' })

test.afterAll(() => fs.writeFileSync(INDEX, original))

/** The whole cascade's rule count, so a later run can tell an edit landed. */
let wholeCascade = 0
const results: Record<string, unknown> = {}

test('capture the cascade as it stands', async ({ browser }) => {
  test.setTimeout(20 * 60_000)
  fs.writeFileSync(INDEX, original)
  fs.mkdirSync(CACHE, { recursive: true })
  fs.mkdirSync(path.dirname(REPORT), { recursive: true })
  const landed: Record<string, string> = {}
  for (const route of ROUTES) {
    // Warm the route first: a cold dev server transforms its chunks on demand, and
    // only the first visit of the run pays for it.
    await shoot(browser, route)
    const shots = await shoot(browser, route)
    for (const [view, shot] of Object.entries(shots)) fs.writeFileSync(cachePath(route.name, view), JSON.stringify(shot))
    landed[route.name] = shots['390-light'].url
  }
  wholeCascade = await waitForCascade(browser, null)
  fs.writeFileSync(path.join(CACHE, 'routes.json'), JSON.stringify({ landed, rules: wholeCascade }, null, 2))
  console.log(`baseline: ${ROUTES.length} routes × ${VIEWS.length} views, ${wholeCascade} rules, landing on ${JSON.stringify(landed)}`)
})

/* The noise floor, and the mask. Without this, "inert" could just mean the crawl
   cannot see; measured twice more so a one-off flake cannot become a blind spot. */
test('the same cascade twice changes nothing', async ({ browser }) => {
  test.setTimeout(20 * 60_000)
  const mask = new Set<string>()
  const moved: Record<string, Change[]> = {}
  for (const pass of [1, 2]) {
    for (const route of ROUTES) {
      const shots = await shoot(browser, route)
      for (const [view, shot] of Object.entries(shots)) {
        const base = JSON.parse(fs.readFileSync(cachePath(route.name, view), 'utf8')) as Shot
        for (const raw of diff(base, shot)) {
          const change = { ...raw, prop: `${view} ${raw.prop}` }
          mask.add(tuple(route.name, change))
          if (pass === 2) (moved[route.name] ??= []).push(change)
        }
      }
    }
  }
  fs.writeFileSync(UNSTABLE, JSON.stringify([...mask], null, 2))
  const total = Object.values(moved).reduce((n, list) => n + list.length, 0)
  results.control = {
    unstableTuples: mask.size,
    changesOnSecondPass: total,
    routesAffected: Object.keys(moved),
    sample: Object.fromEntries(Object.entries(moved).map(([route, list]) => [route, list.slice(0, 8)])),
  }
  fs.writeFileSync(REPORT, JSON.stringify(results, null, 2))
  // Cheap to mask a handful of self-rendering elements; a large mask would mean
  // the crawl is measuring the wrong moment and no verdict from it is worth much.
  expect(mask.size, `too much of the page moves on its own to trust a verdict: ${JSON.stringify(results.control, null, 2)}`).toBeLessThan(600)
})

for (const sheet of SHEETS) {
  test(`without ${sheet}`, async ({ browser }) => {
    test.setTimeout(20 * 60_000)
    const perRoute: Record<string, Change[]> = {}
    const mask = loadMask()
    let rules = 0
    let masked = 0
    try {
      if (!wholeCascade) wholeCascade = JSON.parse(fs.readFileSync(path.join(CACHE, 'routes.json'), 'utf8')).rules
      withoutSheet(sheet)
      // A sheet whose removal never reached the browser would look inert for the
      // wrong reason, so prove the cascade changed before reading anything from it.
      rules = await waitForCascade(browser, wholeCascade)
      for (const route of ROUTES) {
        const shots = await shoot(browser, route)
        const changes: Change[] = []
        for (const [view, shot] of Object.entries(shots)) {
          const base = JSON.parse(fs.readFileSync(cachePath(route.name, view), 'utf8')) as Shot
          for (const raw of diff(base, shot)) {
            const change = { ...raw, prop: `${view} ${raw.prop}` }
            if (mask.has(tuple(route.name, change))) masked += 1
            else changes.push(change)
          }
        }
        if (changes.length) perRoute[route.name] = changes
      }
    } finally {
      fs.writeFileSync(INDEX, original)
      await waitForCascade(browser, rules).catch(() => { /* the next test's guard reports it */ })
    }
    const total = Object.values(perRoute).reduce((n, list) => n + list.length, 0)
    results[sheet] = {
      rulesRemoved: wholeCascade - rules,
      routesAffected: Object.keys(perRoute),
      changes: total,
      maskedChanges: masked,
      sample: Object.fromEntries(Object.entries(perRoute).map(([route, list]) => [route, list.slice(0, 8)])),
    }
    fs.writeFileSync(REPORT, JSON.stringify(results, null, 2))
    console.log(`${sheet}: ${total === 0 ? 'INERT' : `${total} changes on ${Object.keys(perRoute).join(', ')}`} (-${wholeCascade - rules} rules${masked ? `, ${masked} masked` : ''})`)
  })
}
