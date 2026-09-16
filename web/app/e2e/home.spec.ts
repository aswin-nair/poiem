import { test, expect } from '@playwright/test'
import { logManualMeal, signUpAndOnboard } from './helpers'

test.describe('Today & food logging', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndOnboard(page)
  })

  test('shows the day on the first screen: what is left, macros, meals and water', async ({ page }) => {
    await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
    await expect(page.getByText('kcal left')).toBeVisible()
    for (const macro of ['Protein', 'Carbs', 'Fat']) {
      await expect(page.getByRole('progressbar', { name: macro })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: /^Onboarding yogurt bowl/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log a meal', exact: true })).toHaveCount(1)
    // Streaks, levels and XP live on Insights.
    await expect(page.locator('.k-today-header')).not.toContainText(/streak|level/i)
    await expect(page.locator('.ticket')).toHaveCount(0)

    const water = page.getByRole('group', { name: 'Water glasses' })
    await water.getByRole('button', { name: 'Add a glass of water' }).click()
    await water.getByRole('button', { name: 'Add a glass of water' }).click()
    await expect(water).toContainText('2/8')
    await page.reload()
    await expect(page.getByRole('group', { name: 'Water glasses' })).toContainText('2/8')
  })

  test('streak, level and XP live on Insights', async ({ page }) => {
    await page.getByLabel('Main').getByRole('link', { name: 'Insights' }).click()
    const journey = page.getByRole('region', { name: 'Journey' })
    await expect(journey).toContainText('Day streak')
    await expect(journey).toContainText(/Level \d/)
    await expect(journey.getByRole('progressbar', { name: 'Progress to the next level' })).toBeVisible()
  })

  test('pause hides nutrition and engagement numbers on Today and Insights', async ({ page }) => {
    const mainNav = page.getByLabel('Main')
    await mainNav.getByRole('link', { name: 'You' }).click()

    const pauseRow = page.locator('.settings-row').filter({ hasText: 'Pause tracking' })
    await pauseRow.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Save settings' }).click()

    await mainNav.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('Tracking is paused')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Calories' })).toHaveCount(0)
    await expect(page.getByRole('progressbar', { name: 'Protein' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Onboarding yogurt bowl/ })).toHaveCount(0)

    await mainNav.getByRole('link', { name: 'Insights' }).click()
    await expect(page.getByRole('heading', { name: 'Tracking is paused' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Weight', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Calories', exact: true })).toHaveCount(0)
    await expect(page.locator('.progress-stat-value')).toHaveCount(0)
  })

  test('logs food via manual entry', async ({ page }) => {
    await logManualMeal(page, {
      name: 'Greek Yogurt',
      calories: '150',
      protein: '15',
      carbs: '8',
      fat: '4',
    })

    await expect(page.getByRole('button', { name: /^Greek Yogurt/ })).toBeVisible()
    await expect(page.locator('.k-meal-kcal', { hasText: '150' })).toBeVisible()
  })

  test('the log sheet opens over Today, closes back to it, and logs a recent meal in one tap', async ({ page }) => {
    const fab = page.getByTestId('fab')
    await fab.click()
    const sheet = page.getByRole('dialog', { name: 'Log a meal' })
    await expect(sheet).toBeVisible()
    await expect(page).toHaveURL('/log')
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(page).toHaveURL('/')
    await expect(fab).toBeFocused()

    const dinner = page.getByRole('region', { name: 'Dinner', exact: true })
    const before = await dinner.locator('.k-meal-row').count()
    await dinner.getByRole('button', { name: 'Add dinner' }).click()
    await expect(sheet.getByRole('button', { name: 'Dinner', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await sheet.getByRole('button', { name: /^Onboarding yogurt bowl/ }).click()
    await expect(page).toHaveURL('/')
    await expect(dinner.locator('.k-meal-row')).toHaveCount(before + 1)
    // The onboarding meal's own toast may still be up, so check the newest one.
    await expect(page.locator('.toast').filter({ hasText: 'Logged Onboarding yogurt bowl' }).last()).toBeVisible()
  })

  test('date picker keeps today calories after switching dates', async ({ page }) => {
    await logManualMeal(page, {
      name: 'Oatmeal',
      calories: '320',
      protein: '12',
      carbs: '54',
      fat: '6',
    })

    await expect(page.getByRole('button', { name: /^Oatmeal/ })).toBeVisible()

    const yesterdayLabel = await page.evaluate(() => {
      const date = new Date()
      date.setDate(date.getDate() - 1)
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    })
    const needsPrevMonth = await page.evaluate(() => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const today = new Date()
      return yesterday.getMonth() !== today.getMonth()
    })
    await page.getByRole('button', { name: 'Choose date', exact: true }).click()
    if (needsPrevMonth) {
      await page.getByRole('button', { name: 'Previous month' }).click()
    }
    await page.getByRole('button', { name: yesterdayLabel }).click()
    await expect(page.getByRole('button', { name: /^Oatmeal/ })).toHaveCount(0)
    await expect(page.getByText('Yesterday’s snapshot')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
    await expect(page.getByText('Nothing was logged yesterday.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to today', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Choose date', exact: true }).click()
    await page.getByRole('button', { name: 'Jump to today' }).click()
    await expect(page.getByRole('button', { name: /^Oatmeal/ })).toBeVisible()
  })

  test('log FAB reaches every option from the log sheet', async ({ page }) => {
    await page.getByTestId('fab').click()
    await expect(page).toHaveURL('/log')
    await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Describe your meal/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Snap a photo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Saved meals/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Manual entry/i })).toBeVisible()
  })

  test('a later meal confirms with a toast and Undo instead of the full-screen moment', async ({ page }) => {
    // The onboarding meal was the day's first and already had its celebration.
    await logManualMeal(page, {
      name: 'Toast Test Meal',
      calories: '420',
      protein: '22',
      carbs: '45',
      fat: '10',
    })

    await expect(page.getByRole('dialog', { name: 'Meal logged' })).toHaveCount(0)
    const toast = page.locator('.toast').filter({ hasText: 'Logged Toast Test Meal' })
    await expect(toast).toBeVisible()
    await expect(page.getByRole('button', { name: /^Toast Test Meal/ })).toBeVisible()
    await toast.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Toast Test Meal/ })).toHaveCount(0)
  })
})
