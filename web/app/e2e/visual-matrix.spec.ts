import { expect, test, type Page } from '@playwright/test'
import { settlePageLayout, signUpAndOnboard } from './helpers'

/**
 * The screenshot matrix in DESIGN.md: each rebuilt surface at four widths, in both
 * themes. Every capture also checks for sideways scrolling and runtime errors, so
 * the images are evidence rather than decoration.
 */
const WIDTHS = [360, 390, 768, 1440] as const
const SURFACES: ReadonlyArray<{ name: string; path: string; ready: (page: Page) => ReturnType<Page['getByRole']> }> = [
  { name: 'today', path: '/', ready: page => page.getByRole('progressbar', { name: 'Calories' }) },
  { name: 'log-sheet', path: '/log', ready: page => page.getByRole('dialog', { name: 'Log a meal' }) },
  { name: 'describe', path: '/log/text', ready: page => page.getByLabel('Your meal, your words') },
  { name: 'manual', path: '/log/manual', ready: page => page.getByLabel('Food name') },
  { name: 'saved', path: '/discover', ready: page => page.getByRole('heading', { name: 'Saved', exact: true }) },
  { name: 'insights', path: '/progress', ready: page => page.getByRole('region', { name: 'Journey' }) },
]

for (const width of WIDTHS) {
  test(`screenshot matrix at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signUpAndOnboard(page)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      for (const surface of SURFACES) {
        await page.goto(surface.path)
        await expect(surface.ready(page)).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
        await settlePageLayout(page)
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
        expect(fits, `${surface.name} scrolls sideways at ${width}px ${colorScheme}`).toBe(true)
        await page.screenshot({
          path: testInfo.outputPath(`${surface.name}-${width}-${colorScheme}.png`),
          fullPage: surface.name !== 'log-sheet',
          animations: 'disabled',
        })
      }
    }
    expect(errors).toEqual([])
  })
}
