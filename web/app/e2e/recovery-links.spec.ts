import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
})

for (const width of [320, 390, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Support and About recovery links ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme: theme })
      await page.goto('/support')
      await expect(page.getByRole('heading', { name: 'Support', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.getByRole('link', { name: 'Pause tracking', exact: true }).click()
      await expect(page.getByRole('switch', { name: 'Pause tracking', exact: true })).toBeFocused()
      await expect(page.getByRole('switch', { name: 'Pause tracking', exact: true })).not.toBeChecked()
      await page.goto('/support')
      await page.getByRole('link', { name: 'AI setup and your own connection' }).click()
      await expect(page.getByRole('switch', { name: 'Use my own API', exact: true })).toBeFocused()
      await page.goto('/support')
      await page.getByRole('link', { name: 'Account and sign-in details' }).click()
      await expect(page.locator('#setting-account-identity')).toBeFocused()
      await page.goto('/about')
      await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.getByRole('link', { name: 'Your journal and backups' }).click()
      await expect(page.getByRole('button', { name: 'Export backup', exact: true })).toBeFocused()
    })
  }
}

test('a slow Settings route chunk retains navigation and focuses the loaded heading', async ({ page }) => {
  const secondaryRequests: string[] = []
  page.on('request', request => {
    if (/\/src\/pages\/(?:SettingsPage|ProgressPage|SavedMealsPage)\.tsx/.test(request.url())) secondaryRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  expect(secondaryRequests).toHaveLength(0)
  let release: () => void = () => {}
  const loaded = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/pages/SettingsPage.tsx*', async route => {
    // Deliberately slow delivery exercises the route focus observer after the
    // previous one-second heading search would have stopped.
    await loaded
    await new Promise(resolve => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.getByRole('link', { name: 'You', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Opening…' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Today', exact: true })).toBeVisible()
  release()
  await expect(page.getByRole('heading', { name: 'You', exact: true })).toBeFocused()
  expect(secondaryRequests).toHaveLength(1)
})
