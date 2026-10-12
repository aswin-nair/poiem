import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

// A short phone: the page is taller than the screen, so a scroll on load would hide the heading.
test.use({ viewport: { width: 390, height: 640 } })

test.describe('Coach opening position', () => {
  test('an empty conversation opens at the top, not scrolled past the heading', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/coach')
    await expect(page.getByRole('heading', { name: 'AI Coach' })).toBeInViewport()
    // Give any follow-the-conversation scroll a frame to land before measuring.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0)
  })
})
