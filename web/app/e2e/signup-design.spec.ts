import { expect, test } from '@playwright/test'

test('signup keeps its URL, password privacy, and validation feedback in sync', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/login?mode=signup&claim=1')
  await expect(page.getByRole('heading', { name: 'Join Poiem.' })).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Preview guest')
  await page.getByLabel('Email', { exact: true }).fill('preview@example.test')
  await page.getByLabel('Password', { exact: true }).fill('SamplePassword123')
  await expect(page.getByText('Eyes closed. Your password is your business.')).toBeVisible()
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByLabel('Confirm password', { exact: true }).fill('Mismatch123')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match')
  await expect(page.getByRole('alert')).toBeFocused()
  await page.locator('.auth-tabs').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/mode=signin&claim=1/)
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1440]) {
  test(`food-club signup stays readable in both themes at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width > 900 ? 1100 : 844 })
    await page.goto('/login?mode=signup')
    await expect(page.getByRole('heading', { name: 'Join Poiem.' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('radio', { name: theme, exact: true }).check()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Create account', exact: true }).scrollIntoViewIfNeeded()
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      expect(fits).toBe(true)
      const submit = page.getByRole('button', { name: 'Create account', exact: true })
      if (width < 900) {
        await page.evaluate(() => window.scrollTo(0, 0))
        const email = await page.getByLabel('Email', { exact: true }).boundingBox()
        const dock = await page.locator('.auth-submit-dock').boundingBox()
        expect(email, 'email field is on the page').not.toBeNull()
        expect(dock, 'submit stays after the fields at the top of the page').not.toBeNull()
        expect(dock!.y).toBeGreaterThan(email!.y + email!.height)
        await expect(page.locator('.auth-submit-dock')).not.toHaveCSS('position', 'fixed')
        await submit.scrollIntoViewIfNeeded()
        await expect(submit).toBeInViewport()
      } else {
        await expect(submit).toBeInViewport()
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: testInfo.outputPath(`signup-${theme.toLowerCase()}.png`), fullPage: true, animations: 'disabled' })
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Join Poiem.' })).toBeVisible()
    await expect(page.getByLabel('Email', { exact: true })).toBeEditable()
    if (width < 900) {
      await page.getByLabel('Name', { exact: true }).focus()
      for (const label of ['Email', 'Password']) {
        await page.keyboard.press('Tab')
        const input = page.getByLabel(label, { exact: true })
        await expect(input).toBeFocused()
        const bounds = await input.boundingBox()
        const dock = await page.locator('.auth-submit-dock').boundingBox()
        expect(bounds!.y + bounds!.height, `${label} stays above mobile submit`).toBeLessThanOrEqual(dock!.y)
      }
    }
    await page.getByLabel('Password', { exact: true }).fill('Ab1!')
    await expect(page.locator('.auth-password-strength-label')).toHaveText('Use at least 8 characters to continue.')
    await expect(page.locator('.auth-password-meter-bar.is-on')).toHaveCount(1)
    await expect(page.locator('.food-club-momo .momo-art')).toHaveAttribute('data-expression', 'sleepy')
    await page.getByLabel('Password', { exact: true }).fill('LongPassword123!')
    await page.getByLabel('Confirm password', { exact: true }).fill('LongPassword123!')
    await expect(page.getByRole('status')).toHaveText('Passwords match.')
    const contrast = await page.locator('.auth-password-match').evaluate(element => {
      const luminance = (value: string) => {
        const [r, g, b] = value.match(/[\d.]+/g)!.slice(0, 3).map(channel => {
          const c = Number(channel) / 255
          return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
        })
        return r * .2126 + g * .7152 + b * .0722
      }
      const fg = luminance(getComputedStyle(element).color)
      const bg = luminance(getComputedStyle(element.closest('.login-card')!).backgroundColor)
      return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05)
    })
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
}
