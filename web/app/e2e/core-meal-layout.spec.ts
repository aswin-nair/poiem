import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

for (const width of [320, 390, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Today keeps the daily log action beside readable totals at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme: theme })
      await page.route('**/api/**', route => route.abort())
      await applyVisualSeed(page)
      await page.goto('/')
      const action = page.locator('.k-budget').getByRole('button', { name: 'Log a meal', exact: true })
      await expect(action).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('region', { name: 'Macros', exact: true })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toHaveAttribute('aria-valuenow', '1140')
      if (width === 390) {
        const firstMeal = await page.locator('.k-meal-row').first().boundingBox()
        const navigation = await page.getByRole('navigation', { name: 'Main', exact: true }).boundingBox()
        expect(firstMeal!.y).toBeLessThan(navigation!.y)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
      await action.click()
      await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(action).toBeFocused()
    })
  }
}
