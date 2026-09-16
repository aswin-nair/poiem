import { test, expect } from '@playwright/test'
import { settlePageLayout, signUpAndOnboard } from './helpers'

test('Today’s date bar keeps the title clear of the date control, and About keeps the identity', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpAndOnboard(page)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await settlePageLayout(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      const title = await page.getByRole('heading', { name: 'Today', exact: true, level: 1 }).boundingBox()
      const dateButton = await page.getByRole('button', { name: 'Choose date', exact: true }).boundingBox()
      // Beside or below are both fine; the title must never run into the control.
      const clear = title!.x + title!.width <= dateButton!.x || title!.y + title!.height <= dateButton!.y
      expect(clear, `title overlaps the date control at ${width}px ${colorScheme}`).toBe(true)
      expect(dateButton!.width).toBeGreaterThanOrEqual(44)
      expect(dateButton!.height).toBeGreaterThanOrEqual(44)
      if (width === 320) await page.screenshot({ path: testInfo.outputPath(`today-header-${colorScheme}.png`), fullPage: true })
    }
  }
  await page.goto('/about')
  await expect(page.getByRole('img', { name: 'Poiem', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Poiem brand kit' })).toHaveAttribute('href', '/brand/index.html')
})
