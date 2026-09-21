import { test, expect } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`loading mark stays centered in its ring at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => sessionStorage.removeItem('poiem-splash-seen'))
    await page.goto('/')
    const ring = page.locator('.splash-ring-wrap')
    await expect(ring).toBeVisible({ timeout: 4000 })
    const markBox = await ring.locator('.poiem-logo--mark').boundingBox()
    const ringBox = await ring.boundingBox()
    expect(markBox).not.toBeNull()
    expect(ringBox).not.toBeNull()
    expect(Math.abs(markBox!.x + markBox!.width / 2 - ringBox!.x - ringBox!.width / 2)).toBeLessThanOrEqual(1)
    expect(Math.abs(markBox!.y + markBox!.height / 2 - ringBox!.y - ringBox!.height / 2)).toBeLessThanOrEqual(1)
  })
}

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Poiem entry screens at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(value => localStorage.setItem('fud-appearance-v1', value), theme)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      for (const route of ['/login?mode=signup&claim=1', '/onboarding']) {
        await page.goto(route)
        const logo = page.locator('.welcome-brand .poiem-logo')
        await expect(logo).toBeVisible()
        await expect(page).toHaveTitle(route.includes('login') ? 'Sign up · Poiem' : 'Get started · Poiem')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', theme === 'dark' ? '#191B1A' : '#FFF8EB')
        const box = await logo.boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(96)
        expect(box!.height).toBeGreaterThan(25)
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
        await expect(page.locator('body')).not.toContainText('Fud AI')
        if (width === 390 || width === 1440) {
          await page.screenshot({ path: testInfo.outputPath(`${route.includes('login') ? 'signup' : 'welcome'}-${theme}.png`), fullPage: true })
        }
      }
      expect(errors).toEqual([])
    })
  }
}

test('account mode updates the tab title and recovery screens keep the brand', async ({ page }) => {
  await page.goto('/login?mode=signin')
  await expect(page).toHaveTitle('Sign in · Poiem')
  await page.locator('.auth-tabs').getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page).toHaveTitle('Sign up · Poiem')
  await page.goto('/forgot-password')
  await expect(page.getByRole('img', { name: 'Poiem', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Forgot password · Poiem')
  await page.goto('/reset-password')
  await expect(page.getByRole('img', { name: 'Poiem', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Reset password · Poiem')
})

test('brand kit is responsive and every downloadable image resolves', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/brand/index.html')
  await expect(page.getByRole('heading', { name: 'A little tracking. A lot of living.' })).toBeVisible()
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  for (const link of await page.locator('a[download]').all()) {
    const href = await link.getAttribute('href')
    const response = await request.get(`/brand/${href}`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/image\//)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('brand-kit.png'), fullPage: true })
})
