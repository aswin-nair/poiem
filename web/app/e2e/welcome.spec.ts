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
    // The visible count is aria-hidden; screen readers get the total from a sibling.
    const kcal = story.locator('.wp-nl-kcal strong [aria-hidden="true"]')
    await expect(kcal).toHaveText('0')
    await scrollPlateStoryToEnd(page)
    await expect(kcal).toHaveText('380')
    await expect(story.locator('.wp-p2n-phases li.is-active')).toHaveText('03 Journal')
  })

  test('phones play each section when it scrolls into view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/welcome')
    const story = page.locator('#plate-to-numbers')
    await expect(story).toHaveClass(/is-reveal/)
    const kcal = story.locator('.wp-nl-kcal strong [aria-hidden="true"]')
    await expect(kcal).toHaveText('0')
    await story.locator('.wp-p2n-entry').scrollIntoViewIfNeeded()
    await expect(story.locator('.wp-p2n-entry')).toHaveClass(/is-in/)
    await expect(kcal).toHaveText('380')

    // The week reads top to bottom, so no day is hidden off to the side.
    const week = page.locator('#week .wp-week-scroll')
    expect(await week.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
    const lastDay = page.locator('#week .wp-day').last()
    await lastDay.scrollIntoViewIfNeeded()
    await expect(lastDay).toHaveClass(/is-in/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
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
