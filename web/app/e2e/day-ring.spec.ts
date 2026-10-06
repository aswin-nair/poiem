import { expect, test, type Browser, type Page } from '@playwright/test'
import { WARDROBE } from '@fud-ai/product/wardrobe'
import type { AppState, FoodEntry, LoggingCommitment, MealType } from '../src/types'
import { VISUAL_DAY, VISUAL_NOW, VISUAL_USER, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', viewport: { width: 390, height: 844 } })

const STATE_KEY = `fud-ai-web-state-${VISUAL_USER.sub}`

function activeState(commitment: LoggingCommitment = 'regular'): AppState {
  const state = visualSeedState()
  state.foodEntries = []
  state.favoriteMeals = []
  state.weightEntries = []
  state.profile.loggingCommitment = commitment
  state.profile.mascotReducedMotion = false
  state.gamification = { ...state.gamification, xp: 0, level: 1, pendingLevelUp: null,
    awardedKeys: [], xpEvents: [], waterByDate: {}, notesByDate: {},
    ownedCosmeticIds: WARDROBE.map(piece => piece.id), outfit: {},
    streakFreezes: 0, freezeUsedDates: [], brokenOn: null, brokenFrom: 0 }
  return state
}

function entry(mealType: MealType): FoodEntry {
  return { id: `ring-${mealType}`, name: `Earlier ${mealType}`, calories: 100,
    protein: 5, carbs: 10, fat: 2, timestamp: `${VISUAL_DAY}T10:00:00.000Z`,
    localDate: VISUAL_DAY, source: 'manual', mealType }
}

async function seed(page: Page, state: AppState): Promise<void> {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.addInitScript(({ user, state, stateKey }) => {
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    if (sessionStorage.getItem('ring-spec-seeded')) return
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    localStorage.setItem(stateKey, JSON.stringify(state))
    localStorage.removeItem('poiem-ring-ack-v1')
    sessionStorage.setItem('poiem-splash-seen', '1')
    sessionStorage.setItem('ring-spec-seeded', '1')
  }, { user: VISUAL_USER, state, stateKey: STATE_KEY })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
}

async function scenarioPage(browser: Browser, baseURL: string, state: AppState) {
  const context = await browser.newContext({ baseURL, timezoneId: 'UTC', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await seed(page, state)
  return { context, page }
}

async function readState(page: Page): Promise<AppState> {
  return page.evaluate(async userId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    const durable = await loadDurableState(userId)
    if (!durable) throw new Error('The signed-in account has no durable device state')
    return durable.state
  }, VISUAL_USER.sub)
}

async function saveMeal(page: Page, name: string, mealType: MealType = 'snack', calories = '250', macros = '10') {
  await page.goto('/log/manual')
  await page.getByLabel('Food name').fill(name)
  await page.getByLabel(/^Calories/).fill(calories)
  await page.getByLabel('Protein (g)').fill(macros)
  await page.getByLabel('Carbs (g)').fill(macros)
  await page.getByLabel('Fat (g)').fill(macros)
  await page.getByRole('button', { name: mealType === 'snack' ? 'Snack' : mealType[0]!.toUpperCase() + mealType.slice(1), exact: true }).click()
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(async () => (await readState(page)).foodEntries.filter(item => item.name === name).length).toBe(1)
}

const ring = (page: Page) => page.getByRole('region', { name: 'Your day', exact: true })

test('Today shows the ring under Momo for an active account', async ({ page }) => {
  await seed(page, activeState())
  await page.goto('/')
  await expect(ring(page)).toBeVisible()
  await expect(ring(page).locator('.k-ring-note')).not.toBeEmpty()
  const order = await page.locator('.k-today-summary').evaluate(element => {
    const children = Array.from(element.children)
    return { momo: children.findIndex(child => child.classList.contains('k-momo')),
      ring: children.findIndex(child => child.classList.contains('k-ring')),
      hero: children.findIndex(child => child.classList.contains('k-budget')) }
  })
  expect(order.momo).toBeGreaterThanOrEqual(0)
  expect(order.ring).toBe(order.momo + 1)
  expect(order.hero).toBe(order.ring + 1)
  await expect(ring(page)).not.toHaveClass(/k-hero|day-ring/)
  await expect(ring(page).getByRole('img')).toHaveAccessibleName('0 of 2 chosen steps complete')
})

test('the ring is hidden while tracking is paused', async ({ page }) => {
  const state = activeState('detailed')
  state.profile.trackingPaused = true
  await seed(page, state)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tracking is paused', exact: true })).toBeVisible()
  await expect(ring(page)).toHaveCount(0)
  await expect(page.locator('.k-ring-note, .k-log-moment')).toHaveCount(0)
  await saveMeal(page, 'Paused ring snack')
  await expect(page.locator('.toast').filter({ hasText: 'Logged Paused ring snack' })).toHaveCount(1)
  await expect(ring(page)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('poiem-ring-ack-v1'))).toBeNull()
})

test('logging the first meal fills the logging arc immediately', async ({ page }) => {
  await seed(page, activeState())
  await page.goto('/')
  const arc = ring(page).locator('.k-ring-fill-logged')
  await expect(arc).toHaveClass(/is-empty/)
  await saveMeal(page, 'Zero calorie record', 'snack', '0', '0')
  await expect(ring(page).getByRole('img')).toHaveAccessibleName('1 of 2 chosen steps complete')
  await expect(arc).toHaveAttribute('stroke-dashoffset', '0')
  await expect(arc).not.toHaveClass(/is-empty/)
  await expect(ring(page).locator('.k-ring-legend li').first()).toHaveClass('is-done')
  await expect(ring(page).locator('.k-ring-check')).toHaveCount(0)
  expect(await arc.evaluate(element => {
    const css = getComputedStyle(element)
    return { transitionDuration: css.transitionDuration, animation: css.animationName }
  })).toEqual({ transitionDuration: '0s', animation: 'none' })
})

test('closing the ring plays the check once per local day', async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000)
  await seed(page, activeState('light'))
  await saveMeal(page, 'Ring closing snack')
  await expect(ring(page)).toHaveClass(/is-just-closed/)
  await expect(ring(page).locator('.k-ring-check')).toHaveText('✓')
  await expect(ring(page)).toHaveCSS('--k-ring-check-ms', '240ms')
  await expect(page.locator('.k-log-moment')).toContainText('Your chosen logging steps are complete.')
  expect(await page.evaluate(() => localStorage.getItem('poiem-ring-ack-v1'))).toBe(VISUAL_DAY)
  await page.reload()
  await expect(ring(page)).not.toHaveClass(/is-just-closed/)
  await expect(page.locator('.k-log-moment')).toHaveCount(0)
  await page.locator('.k-meal-row').filter({ hasText: 'Ring closing snack' }).click()
  await page.getByText('Delete this entry', { exact: true }).click()
  await page.getByRole('button', { name: 'Yes, delete entry', exact: true }).click()
  await expect(ring(page).getByRole('img')).toHaveAccessibleName('0 of 1 chosen steps complete')
  await saveMeal(page, 'Reclosed snack')
  await expect(ring(page).getByRole('img')).toHaveAccessibleName('1 of 1 chosen steps complete')
  await expect(ring(page)).not.toHaveClass(/is-just-closed/)
  await expect(page.locator('.k-log-moment')).not.toContainText('Your chosen logging steps are complete.')
  await page.reload()
  await page.goBack()
  await page.goForward()
  await expect(ring(page)).not.toHaveClass(/is-just-closed/)
  expect(await page.evaluate(() => localStorage.getItem('poiem-ring-ack-v1'))).toBe(VISUAL_DAY)

  await test.step('a third-log ring closure still gets its card and repeat motion cap', async () => {
    const state = activeState('regular')
    state.foodEntries = [entry('breakfast'), entry('lunch')]
    const { context, page: repeated } = await scenarioPage(browser, baseURL!, state)
    try {
      await saveMeal(repeated, 'Closing dinner', 'dinner')
      await expect(ring(repeated)).toHaveClass(/is-just-closed/)
      await expect(ring(repeated)).toHaveCSS('--k-ring-check-ms', '120ms')
      await expect(repeated.locator('.k-log-moment')).toContainText('Your chosen logging steps are complete.')
      await expect(repeated.locator('.k-log-moment')).toHaveCSS('--k-moment-ms', '120ms')
      await expect(repeated.locator('.toast, .k-log-moment-momo')).toHaveCount(0)
    } finally { await context.close() }
  })

  await test.step('a kitchen note closes a detailed ring once', async () => {
    const state = activeState('detailed')
    state.foodEntries = [entry('breakfast'), entry('lunch'), entry('dinner')]
    const { context, page: noted } = await scenarioPage(browser, baseURL!, state)
    try {
      await noted.goto('/')
      await expect(ring(noted).getByRole('img')).toHaveAccessibleName('2 of 3 chosen steps complete')
      await noted.getByRole('button', { name: 'Add a kitchen note', exact: true }).click()
      await expect(ring(noted)).toHaveClass(/is-just-closed/)
      await expect(ring(noted).getByRole('img')).toHaveAccessibleName('3 of 3 chosen steps complete')
      expect(await noted.evaluate(() => localStorage.getItem('poiem-ring-ack-v1'))).toBe(VISUAL_DAY)
      await noted.reload()
      await noted.getByRole('button', { name: 'Add a kitchen note', exact: true }).click()
      await expect(ring(noted)).not.toHaveClass(/is-just-closed/)
    } finally { await context.close() }
  })
})

test('an over-target day shows the same ring as an under-target day with the same logging', async ({ browser, baseURL }) => {
  test.setTimeout(60_000)
  const observations = []
  for (const nutrition of [{ calories: '50', macros: '1' }, { calories: '9500', macros: '500' }]) {
    const state = activeState('regular')
    state.foodEntries = [entry('breakfast'), entry('lunch')]
    const { context, page } = await scenarioPage(browser, baseURL!, state)
    try {
      await saveMeal(page, 'Same logging dinner', 'dinner', nutrition.calories, nutrition.macros)
      await expect(ring(page).getByRole('img')).toHaveAccessibleName('2 of 2 chosen steps complete')
      await expect(page.locator('.k-log-moment')).toBeVisible()
      observations.push(await page.evaluate(() => ({
        name: document.querySelector('.k-ring svg')!.getAttribute('aria-label'),
        arcs: Array.from(document.querySelectorAll('.k-ring-fill')).map(arc => ({
          offset: arc.getAttribute('stroke-dashoffset'), color: arc.getAttribute('stroke'), classes: arc.getAttribute('class'),
        })),
        legend: (document.querySelector('.k-ring-legend') as HTMLElement).innerText,
        note: (document.querySelector('.k-ring-note') as HTMLElement).innerText,
        feedback: (document.querySelector('.k-log-moment-copy') as HTMLElement).innerText,
        momo: (document.querySelector('.k-momo-note') as HTMLElement).innerText,
      })))
      const stored = await readState(page)
      expect(stored.gamification.awardedKeys).toContain(`enamel-mains-${VISUAL_DAY}`)
      expect(stored.gamification.xpEvents.map(event => event.label)).not.toContain('Under target')
    } finally { await context.close() }
  }
  expect(observations[1]).toEqual(observations[0])
})

test('the ring has an accessible name that states the chosen steps', async ({ browser, baseURL }) => {
  test.setTimeout(60_000)
  for (const [commitment, chosen] of [['light', 1], ['regular', 2], ['detailed', 3]] as const) {
    const state = activeState(commitment)
    state.foodEntries = [entry('breakfast'), entry('lunch'), entry('dinner')]
    const { context, page } = await scenarioPage(browser, baseURL!, state)
    try {
      await page.goto('/')
      await expect(ring(page)).toHaveAccessibleName('Your day')
      await expect(ring(page).getByRole('img')).toHaveCount(1)
      await expect(ring(page).getByRole('img')).toHaveAccessibleName(`${Math.min(chosen, 2)} of ${chosen} chosen steps complete`)
      const items = ring(page).locator('.k-ring-legend li')
      await expect(items).toHaveCount(3)
      await expect(items.nth(0)).toHaveText('Log something1/1')
      await expect(items.nth(1)).toHaveText(`Main meals3/3${commitment === 'light' ? ' · optional' : ''}`)
      await expect(items.nth(2)).toHaveText(`Add a detail0/1${commitment === 'detailed' ? '' : ' · optional'}`)
      await expect(ring(page).locator('.k-ring-check')).toHaveCount(commitment === 'detailed' ? 0 : 1)
      await expect(ring(page)).not.toHaveClass(/is-just-closed/)
    } finally { await context.close() }
  }
})
