import { expect, test, type Page } from '@playwright/test'
import { settlePageLayout } from './helpers'
import { applyVisualSeed } from './seed'

const WIDTHS = [320, 390, 768, 1440] as const
const THEMES = ['light', 'dark'] as const

const SURFACES = [
  { name: 'today', path: '/', ready: (page: Page) => page.getByRole('progressbar', { name: 'Calories' }) },
  { name: 'reference', path: '/dev/components', ready: (page: Page) => page.getByRole('heading', { name: 'Components' }) },
] as const

async function prepare(page: Page, width: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await applyVisualSeed(page)
}

test.describe('approved screenshots', () => {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      for (const surface of SURFACES) {
        test(`${surface.name} ${width} ${theme}`, async ({ page }) => {
          await prepare(page, width, theme)
          await page.goto(surface.path)
          await expect(surface.ready(page)).toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          await settlePageLayout(page)
          await page.addStyleTag({ content: '@media (max-width: 1119px) { .k-app .bottom-nav-wrap { position: absolute; top: auto; } }' })
          const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          expect(fits, `${surface.name} scrolls sideways at ${width}px ${theme}`).toBe(true)
          await expect(page).toHaveScreenshot(`${surface.name}-${width}-${theme}.png`, {
            fullPage: true,
            animations: 'disabled',
          })
        })
      }
    }
  }
})

test('Today fields stay aligned and Momo stays off the numbers', async ({ page }) => {
  await prepare(page, 390, 'light')
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
  await settlePageLayout(page)

  const layout = await page.evaluate(() => {
    const macros = [...document.querySelectorAll('.k-macro')].map(node => node.getBoundingClientRect())
    const meals = document.querySelector('.k-meals')?.getBoundingClientRect()
    const overlay = document.querySelector('.mascot-overlay')
    const protectedRegion = document.querySelector('[data-mascot-avoid].k-today-main')?.getBoundingClientRect()
    return {
      macroLefts: macros.map(box => Math.round(box.left)),
      macroHeights: macros.map(box => Math.round(box.height)),
      mealsTop: meals ? Math.round(meals.top) : 0,
      overlay: overlay?.getBoundingClientRect() ?? null,
      protected: protectedRegion
        ? { left: protectedRegion.left, right: protectedRegion.right, top: protectedRegion.top, bottom: protectedRegion.bottom }
        : null,
    }
  })

  expect(layout.macroLefts.length).toBe(3)
  expect(Math.max(...layout.macroHeights) - Math.min(...layout.macroHeights)).toBeLessThanOrEqual(4)
  expect(layout.overlay).toBeNull()
  expect(layout.protected).not.toBeNull()
})
