import { expect, test, type Page } from '@playwright/test'
import { signUpAndOnboard } from './helpers'

async function jump(page: Page, query: string, result: RegExp) {
  const finder = page.getByRole('search', { name: 'Find settings' })
  await finder.getByRole('searchbox').fill(query)
  await finder.getByRole('link', { name: result }).click()
  await expect(finder.getByRole('searchbox')).toHaveValue('')
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpAndOnboard(page)
  await page.goto('/settings')
})

test('search focuses exact fields while retaining unsaved edits across panels', async ({ page }) => {
  await jump(page, 'height', /^Height/)
  const height = page.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(height).toBeFocused()
  await height.fill('181')
  await jump(page, 'mute momo', /^Mute Momo/)
  await expect(page.getByRole('switch', { name: 'Mute Momo' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible()
  await jump(page, 'height', /^Height/)
  await expect(height).toHaveValue('181')
  await expect(height).toBeFocused()
  await expect(page.locator('[data-setting-highlight]')).toHaveCount(1)
  await expect(page.locator('[data-setting-highlight]')).toHaveCount(0, { timeout: 5000 })
})

test('hidden connection and goal fields explain their prerequisite without enabling it', async ({ page }) => {
  await jump(page, 'key header name', /^Key header name/)
  const ownAPI = page.getByRole('switch', { name: 'Use my own API', exact: true })
  await expect(ownAPI).toBeFocused()
  await expect(ownAPI).not.toBeChecked()
  await expect(page.locator('.settings-search-notice')).toContainText('Your saved mode has not changed')
  await expect(page.getByRole('button', { name: 'Save settings' })).toHaveCount(0)
  await jump(page, 'goal weight', /^Goal weight/)
  await expect(page.getByRole('combobox', { name: 'Goal', exact: true })).toBeFocused()
  await expect(page.locator('.settings-search-notice')).toContainText('Goal weight is shown')
  await expect(page.getByRole('button', { name: 'Save settings' })).toHaveCount(0)
})

test('search reveals authentication and wardrobe disclosures without changing values', async ({ page }) => {
  await jump(page, 'use my own api', /^Use my own API/)
  await page.getByRole('switch', { name: 'Use my own API', exact: true }).check()
  await jump(page, 'authentication method', /^Authentication method/)
  await expect(page.getByRole('combobox', { name: 'Authentication method', exact: true })).toBeFocused()
  await expect(page.locator('.you-api-auth')).toHaveAttribute('open', '')
  await expect(page.getByRole('combobox', { name: 'Authentication method', exact: true })).toHaveValue('bearer')
  await jump(page, 'wardrobe', /^Momo’s wardrobe/)
  await expect(page.locator('#setting-momo-wardrobe > summary')).toBeFocused()
  await expect(page.locator('#setting-momo-wardrobe')).toHaveAttribute('open', '')
})

test('search only focuses import and deletion actions and does not activate them', async ({ page }) => {
  let dialogs = 0
  let fileChoosers = 0
  page.on('dialog', dialog => { dialogs++; void dialog.dismiss() })
  page.on('filechooser', () => fileChoosers++)
  await jump(page, 'import backup', /^Import backup/)
  await expect(page.getByRole('button', { name: 'Import backup', exact: true })).toBeFocused()
  await jump(page, 'delete all data', /^Delete all data/)
  await expect(page.getByRole('button', { name: 'Delete all data', exact: true })).toBeFocused()
  await jump(page, 'delete account', /^Delete account/)
  await expect(page.getByRole('button', { name: 'Delete account', exact: true })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Permanently delete account' })).toHaveCount(0)
  expect(dialogs).toBe(0)
  expect(fileChoosers).toBe(0)
})

test('disabled Momo controls focus their prerequisite without changing it', async ({ page }) => {
  await jump(page, 'show momo', /^Show Momo/)
  await page.getByRole('switch', { name: 'Show Momo' }).uncheck()
  await jump(page, 'calm momo', /^Calm Momo/)
  await expect(page.getByRole('switch', { name: 'Show Momo' })).toBeFocused()
  await expect(page.getByRole('switch', { name: 'Show Momo' })).not.toBeChecked()
  await expect(page.locator('.settings-search-notice')).toContainText('Show Momo is highlighted')
  await jump(page, 'momo live ai', /^Momo live AI/)
  const live = page.getByRole('switch', { name: 'Momo live AI', exact: true })
  await live.uncheck()
  await jump(page, 'personality', /^Momo’s personality/)
  await expect(live).toBeFocused()
  await expect(live).not.toBeChecked()
  await expect(page.locator('.settings-search-notice')).toContainText('Personality is available when Momo live AI is enabled')
  await expect(page.getByRole('combobox', { name: "Momo's personality", exact: true })).toBeDisabled()
})

test('large text search stays scrollable and supports re-focusing the same destination', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 })
  await page.addStyleTag({ content: '.k-you :is(input,button,select,a,p,small,strong,label,span) { font-size: 20px; }' })
  const finder = page.getByRole('search', { name: 'Find settings' })
  await finder.getByRole('searchbox').fill('momo')
  await finder.getByRole('link', { name: /^Momo’s personality/ }).scrollIntoViewIfNeeded()
  await expect(finder.getByRole('link', { name: /^Momo’s personality/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await jump(page, 'height', /^Height/)
  const height = page.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(height).toBeFocused()
  await jump(page, 'height', /^Height/)
  await expect(height).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [320, 390, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`exact Settings search fits ${width}px ${colorScheme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ colorScheme })
    await page.getByRole('searchbox', { name: 'Find a setting' }).fill('momo')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await jump(page, 'height', /^Height/)
    await expect(page.getByRole('spinbutton', { name: 'Height', exact: true })).toBeFocused()
    const box = await page.getByRole('spinbutton', { name: 'Height', exact: true }).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: testInfo.outputPath(`settings-height-${width}-${colorScheme}.png`), fullPage: true, animations: 'disabled' })
  })
}
