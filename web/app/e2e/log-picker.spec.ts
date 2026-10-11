import { expect, test } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

for (const width of [320, 390, 1440] as const) {
  test(`logging choices are visible on arrival at ${width}px without focusing search`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.route('**/api/**', route => route.abort('blockedbyclient'))
    await applyVisualSeed(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Add snack', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
    const methods = sheet.getByRole('navigation', { name: 'Ways to log', exact: true })
    await expect(sheet.locator('.k-log-for')).toContainText('Snack')
    await expect(sheet.locator('.k-log-for')).toContainText('Today')
    await expect(sheet.getByRole('textbox')).not.toBeFocused()
    for (const name of ['Snap a photo', 'Describe your meal', 'Manual entry', 'Saved meals']) {
      const method = methods.getByRole('link', { name, exact: true })
      await expect(method).toBeInViewport({ ratio: 1 })
      const box = await method.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    const methodBox = await methods.boundingBox()
    const recentBox = await sheet.locator('.k-picks').boundingBox()
    expect(methodBox!.y + methodBox!.height).toBeLessThan(recentBox!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await methods.getByRole('link', { name: 'Manual entry', exact: true }).click()
    await expect(page.getByRole('group', { name: 'Meal type', exact: true }).getByRole('button', { name: 'Snack', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Logging to Snack · Today', { exact: true })).toBeVisible()
  })
}

test('three recent shortcuts expand and hidden recents remain searchable', async ({ page }) => {
  const state = visualSeedState()
  state.foodEntries.push({
    ...state.foodEntries[0], id: 'older-toast', name: 'Earlier avocado toast',
    timestamp: '2026-09-18T08:00:00.000Z', localDate: '2026-09-18',
  })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page, state)
  await page.goto('/log')
  const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
  await expect(sheet.getByRole('article')).toHaveCount(3)
  await sheet.getByRole('button', { name: 'Show 1 more', exact: true }).click()
  await expect(sheet.getByRole('article')).toHaveCount(4)
  await sheet.getByRole('button', { name: 'Show fewer meals', exact: true }).click()
  await expect(sheet.getByRole('article')).toHaveCount(3)
  await sheet.getByRole('textbox').fill('avocado')
  await expect(sheet.getByRole('article')).toHaveCount(1)
  const result = sheet.getByRole('article', { name: 'Earlier avocado toast', exact: true })
  await expect(result).toHaveAccessibleDescription(/Logging to .* · Today/)
  await expect(result.getByRole('button', { name: /^Log Earlier avocado toast, 1 times your previous meal to / })).toBeVisible()
  await sheet.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(sheet.getByRole('article')).toHaveCount(3)
})
