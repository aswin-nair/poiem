import { expect, test, type Page } from '@playwright/test'
import { birthdayYearsAgo, settlePageLayout, signUpAndOnboard } from './helpers'

type Theme = 'light' | 'dark'

async function fitsViewport(page: Page) {
  await settlePageLayout(page)
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)
  expect(overflow, `Horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1)
}

async function chooseAppearance(page: Page, name: 'Light' | 'Dark' | 'System') {
  const option = page.getByRole('radio', { name, exact: true })
  await option.check()
  await expect(option).toBeChecked()
}

async function expectTheme(page: Page, theme: Theme) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await expect(page.locator('html')).toHaveCSS('color-scheme', theme)
}

test.beforeEach(async ({ page, baseURL }) => {
  // These journeys create local test accounts only, even if an existing dev
  // server was accidentally started in cloud mode.
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/)
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
})

test('appearance follows the device until a saved choice overrides it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/onboarding')
  await expectTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()

  await page.emulateMedia({ colorScheme: 'light' })
  await expectTheme(page, 'light')
  await chooseAppearance(page, 'Dark')
  await expectTheme(page, 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fud-appearance-v1'))).toBe('dark')
  await page.reload()
  await expectTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
  await page.goto('/login')
  await expectTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()

  // Native radio keyboard navigation must change both the selection and theme.
  await page.getByRole('radio', { name: 'Dark', exact: true }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
  await expectTheme(page, 'light')
  await chooseAppearance(page, 'System')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expectTheme(page, 'dark')
  await page.reload()
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
  await expectTheme(page, 'dark')
})

for (const width of [320, 390]) {
  test(`${width}px age recovery stays accessible in dark mode with reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.goto('/onboarding')
    await expectTheme(page, 'dark')
    await fitsViewport(page)
    await page.getByRole('button', { name: 'Get started', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'What is your date of birth?' })).toBeFocused()
    await fitsViewport(page)
    const transitionDurations = await page.locator('.pressable-face').evaluateAll(elements => elements.flatMap(element => getComputedStyle(element).transitionDuration.split(',').map(parseFloat)))
    expect(transitionDurations.length).toBeGreaterThan(0)
    expect(Math.max(...transitionDurations)).toBeLessThanOrEqual(.01)
    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(17))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'This one is built for adults' })).toBeVisible()
    await expectTheme(page, 'dark')
    await fitsViewport(page)
    await chooseAppearance(page, 'Light')
    await expectTheme(page, 'light')
    await chooseAppearance(page, 'Dark')
    await page.screenshot({ path: testInfo.outputPath(`age-recovery-dark-${width}.png`), fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Change date of birth', exact: true }).click()
    await expect(page.getByLabel('Date of birth')).toHaveValue(birthdayYearsAgo(17))
    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(25))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'About you', exact: true })).toBeVisible()
    await fitsViewport(page)
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`welcome and setup remain clear in ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ colorScheme: theme })
      await page.goto('/onboarding')
      await expectTheme(page, theme)
      await expect(page.getByRole('button', { name: 'Get started', exact: true })).toBeVisible()
      await fitsViewport(page)
      await page.screenshot({ path: testInfo.outputPath(`welcome-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
      await page.getByRole('button', { name: 'Get started', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'What is your date of birth?' })).toBeVisible()
      await fitsViewport(page)
      await page.screenshot({ path: testInfo.outputPath(`setup-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
    })
  }

  test(`the five main pages keep the selected appearance at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    await page.emulateMedia({ colorScheme: 'light' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await signUpAndOnboard(page)

    for (const theme of ['dark', 'light'] as const) {
      await page.goto('/settings')
      await chooseAppearance(page, theme === 'dark' ? 'Dark' : 'Light')
      for (const [name, path] of [['today', '/'], ['log', '/log'], ['saved', '/discover'], ['insights', '/progress'], ['you', '/settings']]) {
        await test.step(`${name} in ${theme}`, async () => {
          await page.goto(path)
          // The log sheet is a modal: the Today heading behind it is hidden from the accessibility tree
          // the moment it opens, so the sheet is the landmark there. Cold route chunks get a longer wait.
          const landmark = path === '/log'
            ? page.getByRole('dialog', { name: 'Log a meal' })
            : page.getByRole('heading', { level: 1 }).first()
          await expect(landmark).toBeVisible({ timeout: 15_000 })
          await expectTheme(page, theme)
          await fitsViewport(page)
          await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
        })
      }
    }
    expect(errors).toEqual([])
  })
}
