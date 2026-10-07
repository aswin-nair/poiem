# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: appearance.spec.ts >> appearance follows the device until a saved choice overrides it
- Location: e2e\appearance.spec.ts:30:1

# Error details

```
Error: expect(locator).toBeChecked() failed

Locator:  getByRole('radio', { name: 'Light', exact: true })
Expected: checked
Received: unchecked
Timeout:  5000ms

Call log:
  - Expect "toBeChecked" with timeout 5000ms
  - waiting for getByRole('radio', { name: 'Light', exact: true })
    13 × locator resolved to <input type="radio" value="light" name="appearance-_r_2_"/>
       - unexpected value "unchecked"

```

```yaml
- radio "Light"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | import { birthdayYearsAgo, settlePageLayout, signUpAndOnboard } from './helpers'
  3   | 
  4   | type Theme = 'light' | 'dark'
  5   | 
  6   | async function fitsViewport(page: Page) {
  7   |   await settlePageLayout(page)
  8   |   const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)
  9   |   expect(overflow, `Horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1)
  10  | }
  11  | 
  12  | async function chooseAppearance(page: Page, name: 'Light' | 'Dark' | 'System') {
  13  |   const option = page.getByRole('radio', { name, exact: true })
  14  |   await option.check()
  15  |   await expect(option).toBeChecked()
  16  | }
  17  | 
  18  | async function expectTheme(page: Page, theme: Theme) {
  19  |   await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  20  |   await expect(page.locator('html')).toHaveCSS('color-scheme', theme)
  21  | }
  22  | 
  23  | test.beforeEach(async ({ page, baseURL }) => {
  24  |   // These journeys create local test accounts only, even if an existing dev
  25  |   // server was accidentally started in cloud mode.
  26  |   expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/)
  27  |   await page.route('**/api/**', route => route.abort('blockedbyclient'))
  28  | })
  29  | 
  30  | test('appearance follows the device until a saved choice overrides it', async ({ page }) => {
  31  |   await page.emulateMedia({ colorScheme: 'dark' })
  32  |   await page.goto('/onboarding')
  33  |   await expectTheme(page, 'dark')
  34  |   await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
  35  | 
  36  |   await page.emulateMedia({ colorScheme: 'light' })
  37  |   await expectTheme(page, 'light')
  38  |   await chooseAppearance(page, 'Dark')
  39  |   await expectTheme(page, 'dark')
  40  |   await expect.poll(() => page.evaluate(() => localStorage.getItem('fud-appearance-v1'))).toBe('dark')
  41  |   await page.reload()
  42  |   await expectTheme(page, 'dark')
  43  |   await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
  44  |   await page.goto('/login')
  45  |   await expectTheme(page, 'dark')
  46  |   await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
  47  | 
  48  |   // Native radio keyboard navigation must change both the selection and theme.
  49  |   await page.getByRole('radio', { name: 'Dark', exact: true }).focus()
  50  |   await page.keyboard.press('ArrowLeft')
> 51  |   await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
      |                                                                         ^ Error: expect(locator).toBeChecked() failed
  52  |   await expectTheme(page, 'light')
  53  |   await chooseAppearance(page, 'System')
  54  |   await page.emulateMedia({ colorScheme: 'dark' })
  55  |   await expectTheme(page, 'dark')
  56  |   await page.reload()
  57  |   await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
  58  |   await expectTheme(page, 'dark')
  59  | })
  60  | 
  61  | for (const width of [320, 390]) {
  62  |   test(`${width}px age recovery stays accessible in dark mode with reduced motion`, async ({ page }, testInfo) => {
  63  |     await page.setViewportSize({ width, height: 844 })
  64  |     await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  65  |     await page.goto('/onboarding')
  66  |     await expectTheme(page, 'dark')
  67  |     await fitsViewport(page)
  68  |     await page.getByRole('button', { name: 'Get started', exact: true }).click()
  69  |     await expect(page.getByRole('heading', { name: 'What is your date of birth?' })).toBeFocused()
  70  |     await fitsViewport(page)
  71  |     const transitionDurations = await page.locator('.pressable-face').evaluateAll(elements => elements.flatMap(element => getComputedStyle(element).transitionDuration.split(',').map(parseFloat)))
  72  |     expect(transitionDurations.length).toBeGreaterThan(0)
  73  |     expect(Math.max(...transitionDurations)).toBeLessThanOrEqual(.01)
  74  |     await page.getByLabel('Date of birth').fill(birthdayYearsAgo(17))
  75  |     await page.getByRole('button', { name: 'Continue', exact: true }).click()
  76  |     await expect(page.getByRole('heading', { name: 'This one is built for adults' })).toBeVisible()
  77  |     await expectTheme(page, 'dark')
  78  |     await fitsViewport(page)
  79  |     await chooseAppearance(page, 'Light')
  80  |     await expectTheme(page, 'light')
  81  |     await chooseAppearance(page, 'Dark')
  82  |     await page.screenshot({ path: testInfo.outputPath(`age-recovery-dark-${width}.png`), fullPage: true, animations: 'disabled' })
  83  |     await page.getByRole('button', { name: 'Change date of birth', exact: true }).click()
  84  |     await expect(page.getByLabel('Date of birth')).toHaveValue(birthdayYearsAgo(17))
  85  |     await page.getByLabel('Date of birth').fill(birthdayYearsAgo(25))
  86  |     await page.getByRole('button', { name: 'Continue', exact: true }).click()
  87  |     await expect(page.getByRole('heading', { name: 'About you', exact: true })).toBeVisible()
  88  |     await fitsViewport(page)
  89  |   })
  90  | }
  91  | 
  92  | for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  93  |   for (const theme of ['light', 'dark'] as const) {
  94  |     test(`welcome and setup remain clear in ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
  95  |       await page.setViewportSize(viewport)
  96  |       await page.emulateMedia({ colorScheme: theme })
  97  |       await page.goto('/onboarding')
  98  |       await expectTheme(page, theme)
  99  |       await expect(page.getByRole('button', { name: 'Get started', exact: true })).toBeVisible()
  100 |       await fitsViewport(page)
  101 |       await page.screenshot({ path: testInfo.outputPath(`welcome-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
  102 |       await page.getByRole('button', { name: 'Get started', exact: true }).click()
  103 |       await expect(page.getByRole('heading', { name: 'What is your date of birth?' })).toBeVisible()
  104 |       await fitsViewport(page)
  105 |       await page.screenshot({ path: testInfo.outputPath(`setup-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
  106 |     })
  107 |   }
  108 | 
  109 |   test(`the five main pages keep the selected appearance at ${viewport.width}px`, async ({ page }, testInfo) => {
  110 |     test.setTimeout(120_000)
  111 |     await page.setViewportSize(viewport)
  112 |     await page.emulateMedia({ colorScheme: 'light' })
  113 |     const errors: string[] = []
  114 |     page.on('pageerror', error => errors.push(error.message))
  115 |     await signUpAndOnboard(page)
  116 | 
  117 |     for (const theme of ['dark', 'light'] as const) {
  118 |       await page.goto('/settings')
  119 |       await chooseAppearance(page, theme === 'dark' ? 'Dark' : 'Light')
  120 |       for (const [name, path] of [['today', '/'], ['log', '/log'], ['saved', '/discover'], ['insights', '/progress'], ['you', '/settings']]) {
  121 |         await test.step(`${name} in ${theme}`, async () => {
  122 |           await page.goto(path)
  123 |           await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  124 |           await expectTheme(page, theme)
  125 |           await fitsViewport(page)
  126 |           await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
  127 |         })
  128 |       }
  129 |     }
  130 |     expect(errors).toEqual([])
  131 |   })
  132 | }
  133 | 
```