import { expect, test } from '@playwright/test'
import { applyVisualSeed, VISUAL_USER } from './seed'
import { adventureStorageKey, MOMO_ADVENTURES } from '../src/lib/momoAdventures'

for (const width of [320, 390, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`journey and postcard fit ${width} ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await applyVisualSeed(page)
    await page.goto('/')
    const book = page.locator('.k-adventures')
    await book.locator('summary').click()
    await book.getByRole('button', { name: 'Journey', exact: true }).click()
    const trail = page.getByRole('region', { name: 'The little joy trail' })
    await expect(trail.getByRole('progressbar')).toHaveAttribute('value', '0')
    await page.evaluate(() => document.fonts.ready)
    for (const control of await trail.getByRole('button').all()) {
      const box = (await control.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    }
    const capture = { animations: 'disabled' as const, style: '.bottom-nav-wrap { visibility: hidden; }' }
    const prefix = `docs/ui-enhancements/playful-today/journey-${width}-${colorScheme}`
    await trail.screenshot({ path: `${prefix}-route.png`, ...capture })
    const lastStop = trail.getByRole('button', { name: /Quiet lookout/ })
    await lastStop.click()
    await book.getByRole('button', { name: 'Back to my journey', exact: true }).click()
    await expect(book.getByRole('heading', { level: 3 })).toBeFocused()
    await page.evaluate(({ key, choices }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, choices }))
      window.dispatchEvent(new StorageEvent('storage', { key }))
    }, { key: adventureStorageKey(VISUAL_USER.sub), choices: Object.fromEntries(MOMO_ADVENTURES.map(item => [item.id, item.options[0].id])) })
    await expect(trail.getByRole('article')).toBeVisible()
    await trail.getByRole('article').screenshot({ path: `${prefix}-postcard.png`, ...capture })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await book.getByRole('button', { name: /Sticker book/ }).click()
    await book.getByRole('button', { name: 'Clear this sticker book' }).click()
    await book.getByRole('button', { name: 'Clear stickers', exact: true }).click()
    await book.getByRole('button', { name: 'Journey', exact: true }).click()
    await expect(trail.getByRole('article')).toHaveCount(0)
    await expect(trail.getByRole('progressbar')).toHaveAttribute('value', '0')
  })
}
