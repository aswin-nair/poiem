import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

// The seed's clock stands at 20:00 UTC on 19 September; the zone is pinned so midnight is four hours away.
// The locale is pinned too: the day labels below are written day-first.
test.use({ timezoneId: 'UTC', locale: 'en-GB' })

const FOUR_HOURS_FIVE_MINUTES = (4 * 60 + 5) * 60 * 1000

test.describe('Today across local midnight', () => {
  test('a tab left open on Today moves to the new day', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/')
    const header = page.locator('.k-today-header')
    await expect(header).toContainText('Saturday 19 September')
    await expect(page.getByRole('heading', { name: 'Today’s snapshot' })).toBeVisible()

    await page.clock.runFor(FOUR_HOURS_FIVE_MINUTES)

    await expect(header).toContainText('Sunday 20 September')
    // Still Today, with logging available, not yesterday under a "Back to today" button.
    await expect(page.getByRole('heading', { name: 'Today’s snapshot' })).toBeVisible()
    await expect(page.locator('.k-budget').getByRole('button', { name: 'Log a meal', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to today' })).toHaveCount(0)
  })

  test('a day the reader chose stays where it is when midnight passes', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/')
    const header = page.locator('.k-today-header')
    await page.getByRole('button', { name: /^Friday 18 September/ }).click()
    await expect(header).toContainText('Friday 18 September')

    await page.clock.runFor(FOUR_HOURS_FIVE_MINUTES)

    await expect(header).toContainText('Friday 18 September')
    await expect(page.getByRole('button', { name: 'Back to today' })).toBeVisible()
  })

  test('choosing today again follows the calendar once more', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/')
    const header = page.locator('.k-today-header')
    await page.getByRole('button', { name: /^Friday 18 September/ }).click()
    await expect(header).toContainText('Friday 18 September')
    await page.getByRole('button', { name: 'Back to today' }).click()
    await expect(header).toContainText('Saturday 19 September')

    await page.clock.runFor(FOUR_HOURS_FIVE_MINUTES)

    await expect(header).toContainText('Sunday 20 September')
  })
})
