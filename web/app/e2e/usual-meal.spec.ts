import { expect, test } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

// The seed clock stands at 20:00 UTC on 19 September, which is "today" below.
test.use({ timezoneId: 'UTC', locale: 'en-GB' })

const day = (offset: number) => {
  const date = new Date(Date.UTC(2026, 8, 19 - offset, 8, 0))
  return { timestamp: date.toISOString(), localDate: date.toISOString().slice(0, 10) }
}

function stateWithHistory() {
  const state = visualSeedState()
  const base = { calories: 320, protein: 12, carbs: 52, fat: 8, source: 'manual' as const }
  // Oats for breakfast on three earlier days, a single lunch, and nothing logged today.
  state.foodEntries = [
    { id: 'h1', name: 'Overnight oats', emoji: '🥣', mealType: 'breakfast', ...base, ...day(1) },
    { id: 'h2', name: 'Overnight oats', emoji: '🥣', mealType: 'breakfast', ...base, ...day(2) },
    { id: 'h3', name: 'Overnight oats', emoji: '🥣', mealType: 'breakfast', ...base, ...day(4) },
    { id: 'h4', name: 'Chicken bowl', emoji: '🍗', mealType: 'lunch', ...base, calories: 540, ...day(1) },
  ]
  return state
}

test.describe('Your usual on an empty slot', () => {
  test.beforeEach(async ({ page }) => {
    await applyVisualSeed(page, stateWithHistory())
    await page.goto('/')
    await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
  })

  test('offers the habitual meal only where a habit exists, with no calories on it', async ({ page }) => {
    const usual = page.getByRole('button', { name: 'Log Overnight oats again to Breakfast' })
    await expect(usual).toBeVisible()
    const row = page.locator('.k-usual-row')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Your usual')
    await expect(row).not.toContainText(/kcal|\d{3}/)
    // The lunch was logged on one day only, so it is not a habit.
    await expect(page.getByRole('button', { name: /Log Chicken bowl again/ })).toHaveCount(0)
  })

  test('one tap logs it to that slot and the offer goes away', async ({ page }) => {
    await page.getByRole('button', { name: 'Log Overnight oats again to Breakfast' }).click()

    const breakfast = page.getByRole('region', { name: 'Breakfast' })
    await expect(breakfast.getByRole('button', { name: /Overnight oats/ })).toBeVisible()
    await expect(page.locator('.k-usual-row')).toHaveCount(0)
    await expect(page.getByText('1 meal · 320 kcal')).toBeVisible()
  })

  test('is only for today', async ({ page }) => {
    await page.getByRole('button', { name: /^Friday 18 September/ }).click()
    await expect(page.locator('.k-usual-row')).toHaveCount(0)
  })
})
