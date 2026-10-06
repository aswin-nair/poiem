import { expect, test } from '@playwright/test'
import { settlePageLayout, signUpAndOnboard } from './helpers'

for (const width of [320, 390, 1280]) {
  test(`recipe box and insights at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/**', route => route.abort('blockedbyclient'))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signUpAndOnboard(page)
    await page.goto('/discover')
    await page.getByRole('button', { name: 'Save Onboarding yogurt bowl', exact: true }).click()
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/discover')
      await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
      const card = page.getByRole('article', { name: 'Onboarding yogurt bowl', exact: true })
      await card.getByRole('button', { name: /Adjust portion for Onboarding yogurt bowl/ }).click()
      await card.getByRole('button', { name: 'Increase portion for Onboarding yogurt bowl', exact: true }).click()
      await expect(card.getByText('300 kcal', { exact: true })).toBeVisible()
      await expect(card.getByRole('button', { name: /Log Onboarding yogurt bowl, 1.25 times your saved meal to/ })).toBeVisible()
      await settlePageLayout(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`saved-${colorScheme}.png`), fullPage: true, animations: 'disabled' })
      await page.getByLabel('Find a saved or recent meal').fill('no-such-meal')
      await expect(page.getByRole('status')).toContainText('0 saved · 0 recent matching your filters')
      await page.getByRole('button', { name: 'Clear search and filters' }).click()
      await expect(card).toBeVisible()
      await page.goto('/progress')
      await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Month', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Last 30 days · Applies to the two charts below.')
      await settlePageLayout(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`insights-${colorScheme}.png`), fullPage: true, animations: 'disabled' })
    }
    await page.getByRole('button', { name: '+ Log weight' }).click()
    await page.getByLabel('Weight (kg)').fill('72.5')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.progress-stat-value').first()).toHaveText('72.5 kg')
    expect(errors).toEqual([])
  })
}
