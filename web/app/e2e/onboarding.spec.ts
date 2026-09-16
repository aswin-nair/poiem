import { test, expect } from '@playwright/test'

import { birthdayYearsAgo, clearAppStorage, completeOnboarding, signUp } from './helpers'

test.describe('Onboarding activation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page)
  })

  test('lets a guest build and log before asking them to save progress', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.locator('.auth-form')).toHaveCount(0)

    await completeOnboarding(page, { meal: { name: 'Guest yogurt bowl' } })
    await expect(page.getByRole('heading', { name: 'Save your progress' })).toBeVisible()
    await expect(page.locator('.k-meal-row').filter({ hasText: 'Guest yogurt bowl' })).toBeVisible()
    await expect(page.getByLabel('Main')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('requires an explicit adult birthday and persists an under-age block', async ({ page }) => {
    await signUp(page)
    await page.getByRole('button', { name: 'Get started' }).click()

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Enter your date of birth to continue.')

    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(17))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'This one is built for adults' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'This one is built for adults' })).toBeVisible()
    await expect(page.getByLabel('Date of birth')).toHaveCount(0)
  })

  test('resumes the draft and activates only after a real first meal', async ({ page }) => {
    await signUp(page, { name: 'Activation User' })
    await page.getByRole('button', { name: 'Get started' }).click()

    // Exact eighteenth birthday is eligible.
    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(18))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your body' })).toBeVisible()
    await page.getByLabel('Height (cm)').fill('182')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Your body' })).toBeVisible()
    await expect(page.getByLabel('Height (cm)')).toHaveValue('182')

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Activity level' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose your pace' })).toBeVisible()
    await page.getByRole('button', { name: 'Regular' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your daily targets' })).toBeVisible()
    await expect(page.locator('.setup-daily-recipe')).toContainText('YOUR DAILY RECIPE')
    await expect(page.locator('.setup-daily-recipe')).toContainText('Made for Activation User.')
    await page.getByRole('button', { name: 'Continue to first meal' }).click()

    await page.getByLabel('Meal name').fill('Banana oat bowl')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Log your first meal' })).toBeVisible()
    await expect(page.getByLabel('Meal name')).toHaveValue('Banana oat bowl')

    await page.getByLabel('Calories', { exact: true }).fill('380')
    await page.getByLabel('Protein (g)').fill('14')
    await page.getByLabel('Carbs (g)').fill('62')
    await page.getByLabel('Fat (g)').fill('9')
    await page.getByRole('button', { name: 'Log first meal' }).click()

    await page.waitForURL('/')
    const celebration = page.getByRole('dialog', { name: 'Meal logged' })
    await expect(celebration).toContainText('Banana oat bowl')
    await celebration.getByRole('button', { name: 'Continue' }).click()
    await celebration.waitFor({ state: 'hidden' })
    await expect(page.locator('.k-meal-row').filter({ hasText: 'Banana oat bowl' })).toBeVisible()

    const draftKeys = await page.evaluate(() => (
      Object.keys(localStorage).filter(key => key.startsWith('fud-onboarding-draft-'))
    ))
    expect(draftKeys).toEqual([])
  })

  test('refuses a goal weight below BMI 18.5 before showing targets', async ({ page }) => {
    await signUp(page)
    await page.getByRole('button', { name: 'Get started' }).click()
    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(25))

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Your body' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible()

    await page.getByRole('button', { name: 'Lose Weight' }).click()
    await page.getByLabel('Goal weight (kg)').fill('50')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('below a healthy weight')
    await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible()

    await page.getByLabel('Goal weight (kg)').fill('60')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Activity level' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose your pace' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your daily targets' })).toBeVisible()
  })
})
