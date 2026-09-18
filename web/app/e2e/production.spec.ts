import { test, expect } from '@playwright/test'

/**
 * Smoke tests against the production build (base path /app/).
 * Runs in the "production" project defined in playwright.config.ts.
 */
test.describe('Production build', () => {
  test('Poiem metadata, manifest and branding images resolve under /app/', async ({ page, request }) => {
    await page.goto('/app/login?mode=signup')
    await expect(page).toHaveTitle('Sign up · Poiem')
    for (const path of ['favicon.svg', 'brand/poiem-icon-180.png', 'brand/poiem-social.png']) {
      const response = await request.get(`/app/${path}`)
      expect(response.ok()).toBe(true)
      expect(response.headers()['content-type']).toMatch(/image\//)
    }
    const response = await request.get('/app/manifest.webmanifest')
    expect(response.ok()).toBe(true)
    expect((await response.json()).name).toBe('Poiem')
  })
  test('app loads at /app/ and starts first-time guests in onboarding', async ({ page }) => {
    await page.goto('/app/')
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Meet Momo.' })).toBeVisible({ timeout: 15_000 })
  })

  test('client router works under /app/', async ({ page }) => {
    await page.goto('/app/login')
    await expect(page).toHaveURL(/\/app\/login/)
    await expect(page.getByRole('heading', { name: 'Welcome back!', exact: true })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Try Poiem first', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/onboarding/)
    await expect(page.getByRole('heading', { name: 'Meet Momo.' })).toBeVisible()
  })
})
