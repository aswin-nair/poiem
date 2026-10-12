import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed } from './seed'

test.use({ timezoneId: 'UTC', locale: 'en-GB' })

async function openInsights(page: Page) {
  await applyVisualSeed(page)
  await page.goto('/progress')
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
}

const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).first().boundingBox()
  if (!found) throw new Error(`${selector} is not on screen`)
  return found
}

test.describe('Insights calorie chart', () => {
  test('names the goal and the day states in a key, and fits its axis to the goal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openInsights(page)
    const key = page.getByRole('list', { name: 'Chart key' })
    await expect(key).toBeVisible()
    await expect(key).toContainText(/Goal [\d,]+ kcal/)
    await expect(key).toContainText('Logged')
    await expect(key).toContainText('Not logged')
    // The old fixed ceiling put "4k" at the top of every chart; a 2,000 kcal goal needs 3k.
    const ticks = await page.locator('.progress-bar-chart text').allTextContents()
    expect(ticks).not.toContain('4k')
    expect(ticks).toContain('3k')
  })

  test('keeps the day inspector under the chart on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openInsights(page)
    const chart = await box(page, '.insights-calories-card .progress-chart-wrap')
    const inspector = await box(page, '.insights-calories-card .insights-day-inspector')
    expect(inspector.y).toBeGreaterThanOrEqual(chart.y + chart.height - 1)
  })

  test('leads with the calorie card at full width on desktop, inspector beside the chart', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openInsights(page)
    const card = await box(page, '.insights-calories-card')
    const chart = await box(page, '.insights-calories-card .progress-chart-wrap')
    const inspector = await box(page, '.insights-calories-card .insights-day-inspector')
    const weight = await box(page, '.insights-weight-group')
    expect(card.width).toBeGreaterThan(780)
    expect(inspector.x).toBeGreaterThanOrEqual(chart.x + chart.width - 1)
    expect(Math.abs(inspector.y - chart.y)).toBeLessThan(card.height)
    // The weight card and its history sit in a row below, not in a column beside it.
    expect(weight.y).toBeGreaterThanOrEqual(card.y + card.height - 1)
    expect(weight.width).toBeGreaterThan(780)
  })

  test('does not horizontally overflow at the 768 two-column width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await openInsights(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
