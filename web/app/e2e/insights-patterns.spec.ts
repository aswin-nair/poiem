import { expect, test } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

// The seed clock stands at 20:00 UTC on Saturday 19 September.
test.use({ timezoneId: 'UTC', locale: 'en-GB' })

function lunchesOn(days: number[]) {
  const state = visualSeedState()
  state.foodEntries = days.map((day, index) => {
    const at = new Date(Date.UTC(2026, 8, day, 12, 40))
    return {
      id: `p${index}`,
      name: ['Rice bowl', 'Soup', 'Salad', 'Wrap', 'Pasta', 'Curry', 'Fish'][index % 7],
      emoji: '🍽',
      calories: 500,
      protein: 20,
      carbs: 60,
      fat: 15,
      source: 'manual' as const,
      mealType: 'lunch' as const,
      timestamp: at.toISOString(),
      localDate: at.toISOString().slice(0, 10),
    }
  })
  return state
}

test.describe('Insights patterns', () => {
  test('say how someone logs once there are five logged days, and nothing about the numbers', async ({ page }) => {
    // Six lunches on six days (Mon 7 to Fri 11, then Mon 14), all at 12:40.
    await applyVisualSeed(page, lunchesOn([7, 8, 9, 10, 11, 14]))
    await page.goto('/progress')

    const patterns = page.getByRole('region', { name: 'Patterns' })
    await expect(patterns).toBeVisible()
    await expect(patterns.getByRole('listitem').first()).toHaveText('Lunch is usually around 12:40.')
    await expect(patterns).not.toContainText(/kcal|calorie|goal|protein|over|under/i)
  })

  test('stay out of the way until there is enough history', async ({ page }) => {
    await applyVisualSeed(page, lunchesOn([16, 17, 18]))
    await page.goto('/progress')
    await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Patterns' })).toHaveCount(0)
  })
})
