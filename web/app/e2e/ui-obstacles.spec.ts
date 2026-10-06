import { expect, test } from '@playwright/test'
import { clearAppStorage, completeOnboarding, nav, openYouDestination, settlePageLayout, signUp } from './helpers'

test('daily summary, settings navigation and editor stay clear on a phone', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await clearAppStorage(page)
  await signUp(page)
  await completeOnboarding(page, { dismissCelebration: false })
  await settlePageLayout(page)
  // The first accepted meal has one non-modal receipt and leaves phone controls clear.
  const receipt = page.getByRole('complementary', { name: 'Log confirmation for Onboarding yogurt bowl', exact: true })
  await expect(receipt).toBeVisible()
  await expect(receipt.getByRole('status')).toContainText('Momo’s first piece: Blossom clip')
  await expect(page.locator('.toast')).toHaveCount(0)
  await expect(page.locator('.mascot-host')).toHaveCount(0)
  await receipt.getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(page.locator('.mascot-host')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('today.png'), animations: 'disabled' })
  // The editorial summary is taller than one phone screen. Check that its
  // macros can be read clear of the fixed navigation after scrolling to them.
  await page.locator('.k-macros').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const macros = await page.locator('.k-macros').boundingBox()
  const navigation = await nav(page).boundingBox()
  console.log('Today layout', { macros, navigation })
  expect(macros!.y).toBeGreaterThanOrEqual(0)
  expect(macros!.y + macros!.height).toBeLessThan(navigation!.y)
  await page.screenshot({ path: testInfo.outputPath('today-macros.png'), animations: 'disabled' })
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  // Space-aware hiding is temporary, not a change to the user's Momo setting. On a
  // wide screen he waits beside the column, clear of Today's numbers and meals.
  await page.setViewportSize({ width: 1440, height: 960 })
  await settlePageLayout(page)
  await expect(page.locator('.mascot-host')).toBeVisible()
  const momo = await page.locator('.mascot-host').boundingBox()
  const column = await page.locator('.k-today-main').boundingBox()
  expect(momo!.x >= column!.x + column!.width || momo!.x + momo!.width <= column!.x).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.mascot-host')).toHaveCount(0)

  await page.locator('.k-meal-row').first().click()
  await expect(page.getByLabel('Food name')).toBeVisible()
  await settlePageLayout(page)
  await expect(page.locator('.mascot-host')).toHaveCount(0)
  await expect(page.locator('.flow-heading h1')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('editor.png'), animations: 'disabled' })

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'You', exact: true })).toBeVisible()
  await settlePageLayout(page)
  await page.screenshot({ path: testInfo.outputPath('you.png'), animations: 'disabled' })
  const categories = page.getByRole('combobox', { name: 'Category', exact: true })
  console.log('You layout', { categoryPicker: await categories.boundingBox(), goals: await page.locator('.settings-goals-grid').boundingBox() })
  expect((await categories.boundingBox())!.height).toBeLessThanOrEqual(72)
  await expect(categories).toHaveValue('overview')
  await categories.focus()
  await openYouDestination(page, 'Your data')
  await expect(categories).toHaveValue('data')
  const toolbar = await page.locator('.you-toolbar').boundingBox()
  const dataHeading = await page.getByRole('heading', { name: 'Your data', exact: true }).boundingBox()
  expect(toolbar!.y).toBeGreaterThanOrEqual(-1)
  expect(dataHeading!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height)
  await openYouDestination(page, 'Profile & goals')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('UI audit user')
  await expect(page.locator('.you-save-bar')).toContainText('Unsaved profile changes')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.locator('.you-save-bar')).toContainText('Profile saved')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('UI audit user')

  for (const path of ['/log/text', '/log/photo', '/log/manual']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.locator('.mascot-host')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
