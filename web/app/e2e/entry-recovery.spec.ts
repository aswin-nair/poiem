import { expect, test } from '@playwright/test'
import { settlePageLayout } from './helpers'

test('public entry offers setup and returning-member paths on small phones', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/welcome')
    await settlePageLayout(page)
    const returning = page.getByRole('link', { name: 'Already a member? Sign in' })
    await expect(returning).toBeVisible()
    await expect(returning).toHaveAttribute('href', '/login?mode=signin')
    const actions = await page.locator('.wp-actions').first().boundingBox()
    const firstStep = await page.locator('.wp-first-route li').first().boundingBox()
    expect(firstStep!.y - (actions!.y + actions!.height)).toBeGreaterThanOrEqual(16)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  }
  await page.getByRole('link', { name: 'Already a member? Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back!', exact: true })).toBeVisible()
})

test('setup sign-in and account recovery keep a safe route back', async ({ page }) => {
  await page.goto('/login?setup=1&token=private-token&email=private-email')
  await expect(page.getByRole('complementary', { name: 'Your unfinished setup' })).toContainText('Your setup is kept on this device.')
  await expect(page.getByRole('link', { name: 'Back to setup' })).toHaveAttribute('href', '/onboarding')
  await page.goto('/forgot-password?setup=1&token=private-token&email=private-email')
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login?setup=1')
  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await expect(page).toHaveURL(/\/login\?setup=1$/)
})

test('phone account forms precede the poster and returning-member fields fit the first view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/login', '/login?setup=1', '/login?mode=signup&claim=1']) {
    await page.goto(route)
    await settlePageLayout(page)
    const form = await page.locator('.k-account-card').boundingBox()
    const poster = await page.locator('.k-account-poster').boundingBox()
    expect(form!.y + form!.height).toBeLessThanOrEqual(poster!.y)
    if (route === '/login') {
      await expect(page.getByLabel('Email', { exact: true })).toBeInViewport()
      await expect(page.getByLabel('Password', { exact: true })).toBeInViewport()
    }
  }
})

test('reset email failures are focused and retrying retains the address', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/auth?action=forgot-password', async route => {
    attempts++
    await route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { error: 'Please try again shortly.' } : { ok: true } })
  })
  await page.goto('/forgot-password?claim=1')
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('alert')).toHaveText('Please try again shortly.')
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('synthetic@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.locator('.k-account-recovery-status')).toContainText('Check your inbox and spam folder.')
  await expect(page.locator('.k-account-recovery-status')).toBeFocused()
  await page.getByRole('button', { name: 'Change email' }).click()
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('synthetic@example.test')
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused()
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login?claim=1')
  expect(attempts).toBe(2)
})

test('missing, mismatched and expired reset links all have a usable next step', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/auth?action=reset-password', async route => {
    attempts++
    await route.fulfill({ status: 400, json: { error: 'This reset link is invalid or has expired.' } })
  })
  await page.goto('/reset-password?setup=1')
  await expect(page.locator('form')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password?setup=1')
  await page.goto('/reset-password?token=synthetic-expired&setup=1')
  await page.getByLabel('New password', { exact: true }).fill('Synthetic123!')
  await page.getByLabel('Confirm password', { exact: true }).fill('Different123!')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match')
  await expect(page.getByRole('alert')).toBeFocused()
  expect(attempts).toBe(0)
  await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic123!')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid or has expired')
  await expect(page.getByRole('alert')).toBeFocused()
  await page.getByRole('link', { name: 'Request a new reset link' }).click()
  await expect(page).toHaveURL(/\/forgot-password\?setup=1$/)
  expect(attempts).toBe(1)
})

test('successful reset returns to sign-in without forwarding the reset token', async ({ page }) => {
  await page.route('**/api/auth?action=reset-password', async route => {
    expect(route.request().postDataJSON()).toEqual({ token: 'synthetic-only', password: 'Synthetic123!' })
    await route.fulfill({ json: { ok: true } })
  })
  await page.goto('/reset-password?token=synthetic-only&claim=1&setup=1')
  await page.getByLabel('New password', { exact: true }).fill('Synthetic123!')
  await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic123!')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page).toHaveURL(/\/login\?claim=1&setup=1&passwordUpdated=1$/)
  await expect(page.getByRole('status').filter({ hasText: 'Password updated.' })).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
})

test('account recovery remains readable with enlarged text and landscape height', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 740 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const route of ['/login?setup=1', '/forgot-password?claim=1', '/reset-password?token=synthetic&setup=1']) {
      await page.goto(route)
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      await settlePageLayout(page)
      expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1)
      const action = page.getByRole('link', { name: 'Back to sign in' }).or(page.getByRole('link', { name: 'Back to setup' }))
      await action.scrollIntoViewIfNeeded()
      await action.focus()
      await expect(action).toBeFocused()
    }
  }
})
