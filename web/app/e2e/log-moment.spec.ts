import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { WARDROBE } from '@fud-ai/product/wardrobe'
import type { AppState, FoodEntry } from '../src/types'
import { VISUAL_DAY, VISUAL_NOW, VISUAL_USER, visualSeedState } from './seed'
import { settlePageLayout } from './helpers'

test.use({ timezoneId: 'UTC', viewport: { width: 390, height: 844 } })

const STATE_KEY = `fud-ai-web-state-${VISUAL_USER.sub}`
const allPieces = WARDROBE.map(piece => piece.id)

function emptyState(firstMeal = false): AppState {
  const state = visualSeedState()
  state.foodEntries = []
  state.favoriteMeals = []
  state.weightEntries = []
  state.profile.loggingCommitment = 'regular'
  state.profile.mascotReducedMotion = false
  state.gamification = {
    ...state.gamification, xp: 0, level: 1, pendingLevelUp: null,
    awardedKeys: [], xpEvents: [], waterByDate: {}, notesByDate: {},
    ownedCosmeticIds: firstMeal ? [] : allPieces, outfit: {},
    streakFreezes: 0, freezeUsedDates: [], brokenOn: null, brokenFrom: 0,
  }
  return state
}

function entry(id: string, day = VISUAL_DAY): FoodEntry {
  return { id, name: id, calories: 200, protein: 10, carbs: 20, fat: 5,
    timestamp: `${day}T12:00:00.000Z`, localDate: day, source: 'manual', mealType: 'snack' }
}

async function seed(page: Page, state: AppState): Promise<void> {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  // Seed once: reloading must preserve the real save, ownership, Undo and ring acknowledgement.
  await page.addInitScript(({ user, state, stateKey }) => {
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    if (sessionStorage.getItem('moment-spec-seeded')) return
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    localStorage.setItem(stateKey, JSON.stringify(state))
    localStorage.removeItem('poiem-ring-ack-v1')
    sessionStorage.setItem('poiem-splash-seen', '1')
    sessionStorage.setItem('moment-spec-seeded', '1')
  }, { user: VISUAL_USER, state, stateKey: STATE_KEY })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
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

async function saveMeal(page: Page, name: string): Promise<void> {
  await page.goto('/log/manual')
  await page.getByLabel('Food name').fill(name)
  await page.getByLabel(/^Calories/).fill('250')
  await page.getByRole('button', { name: 'Snack', exact: true }).click()
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(async () => (await readState(page)).foodEntries.filter(item => item.name === name).length).toBe(1)
}

function moment(page: Page, name: string): Locator {
  return page.getByRole('complementary', { name: `Log confirmation for ${name}`, exact: true })
}

async function layout(page: Page) {
  return page.locator('.k-ring, .k-budget, .k-meals').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect()
    return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height }
  }))
}

async function scenarioPage(browser: Browser, baseURL: string, state: AppState) {
  const context = await browser.newContext({ baseURL, timezoneId: 'UTC', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await seed(page, state)
  return { context, page }
}

test('the first meal shows a moment card, not a dialog, and focus stays where it was', async ({ page }) => {
  await seed(page, emptyState(true))
  await saveMeal(page, 'First oats')
  const card = moment(page, 'First oats')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { name: 'First meal in.', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(card).not.toHaveAttribute('aria-modal', 'true')
  await expect(card.getByRole('status')).toHaveCount(1)
  await expect(card.getByRole('status')).toHaveText('Logged First oats. First meal in. Momo’s first piece: Blossom clip.')
  await expect(card.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  await expect(card.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused()

  const fab = page.getByTestId('fab')
  await fab.focus()
  await page.clock.runFor(800)
  await expect(fab).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(fab).toBeFocused()
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: 'Dismiss', exact: true }).focus()
  await settlePageLayout(page)
  const withCard = await layout(page)
  expect(await card.evaluate(element => getComputedStyle(element).position)).toBe('fixed')
  await card.getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(card).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Meals', exact: true })).toBeFocused()
  expect(await layout(page), 'Removing feedback must not move or resize Today content').toEqual(withCard)
})

test('card scroll clearance survives another Today state update', async ({ page }) => {
  await seed(page, emptyState(true))
  await saveMeal(page, 'Clearance oats')
  const card = moment(page, 'Clearance oats')
  await expect(card).toBeVisible()
  const main = page.locator('.k-today-main')
  const clearance = await main.evaluate(element => (element as HTMLElement).style.getPropertyValue('--k-moment-clearance'))
  expect(parseFloat(clearance)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Water glasses', exact: true })).toContainText('1/8')
  await expect(card).toBeVisible()
  expect(await main.evaluate(element => (element as HTMLElement).style.getPropertyValue('--k-moment-clearance'))).toBe(clearance)
})

test('Undo on the moment card removes the entry', async ({ page }) => {
  await seed(page, emptyState(true))
  await saveMeal(page, 'Undo oats')
  const card = moment(page, 'Undo oats')
  await card.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('.k-meal-row').filter({ hasText: 'Undo oats' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Meals', exact: true })).toBeFocused()
  await expect.poll(async () => (await readState(page)).foodEntries.length).toBe(0)
  expect((await readState(page)).gamification.ownedCosmeticIds).toContain('blossom')
})

test('the second and third log of a day show only a toast', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000)
  const state = emptyState()
  state.foodEntries = [entry('Earlier snack')]
  await seed(page, state)
  for (const name of ['Second ordinary snack', 'Third ordinary snack']) {
    await saveMeal(page, name)
    const toast = page.locator('.toast').filter({ hasText: `Logged ${name}` })
    await expect(toast).toHaveCount(1)
    await expect(toast.getByRole('button', { name: 'Undo', exact: true })).toBeVisible()
    await expect(page.locator('.k-log-moment')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await toast.getByRole('button', { name: 'Dismiss', exact: true }).click()
  }

  // The ordinary-log rule must not swallow a special reward on a second or later log.
  for (const kind of ['wardrobe', 'milestone'] as const) {
    for (const priorToday of [0, 1, 2]) {
      await test.step(`${kind} remains a card at log ${priorToday + 1}`, async () => {
        const special = emptyState()
        special.foodEntries = Array.from({ length: priorToday }, (_, index) => entry(`Earlier ${index}`))
        if (kind === 'wardrobe') {
          special.gamification.ownedCosmeticIds = allPieces.filter(id => id !== 'bandana')
          special.favoriteMeals = visualSeedState().favoriteMeals
        } else {
          special.foodEntries.push(entry('Two days ago', '2026-09-17'), entry('Yesterday', '2026-09-18'))
        }
        const { context, page: specialPage } = await scenarioPage(browser, baseURL!, special)
        try {
          const name = `${kind} log ${priorToday + 1}`
          await saveMeal(specialPage, name)
          const card = moment(specialPage, name)
          await expect(card).toBeVisible()
          await expect(specialPage.locator('.toast')).toHaveCount(0)
          await expect(card).toHaveCSS('--k-moment-ms', `${priorToday === 0 ? kind === 'wardrobe' ? 720 : 480 : priorToday === 1 ? 240 : 120}ms`)
          await expect(card).toContainText(kind === 'wardrobe' ? 'New for Momo: Bandana' : '3-day streak')
          await expect(card.locator('.k-log-moment-momo')).toHaveCount(kind === 'wardrobe' ? 1 : 0)
          if (kind === 'wardrobe') expect((await readState(specialPage)).gamification.ownedCosmeticIds).toContain('bandana')
          else expect((await readState(specialPage)).gamification.awardedKeys).toContain('streak-3')
        } finally { await context.close() }
      })
    }
  }
})

test('a paused account gets a toast and nothing else', async ({ page }) => {
  const state = emptyState(true)
  state.profile.trackingPaused = true
  await seed(page, state)
  await saveMeal(page, 'Paused sandwich')
  const toast = page.locator('.toast').filter({ hasText: 'Logged Paused sandwich' })
  await expect(toast).toHaveCount(1)
  await expect(toast.locator('.toast-msg')).toHaveText('Logged Paused sandwich')
  await expect(toast.getByRole('button', { name: 'Undo', exact: true })).toBeVisible()
  await expect(page.locator('.k-log-moment, .k-ring, .k-ring-note')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const after = await readState(page)
  expect(after.gamification.ownedCosmeticIds).toEqual([])
  expect(after.gamification.xp).toBe(state.gamification.xp)
  // Paused saves consume deterministic keys without granting XP, preventing retroactive rewards on resume.
  expect(after.gamification.xpEvents).toEqual(state.gamification.xpEvents)
  expect(after.gamification.awardedKeys).toContain(`meal-${after.foodEntries[0]!.id}`)
  expect(await page.evaluate(() => localStorage.getItem('poiem-ring-ack-v1'))).toBeNull()
  await toast.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(async () => (await readState(page)).foodEntries.length).toBe(0)
})

test('a refresh on Today does not replay the moment', async ({ page }) => {
  await seed(page, emptyState(true))
  await saveMeal(page, 'Persistent oats')
  await expect(moment(page, 'Persistent oats')).toBeVisible()
  const accepted = await readState(page)
  await page.reload()
  await expect(page.locator('.k-meal-row').filter({ hasText: 'Persistent oats' })).toHaveCount(1)
  await expect(page.locator('.k-log-moment, .toast')).toHaveCount(0)
  await page.goBack()
  await page.goForward()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.k-log-moment, .toast')).toHaveCount(0)
  expect((await readState(page)).gamification.awardedKeys).toEqual(accepted.gamification.awardedKeys)
  expect((await readState(page)).gamification.ownedCosmeticIds).toEqual(accepted.gamification.ownedCosmeticIds)
})

test('deleting the only entry and logging again does not restart the first-meal moment', async ({ page }, testInfo) => {
  await seed(page, emptyState(true))
  await saveMeal(page, 'Deleted oats')
  await moment(page, 'Deleted oats').getByRole('button', { name: 'Dismiss', exact: true }).click()
  await page.locator('.k-meal-row').filter({ hasText: 'Deleted oats' }).click()
  await page.getByText('Delete this entry', { exact: true }).click()
  await page.getByRole('button', { name: 'Yes, delete entry', exact: true }).click()
  await expect.poll(async () => (await readState(page)).foodEntries.length).toBe(0)
  await saveMeal(page, 'Return oats')
  const card = moment(page, 'Return oats')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { name: 'Logged.', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'First meal in.', exact: true })).toHaveCount(0)
  await expect(card).not.toContainText('Momo’s first piece')
  expect((await readState(page)).gamification.ownedCosmeticIds.filter(id => id === 'blossom')).toHaveLength(1)

  // Keep the receipt present while measuring the last action at the natural scroll end.
  await card.getByRole('button', { name: 'Undo', exact: true }).focus()
  for (const view of [
    { width: 320, height: 844, text: 100 },
    { width: 390, height: 844, text: 100 },
    { width: 844, height: 390, text: 100 },
    { width: 390, height: 844, text: 200 },
    { width: 844, height: 390, text: 200 },
  ]) {
    const { width, height, text } = view
    await page.setViewportSize({ width, height })
    if (text === 200) await page.evaluate(() => {
      // CSS-pixel type tokens do not follow root rem enlargement. Double the actual type sizes,
      // keeping the viewport and spacing unchanged, to model text enlargement rather than zoom.
      const root = document.documentElement
      if (root.dataset.momentEnlarged) return
      root.dataset.momentEnlarged = 'true'
      const css = getComputedStyle(root)
      for (const name of ['meta', 'label', 'body', 'lead', 'section', 'panel', 'figure', 'title', 'metric']) {
        const token = `--k-type-${name}`
        root.style.setProperty(token, `${parseFloat(css.getPropertyValue(token)) * 2}px`)
      }
    })
    await settlePageLayout(page)
    await expect.poll(() => card.evaluate(element => {
      const main = document.querySelector('.k-today-main')!
      return parseFloat(getComputedStyle(main).getPropertyValue('--k-moment-clearance')) >= element.getBoundingClientRect().height
    })).toBe(true)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await settlePageLayout(page)
    await expect(card).toBeVisible()
    const reach = await page.getByRole('button', { name: 'Add snack', exact: true }).evaluate(element => {
      const box = element.getBoundingClientRect()
      const covering = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      const nav = document.querySelector('.bottom-nav-wrap')!.getBoundingClientRect()
      const card = document.querySelector('.k-log-moment')!.getBoundingClientRect()
      const intersectsCard = box.left < card.right && box.right > card.left && box.top < card.bottom && box.bottom > card.top
      return { top: box.top, bottom: box.bottom, navTop: nav.top, intersectsCard,
        hittable: covering === element || element.contains(covering), cardTop: card.top,
        cardBottom: card.bottom, cardLeft: card.left, cardRight: card.right }
    })
    const label = `${width}×${height}, ${text}% text`
    expect.soft(reach.top, `Add snack starts within the viewport at ${label}`).toBeGreaterThanOrEqual(0)
    expect.soft(reach.bottom, `Add snack clears the nav at ${label}`).toBeLessThanOrEqual(reach.navTop)
    expect.soft(reach.intersectsCard, `The moment must not cover Add snack at ${label}`).toBe(false)
    expect.soft(reach.hittable, `Add snack must accept a pointer while the moment is present at ${label}`).toBe(true)
    expect.soft(reach.cardTop, `The whole card starts inside the viewport at ${label}`).toBeGreaterThanOrEqual(0)
    expect.soft(reach.cardBottom, `The card clears the nav at ${label}`).toBeLessThanOrEqual(reach.navTop)
    expect.soft(reach.cardLeft, `The card clears the left edge at ${label}`).toBeGreaterThanOrEqual(0)
    expect.soft(reach.cardRight, `The card clears the right edge at ${label}`).toBeLessThanOrEqual(width)
    await page.screenshot({ path: testInfo.outputPath(`moment-reach-${width}-${height}-${text}.png`), animations: 'disabled' })
  }
  const beforeDismiss = await page.getByRole('button', { name: 'Add snack', exact: true }).evaluate(element => ({
    top: element.getBoundingClientRect().top, scrollY, height: document.documentElement.scrollHeight,
  }))
  await card.getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(card).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Meals', exact: true })).toBeFocused()
  expect(await page.getByRole('button', { name: 'Add snack', exact: true }).evaluate(element => ({
    top: element.getBoundingClientRect().top, scrollY, height: document.documentElement.scrollHeight,
  })), 'Dismissing at the scroll end must preserve the final row and scroll position').toEqual(beforeDismiss)
})

test('reduced motion shows the same text with no decorative motion', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  let normalText: string | undefined
  for (const mode of ['normal', 'reduced', 'hidden', 'muted'] as const) {
    const state = emptyState(true)
    if (mode === 'hidden') state.gamification.mascotActivity = 'off'
    if (mode === 'muted') state.profile.mascotMuted = true
    const { context, page } = await scenarioPage(browser, baseURL!, state)
    try {
      await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' })
      await saveMeal(page, 'Still oats')
      const card = moment(page, 'Still oats')
      await expect(card).toBeVisible()
      await expect(card.getByRole('status')).toHaveText('Logged Still oats. First meal in. Momo’s first piece: Blossom clip.')
      await expect(card.getByRole('status')).toHaveCount(1)
      const text = await card.locator('.k-log-moment-copy').innerText()
      if (mode === 'normal') normalText = text
      else expect(text).toBe(normalText)
      await expect(card.locator('.k-log-moment-momo')).toHaveCount(mode === 'normal' ? 1 : 0)
      if (mode === 'reduced') {
        await expect(card).toHaveClass(/is-static/)
        await expect(card).toHaveCSS('--k-moment-ms', '0ms')
        await expect(card).toHaveCSS('animation-name', 'none')
        await expect(page.locator('.k-budget-number strong')).toHaveText('1,750')
      }
    } finally { await context.close() }
  }
})
