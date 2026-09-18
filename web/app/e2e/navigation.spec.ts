import { test, expect } from '@playwright/test'
import { clearAppStorage, nav, signUpAndOnboard } from './helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndOnboard(page)
  })

  test('bottom nav visits all tabs', async ({ page }) => {
    await nav(page).getByRole('link', { name: 'Saved' }).click()
    await expect(page).toHaveURL('/discover')
    await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible()

    await nav(page).getByRole('link', { name: 'Insights' }).click()
    await expect(page).toHaveURL('/progress')
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()

    await nav(page).getByRole('link', { name: 'You' }).click()
    await expect(page).toHaveURL('/settings')
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

    await page.getByRole('link', { name: 'About Poiem' }).click()
    await expect(page).toHaveURL('/about')
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()

    await nav(page).getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  })

  test('discover tab and you coach reach their full pages', async ({ page }) => {
    await nav(page).getByRole('link', { name: 'Saved' }).click()
    await expect(page).toHaveURL('/discover')
    await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible()

    await nav(page).getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL('/')

    await nav(page).getByRole('link', { name: 'You' }).click()
    await page.getByLabel('Chat with your coach').click()
    await expect(page).toHaveURL('/coach')
    await expect(page.getByText('AI Coach')).toBeVisible()
  })

  test('log FAB opens every logging method without requiring AI', async ({ page }) => {
    await page.getByTestId('fab').click()
    await expect(page).toHaveURL('/log')
    await expect(page.getByRole('link', { name: /Describe your meal/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Snap a photo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Saved meals/i })).toBeVisible()
    await page.getByRole('link', { name: /Manual entry/i }).click()
    await expect(page).toHaveURL(/\/log\/manual/)
  })

  test('photo logging has a useful no-key recovery path', async ({ page }) => {
    await page.getByTestId('fab').click()
    await page.getByRole('link', { name: /Snap a photo/i }).click()

    await expect(page).toHaveURL('/log/photo')
    await expect(page.getByRole('heading', { name: 'Temporarily unavailable' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Set up AI' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log manually' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tap to choose a photo' })).toHaveCount(0)
  })

  /* This asserted a return to onboarding until the sign-out trap was fixed: a
     device that has held an account belongs to someone coming back, so sending
     them through a seven-step rebuild of a profile they already have was wrong.
     The guest journey is still the default for a device that has never seen an
     account — covered by the test below. */
  test('sign out returns a known account to the login screen', async ({ page }) => {
    await nav(page).getByRole('link', { name: 'You' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('a device that has never held an account still starts at onboarding', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByRole('heading', { name: 'Meet Momo.' })).toBeVisible()
    await context.close()
  })

  test('onboarding always offers a way back to an existing account', async ({ page }) => {
    await clearAppStorage(page)
    await page.goto('/onboarding')
    await page.getByRole('link', { name: 'Already have an account? Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
