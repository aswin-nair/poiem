import { expect, test, type Locator, type Page } from '@playwright/test'
import { WARDROBE } from '@fud-ai/product/wardrobe'
import { applyVisualSeed, VISUAL_NOW, VISUAL_USER, visualSeedState } from './seed'
import { nav, openYouDestination, settlePageLayout } from './helpers'

test.use({ timezoneId: 'UTC' })

// These synthetic CSS insets exercise layout owners in Chromium. They do not
// certify Safari's env() values, browser chrome, hardware cutouts or keyboards.
const scenarios = [
  { name: 'portrait', width: 390, height: 844, top: 44, right: 7, bottom: 34, left: 11 },
  { name: 'landscape', width: 844, height: 390, top: 0, right: 44, bottom: 21, left: 44 },
] as const
type Scenario = { name: string; width: number; height: number; top: number; right: number; bottom: number; left: number }

async function prepare(page: Page, scenario: Scenario, theme: 'light' | 'dark', signedIn = true, state = visualSeedState()) {
  await page.setViewportSize({ width: scenario.width, height: scenario.height })
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.addInitScript(insets => {
    const apply = () => {
      const root = document.documentElement
      if (!root) return false
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        root.style.setProperty(`--k-safe-${side}`, `${insets[side]}px`, 'important')
      }
      return true
    }
    if (!apply()) {
      const observer = new MutationObserver(() => { if (apply()) observer.disconnect() })
      observer.observe(document, { childList: true })
    }
    document.addEventListener('DOMContentLoaded', apply, { once: true })
    sessionStorage.setItem('poiem-splash-seen', '1')
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
  }, scenario)
  if (signedIn) await applyVisualSeed(page, state)
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

/** Full-bleed backgrounds may enter an inset; meaningful content may not. */
async function expectSafe(control: Locator, scenario: Scenario, options: { vertical?: boolean; target?: boolean } = {}) {
  await expect(control).toBeVisible()
  const box = await control.boundingBox()
  expect(box, 'Expected measurable content').not.toBeNull()
  expect(box!.x, 'Content clears the left inset').toBeGreaterThanOrEqual(scenario.left - 1)
  expect(box!.x + box!.width, 'Content clears the right inset').toBeLessThanOrEqual(scenario.width - scenario.right + 1)
  if (options.vertical !== false) {
    expect(box!.y, 'Content clears the top inset').toBeGreaterThanOrEqual(scenario.top - 1)
    expect(box!.y + box!.height, 'Content clears the bottom inset').toBeLessThanOrEqual(scenario.height - scenario.bottom + 1)
  }
  if (options.target) {
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(await control.evaluate(element => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return hit === element || element.contains(hit)
    }), 'The visible control accepts a pointer').toBe(true)
  }
}

test('safe-area viewport keeps cover and pinch zoom', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  const value = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(value).toMatch(/(?:^|,)\s*viewport-fit\s*=\s*cover\s*(?:,|$)/i)
  expect(value).not.toMatch(/user-scalable\s*=\s*(?:no|0)\b/i)
  expect(value, 'Do not limit pinch zoom').not.toMatch(/maximum-scale\s*=/i)
})

for (const scenario of scenarios) for (const theme of ['light', 'dark'] as const) {
  test(`safe-area workspace geometry ${scenario.name} ${theme}`, async ({ page }) => {
    await prepare(page, scenario, theme)
    await page.goto('/')
    await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
    for (const destination of ['Today', 'Insights', 'Saved', 'You'] as const) {
      if (destination !== 'Today') await nav(page).getByRole('link', { name: destination, exact: true }).click()
      const heading = page.getByRole('heading', { name: destination, exact: true })
      await expect(heading).toBeVisible()
      await settlePageLayout(page)
      await expectSafe(heading, scenario)
      await expectNoOverflow(page)
      for (const action of await nav(page).locator('.nav-item, .nav-fab').all()) {
        await expectSafe(action, scenario, { target: true })
      }
      const contentStart = await page.locator('main').first().evaluate(element => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight) }
      })
      expect(contentStart.left).toBeGreaterThanOrEqual(scenario.left - 1)
      expect(contentStart.right).toBeLessThanOrEqual(scenario.width - scenario.right + 1)
    }
  })

  test(`safe-area sheets and sticky Settings ${scenario.name} ${theme}`, async ({ page }) => {
    await prepare(page, scenario, theme)
    await page.goto('/')
    await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
    await page.getByTestId('fab').click()
    const log = page.getByRole('dialog', { name: 'Log a meal', exact: true })
    await expect(log).toBeVisible()
    await settlePageLayout(page)
    await expectSafe(log.getByRole('button', { name: 'Close', exact: true }), scenario, { target: true })
    const endLog = log.getByRole('button', { name: /^Log .+ times your previous meal to / }).last()
    await endLog.scrollIntoViewIfNeeded()
    await expectSafe(endLog, scenario, { target: true })
    await expectNoOverflow(page)
    await page.keyboard.press('Escape')
    await expect(log).toHaveCount(0)

    // A smaller CSS viewport is a geometry stress case, not a real keyboard.
    const compact = { ...scenario, height: scenario.name === 'portrait' ? 400 : scenario.height }
    await page.setViewportSize({ width: compact.width, height: compact.height })
    await page.goto('/settings?panel=profile')
    await page.getByRole('spinbutton', { name: 'Height', exact: true }).fill('181')
    await page.locator('.you-toolbar').evaluate(element => {
      window.scrollTo(0, element.getBoundingClientRect().top + scrollY + 180)
    })
    await expect.poll(async () => (await page.locator('.you-toolbar').boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(compact.top - 1)
    const category = page.getByRole('combobox', { name: 'Category', exact: true })
    const section = await category.isVisible() ? category
      : page.getByRole('navigation', { name: 'You page sections', exact: true }).getByRole('link', { name: 'Profile & goals', exact: true })
    await expectSafe(section, compact, { target: true })
    await expectSafe(page.getByRole('button', { name: 'Save settings', exact: true }), compact, { target: true })
    await nav(page).getByRole('link', { name: 'Insights', exact: true }).click()
    const departure = page.getByRole('dialog', { name: 'Keep your Settings changes?', exact: true })
    await expect(departure).toBeVisible()
    await settlePageLayout(page)
    for (const name of ['Stay', 'Save and leave', 'Discard and leave']) {
      const action = departure.getByRole('button', { name, exact: true })
      await action.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
      await expectSafe(action, compact, { target: true })
    }
    await page.keyboard.press('Escape')
    await expect(departure).toHaveCount(0)

    await openYouDestination(page, 'Your data')
    await page.getByLabel('Import backup file').setInputFiles({
      name: 'synthetic-safe-area-backup.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(visualSeedState())),
    })
    const preview = page.getByRole('dialog', { name: 'Import backup', exact: true })
    await expect(preview).toBeVisible()
    await settlePageLayout(page)
    const cancel = preview.getByRole('button', { name: 'Cancel backup import', exact: true })
    await cancel.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
    await expectSafe(cancel, compact, { target: true })
    const replace = preview.getByRole('button', { name: 'Replace Poiem data', exact: true })
    await replace.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
    await expectSafe(replace, compact, { target: true })
    await expectNoOverflow(page)
    await page.keyboard.press('Escape')
    await expect(preview).toHaveCount(0)
  })

  test(`safe-area welcome account and setup ${scenario.name} ${theme}`, async ({ page }) => {
    await prepare(page, scenario, theme, false)
    await page.goto('/welcome')
    await expect(page.getByRole('heading', { name: 'A little tracking. A lot of living.', exact: true })).toBeVisible()
    const welcomeHome = page.locator('.wp-header').getByRole('link', { name: 'Poiem home', exact: true })
    await expectSafe(welcomeHome, scenario)
    const headerStart = page.locator('.wp-header-actions').getByRole('link', { name: 'Start', exact: true })
    await expectSafe(headerStart, scenario, { target: true })
    const headerSignIn = page.locator('.wp-header-actions').getByRole('link', { name: 'Sign in', exact: true })
    await expectSafe(headerSignIn, scenario, { target: true })
    await expect(headerSignIn).toHaveCSS('white-space', 'nowrap')
    await page.evaluate(() => window.scrollTo(0, 300))
    await settlePageLayout(page)
    await expectSafe(headerStart, scenario, { target: true })
    await expectNoOverflow(page)

    await page.goto('/login?mode=signin')
    await expect(page.getByRole('heading', { name: 'Welcome back!', exact: true })).toBeVisible()
    await expectSafe(page.getByRole('link', { name: 'Poiem welcome', exact: true }), scenario)
    const email = page.getByLabel('Email', { exact: true })
    await email.scrollIntoViewIfNeeded()
    await expectSafe(email, scenario, { target: true })
    const submit = page.locator('form.auth-form').getByRole('button', { name: 'Sign in', exact: true })
    await submit.scrollIntoViewIfNeeded()
    await expectSafe(submit, scenario, { target: true })
    await expectNoOverflow(page)

    await page.goto('/onboarding')
    await expect(page.getByRole('main', { name: 'Welcome to Poiem', exact: true })).toBeVisible()
    await expectSafe(page.locator('.k-intro-bar .welcome-brand'), scenario)
    const start = page.getByRole('button', { name: 'Get started', exact: true })
    await start.scrollIntoViewIfNeeded()
    await expectSafe(start, scenario, { target: true })
    await start.click()
    await expect(page.getByRole('heading', { name: 'What is your date of birth?', exact: true })).toBeVisible()
    await settlePageLayout(page)
    const setupBrand = page.locator('.k-setup-bar .welcome-brand')
    await setupBrand.scrollIntoViewIfNeeded()
    await expectSafe(setupBrand, scenario)
    const birthday = page.getByLabel('Date of birth', { exact: true })
    await birthday.scrollIntoViewIfNeeded()
    await expectSafe(birthday, scenario, { target: true })
    const next = page.getByRole('button', { name: 'Continue', exact: true })
    await next.scrollIntoViewIfNeeded()
    await expectSafe(next, scenario, { target: true })
    await expectNoOverflow(page)
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`safe-area fixed meal confirmation and toast portrait ${theme}`, async ({ page }) => {
    const scenario = scenarios[0]
    const state = visualSeedState()
    state.gamification.ownedCosmeticIds = WARDROBE.map(piece => piece.id)
    await prepare(page, scenario, theme, true, state)
    await page.addInitScript(({ userId, now }) => {
      const analysis = { name: 'Synthetic safe-area tofu', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }
      localStorage.setItem(`fud-log-drafts-v1-${encodeURIComponent(userId)}`, JSON.stringify({ version: 1, review: {
        analysis, baseAnalysis: analysis, originalAnalysis: analysis, servings: 1,
        mealType: 'lunch', source: 'textInput', emptyNumericFields: [], updatedAt: now,
      } }))
    }, { userId: VISUAL_USER.sub, now: VISUAL_NOW })
    await page.goto('/review')
    await expect(page.getByRole('heading', { name: 'Make it your meal.', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await settlePageLayout(page)
    const confirmation = page.getByRole('region', { name: 'Final meal confirmation', exact: true })
    await expect(confirmation).toHaveCSS('position', 'fixed')
    const save = confirmation.getByRole('button', { name: 'Log meal', exact: true })
    await expectSafe(save, scenario, { target: true })
    await expectNoOverflow(page)
    await save.click()
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
    // An ordinary fourth log has no first-meal/milestone card. Pause the real
    // toast's timer through focus before measuring its Undo and dismiss controls.
    const toast = page.locator('.toast').filter({ hasText: 'Logged Synthetic safe-area tofu' })
    await expect(toast).toBeVisible()
    const undo = toast.getByRole('button', { name: 'Undo', exact: true })
    await undo.focus()
    await settlePageLayout(page)
    await expectSafe(undo, scenario, { target: true })
    await expectSafe(toast.getByRole('button', { name: 'Dismiss', exact: true }), scenario, { target: true })
    const toastBox = await toast.boundingBox()
    const navBox = await nav(page).boundingBox()
    expect(toastBox!.y + toastBox!.height, 'Feedback clears the navigation').toBeLessThanOrEqual(navBox!.y + 1)
    await undo.click()
    await expect(toast).toHaveCount(0)
  })
}
