import { expect, test, type Page } from '@playwright/test'
import { VISUAL_NOW, VISUAL_USER, visualSeedState } from './seed'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  // Seed only once: a retry reload must read the real persisted copy.
  await page.addInitScript(({ user, state }) => {
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    if (sessionStorage.getItem('route-recovery-seeded')) return
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
    sessionStorage.setItem('poiem-splash-seen', '1')
    sessionStorage.setItem('route-recovery-seeded', '1')
  }, { user: VISUAL_USER, state: visualSeedState() })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
})

async function readMeals(page: Page) {
  return page.evaluate(async user => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    return (await loadDurableState(user))?.state.foodEntries ?? null
  }, VISUAL_USER.sub)
}

for (const width of [390, 1440]) {
  for (const screen of [
    { name: 'Saved', module: 'SavedMealsPage' },
    { name: 'Insights', module: 'ProgressPage' },
    { name: 'You', module: 'SettingsPage' },
  ]) {
    test(`failed ${screen.name} download keeps navigation and reloads ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme: width === 390 ? 'light' : 'dark' })
      await page.goto('/')
      await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
      await expect.poll(() => readMeals(page)).not.toBeNull()
      const entries = await readMeals(page)
      let attempts = 0
      await page.route(`**/src/pages/${screen.module}.tsx*`, route => {
        attempts += 1
        return attempts === 1 ? route.abort('failed') : route.continue()
      })
      await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: screen.name, exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Couldn’t open this screen', exact: true })).toBeFocused()
      await expect(page.getByRole('link', { name: 'Today', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Return to Today', exact: true })).toBeVisible()
      const reload = page.getByRole('button', { name: 'Reload this screen', exact: true })
      expect((await reload.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`route-download-${screen.name.toLowerCase()}-${width}.png`), animations: 'disabled' })
      await reload.click()
      await expect(page.getByRole('heading', { name: screen.name, exact: true })).toBeVisible()
      expect(attempts).toBeGreaterThanOrEqual(2)
      expect(await readMeals(page)).toEqual(entries)
      await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Today', exact: true }).click()
      await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
    })
  }
}

test('a failed screen can return to Today without a reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  await page.route('**/src/pages/SavedMealsPage.tsx*', route => route.abort('failed'))
  await page.getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Couldn’t open this screen', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Return to Today', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
})

test('unknown Settings hashes fall back to the You heading', async ({ page }) => {
  await page.goto('/settings#old-setting')
  await expect(page.getByRole('heading', { name: 'You', exact: true })).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toBeVisible()
  await page.goto('/settings#setting-height')
  await expect(page.getByRole('heading', { name: 'You', exact: true })).toBeFocused()
})
