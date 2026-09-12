import { expect, test, type Page } from '@playwright/test'

async function scrollPlateStoryToEnd(page: Page) {
  await page.evaluate(() => {
    const section = document.getElementById('plate-to-numbers')!
    const top = section.getBoundingClientRect().top + window.scrollY - 62
    window.scrollTo({ top: top + section.offsetHeight - window.innerHeight + 62, behavior: 'instant' })
  })
}

test.describe('welcome page', () => {
  test('reads a sample plate and stays inside the viewport', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await page.goto('/welcome')
      await expect(page.getByRole('heading', { level: 1 })).toContainText('A little tracking')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    }

    const picker = page.getByRole('group', { name: 'Scan a sample meal' })
    await picker.getByRole('button', { name: 'Bowl', exact: true }).click()
    await expect(picker.getByRole('button', { name: 'Bowl', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Chicken rice bowl: about 610 kcal.')).toBeAttached()
    await expect(page.locator('.wp-scan-tags li')).toHaveCount(4)
    expect(errors).toEqual([])
  })

  test('roomy screens pin the plate story and fill the entry as the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/welcome')
    const story = page.locator('#plate-to-numbers')
    await expect(story).toHaveClass(/is-pinned/)
    const kcal = story.locator('.wp-nl-kcal strong span[aria-hidden="true"]')
    await expect(kcal).toHaveText('0')
    await expect(story.locator('.wp-nl-kcal .sr-only')).toHaveText('380')
    await scrollPlateStoryToEnd(page)
    await expect(kcal).toHaveText('380')
    await expect(story.locator('.wp-p2n-phases li.is-active')).toHaveText('03 Journal')
  })

  test('reduced motion shows the finished story and week without scroll effects', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/welcome')
    const story = page.locator('#plate-to-numbers')
    await expect(story).toHaveClass(/is-static/)
    await expect(story.locator('.wp-nl-kcal strong')).toHaveText('380')
    await expect(page.locator('#week .wp-week')).toHaveClass(/is-playing/)
    await expect(page.locator('#week')).toContainText('Average kcal on logged days')
    await expect(page.getByRole('figure', { name: 'Poiem Facts' })).toContainText('Food guilt')
  })

  test('starting a journal leads to sign up', async ({ page }) => {
    await page.goto('/welcome')
    await page.getByRole('link', { name: 'Start your journal' }).first().click()
    await page.waitForURL(/\/login\?mode=signup/)
  })
})
