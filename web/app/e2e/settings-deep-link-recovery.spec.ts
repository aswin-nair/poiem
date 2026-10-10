import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
})

test('a valid Settings deep link focuses the recovery heading when its screen download fails', async ({ page }) => {
  await page.route('**/src/pages/SettingsPage.tsx*', route => route.abort('failed'))
  await page.goto('/settings?panel=data#setting-import')
  await expect(page.getByRole('heading', { name: 'Couldn’t open this screen', exact: true })).toBeFocused()
  await page.getByRole('link', { name: 'Return to Today', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
})

test('an overview Appearance deep link keeps focus on its setting', async ({ page }) => {
  await page.goto('/settings#you-appearance')
  await expect(page.locator('#you-appearance')).toBeFocused()
  await expect(page.getByRole('group', { name: 'Appearance', exact: true })).toBeVisible()
})
