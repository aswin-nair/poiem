import { expect, test } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', viewport: { width: 390, height: 844 } })

test('an archived day opens the correct journal and can return to today', async ({ page }) => {
  const state = visualSeedState()
  state.foodEntries.push({
    id: 'archive-september-18', name: 'Archived lentil soup', calories: 220,
    protein: 14, carbs: 30, fat: 5, mealType: 'dinner', source: 'manual',
    timestamp: '2026-09-18T18:00:00.000Z', localDate: '2026-09-18',
  })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page, state)
  await page.goto('/progress')
  const archive = page.locator('details.insights-more').filter({ has: page.getByRole('heading', { name: 'Ticket archive', exact: true }) })
  await archive.locator('summary').click()
  const dayLabel = await page.evaluate(() => new Date('2026-09-18T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }))
  await archive.getByRole('link', { name: `Open journal for ${dayLabel}`, exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Archived lentil soup/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Overnight oats/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add dinner', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Water and notes', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Overnight oats/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Archived lentil soup/ })).toHaveCount(0)
})

test('completed ring details expand with the keyboard while retaining the step count', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
  await page.goto('/')
  const ring = page.getByRole('region', { name: 'Your day', exact: true })
  const details = ring.locator('.k-ring-details')
  const legend = ring.locator('.k-ring-legend')
  await expect(ring.getByRole('img')).toHaveAccessibleName('1 of 1 chosen steps complete')
  await expect(details).not.toHaveAttribute('open')
  await expect(legend).toBeHidden()
  const summary = details.locator('summary')
  await expect(summary).toHaveText('Chosen steps complete Details')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('open', '')
  await expect(legend).toBeVisible()
  await expect(legend.locator('li')).toHaveCount(3)
  await expect(ring.getByRole('img')).toHaveAccessibleName('1 of 1 chosen steps complete')
  await page.keyboard.press('Enter')
  await expect(legend).toBeHidden()
  await expect(summary).toBeFocused()
})

test('phone Today places Meals before Water with no horizontal overflow', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
  await page.goto('/')
  const meals = page.getByRole('region', { name: 'Meals', exact: true })
  const water = page.getByRole('region', { name: 'Water and notes', exact: true })
  await expect(meals).toBeVisible()
  await expect(water).toBeVisible()
  const mealsBox = await meals.boundingBox()
  const waterBox = await water.boundingBox()
  expect(mealsBox).not.toBeNull()
  expect(waterBox).not.toBeNull()
  expect(mealsBox!.y + mealsBox!.height).toBeLessThanOrEqual(waterBox!.y)
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(width.content).toBeLessThanOrEqual(width.viewport)
  const addWater = water.getByRole('button', { name: 'Add a glass of water', exact: true })
  await addWater.click()
  await expect(water.getByRole('group', { name: 'Water glasses' })).toContainText('4/8')
})
