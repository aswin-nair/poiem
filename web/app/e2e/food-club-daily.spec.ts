import { expect, test } from '@playwright/test'
import { settlePageLayout, signUpAndOnboard } from './helpers'

for (const width of [320, 390, 1280]) {
  test(`food club daily pages work at ${width}px in both themes`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    // Test data remains in this isolated browser, never a cloud account.
    await page.route('**/api/**', route => route.abort('blockedbyclient'))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signUpAndOnboard(page)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
      await settlePageLayout(page)
      await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
      await expect(page.getByRole('complementary', { name: 'A note from Momo' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`today-${colorScheme}.png`), fullPage: true, animations: 'disabled' })

      await page.getByRole('button', { name: 'Log a meal', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'Log a meal' })
      await expect(sheet.getByRole('heading', { name: 'Log a meal', exact: true })).toBeVisible()
      await expect(sheet.getByRole('link', { name: /Snap a photo/ })).toBeVisible()
      await expect(sheet.getByRole('button', { name: 'Adjust portion for Onboarding yogurt bowl' })).toBeVisible()
      await settlePageLayout(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`log-${colorScheme}.png`), animations: 'disabled' })

      await sheet.getByLabel('Search your foods, or type calories').fill('350')
      await expect(sheet.getByRole('button', { name: /Quick add 350 kcal/ })).toBeVisible()
      await sheet.getByRole('button', { name: 'Clear search' }).click()

      // Escape closes only the topmost dialog: the portion picker, then the sheet.
      await sheet.getByRole('button', { name: 'Adjust portion for Onboarding yogurt bowl' }).click()
      const portion = page.getByRole('dialog', { name: 'Portion for Onboarding yogurt bowl' })
      await expect(portion).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(portion).toHaveCount(0)
      await expect(sheet).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
}
