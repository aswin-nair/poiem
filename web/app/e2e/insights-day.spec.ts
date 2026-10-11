import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', viewport: { width: 390, height: 844 } })

function inspectionState() {
  const state = visualSeedState()
  state.foodEntries.push(
    { id: 'zero', name: 'Zero calorie tea', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'manual', mealType: 'snack', timestamp: '2026-09-18T12:00:00.000Z', localDate: '2026-09-18' },
    // The saved journal day takes priority over a timestamp across a travel boundary.
    { id: 'travel', name: 'Travel lentil soup', calories: 220, protein: 14, carbs: 30, fat: 5, source: 'manual', mealType: 'dinner', timestamp: '2026-09-19T00:20:00.000Z', localDate: '2026-09-17' },
    { id: 'old', name: 'Older toast', calories: 100, protein: 3, carbs: 20, fat: 1, source: 'manual', mealType: 'breakfast', timestamp: '2026-08-25T08:00:00.000Z', localDate: '2026-08-25' },
  )
  return state
}

async function openInsights(page: Page, state = inspectionState()) {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page, state)
  await page.goto('/progress')
  await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible()
}

test('reports named weekly values and distinguishes logged zeroes from unknown intake', async ({ page }) => {
  await openInsights(page)
  const week = page.getByRole('region', { name: 'Your week', exact: true })
  await expect(week).toContainText('3 of 7 days logged')
  await expect(week).toContainText('5 meals saved in your journal')
  await expect(week).toContainText(/Sep.*13.*2026.*Sep.*19.*2026|13.*Sep.*2026.*19.*Sep.*2026/)
  await expect(page.getByText('Avg 453 kcal', { exact: true })).toBeVisible()
  await expect(page.getByText('Average uses 3 logged days only. An unlogged day has no known intake.', { exact: true })).toBeVisible()
  const inspector = page.locator('.insights-day-inspector')
  await page.getByLabel('Inspect a day', { exact: true }).selectOption('2026-09-18')
  await expect(inspector).toContainText('0 kcal logged')
  await expect(inspector).toContainText('1 meal')
  await expect(inspector).not.toContainText('unknown')
  await page.getByLabel('Inspect a day', { exact: true }).selectOption('2026-09-16')
  await expect(inspector).toContainText('No meals logged. This day’s intake is unknown.')
  await expect(inspector).not.toContainText('0 kcal')
  const table = page.getByRole('table').filter({ has: page.locator('caption', { hasText: 'Calories by day' }) })
  await expect(table.getByRole('row', { name: /September 18.*0$/ })).toHaveCount(1)
  await expect(table.getByRole('row', { name: /September 16.*Not logged$/ })).toHaveCount(1)
})

test('selects chart days with keyboard controls and preserves or clamps selection when the range changes', async ({ page }) => {
  await openInsights(page)
  const dayPicker = page.getByLabel('Inspect a day', { exact: true })
  const todayBar = page.getByRole('button', { name: /^Inspect Saturday, September 19, 2026:/ })
  await todayBar.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(dayPicker).toHaveValue('2026-09-18')
  await expect(page.getByRole('button', { name: /^Inspect Friday, September 18, 2026:/ })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(dayPicker).toHaveValue('2026-09-13')
  await page.keyboard.press('End')
  await expect(dayPicker).toHaveValue('2026-09-19')
  await dayPicker.selectOption('2026-09-17')
  await page.getByRole('button', { name: 'Month', exact: true }).click()
  await expect(dayPicker).toHaveValue('2026-09-17')
  await expect(dayPicker.locator('option')).toHaveCount(30)
  await expect(page.getByText('Last 30 days · Applies to the two charts below.', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your week', exact: true })).toContainText('3 of 7 days logged')
  await dayPicker.selectOption('2026-08-25')
  await expect(page.locator('.insights-day-inspector')).toContainText('100 kcal logged')
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(dayPicker).toHaveValue('2026-09-19')
  await expect(dayPicker.locator('option')).toHaveCount(7)
})

test('opens the inspected stored journal day and returns to Today with repeat destinations intact', async ({ page }) => {
  await openInsights(page)
  await page.getByRole('button', { name: /^Inspect Thursday, September 17, 2026:/ }).click()
  await expect(page.locator('.insights-day-inspector')).toContainText('220 kcal logged')
  await page.getByRole('link', { name: /^Open this day: Thursday, September 17, 2026$/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: /^Travel lentil soup/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Overnight oats/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add dinner', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Overnight oats/ })).toBeVisible()
  await page.getByTestId('fab').click()
  await expect(page.locator('.k-log-for')).toContainText(/Logging to.*Today/)
})

test('touch can inspect a chart day in dark Calm mode without page overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'UTC', reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('fud-appearance-v1', 'dark'))
  await openInsights(page)
  await page.getByRole('button', { name: /^Inspect Friday, September 18, 2026:/ }).tap()
  await expect(page.locator('.insights-day-inspector')).toContainText('0 kcal logged')
  await page.getByRole('button', { name: 'Inspect previous day', exact: true }).tap()
  await expect(page.getByLabel('Inspect a day', { exact: true })).toHaveValue('2026-09-17')
  await expect(page.locator('.insights-day-inspector')).toContainText('220 kcal logged')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('.insights-day-inspector').evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.locator('.insights-day-inspector').screenshot({ path: 'artifacts/ongoing-insights/inspector-390-dark.png' })
  await context.close()
})

for (const width of [320, 390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`empty history remains inspectable with 44px controls at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.addInitScript(value => localStorage.setItem('fud-appearance-v1', value), theme)
      const state = visualSeedState()
      state.foodEntries = []
      state.weightEntries = []
      await openInsights(page, state)
      await expect(page.getByRole('region', { name: 'Your week', exact: true })).toContainText('0 of 7 days logged')
      await expect(page.locator('.insights-day-inspector')).toContainText('intake is unknown')
      await expect(page.getByText('No logged days', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Month', exact: true }).click()
      await expect(page.getByLabel('Inspect a day', { exact: true }).locator('option')).toHaveCount(30)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      for (const control of [page.getByLabel('Inspect a day', { exact: true }), page.getByRole('link', { name: /^Open this day:/ }), page.getByRole('button', { name: /^Inspect Saturday, September 19, 2026:/ })]) {
        const bounds = await control.boundingBox()
        expect(bounds?.height).toBeGreaterThanOrEqual(44)
        expect(bounds?.width).toBeGreaterThanOrEqual(44)
      }
    })
  }
}
