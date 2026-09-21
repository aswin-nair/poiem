import { expect, test } from '@playwright/test'
import { nav, settlePageLayout, signUpAndOnboard } from './helpers'

test('daily summary, settings navigation and editor stay clear on a phone', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await signUpAndOnboard(page)
  await settlePageLayout(page)
  // Notifications take priority over the roaming mascot and its speech bubble.
  await expect(page.locator('.toast')).toBeVisible()
  await expect(page.locator('.mascot-host')).toHaveCount(0)
  await page.locator('.toast').getByRole('button', { name: 'Dismiss', exact: true }).click()
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
  console.log('You layout', { sectionLinks: await page.getByRole('navigation', { name: 'You page sections' }).boundingBox(), goals: await page.locator('.settings-goals-grid').boundingBox() })
  const sections = page.getByRole('navigation', { name: 'You page sections' })
  expect((await sections.boundingBox())!.height).toBeLessThanOrEqual(72)
  await expect(sections.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  await sections.getByRole('link', { name: 'Your data' }).focus()
  await page.keyboard.press('Enter')
  await expect(sections.getByRole('link', { name: 'Your data' })).toHaveAttribute('aria-current', 'page')
  const toolbar = await page.locator('.you-toolbar').boundingBox()
  const dataHeading = await page.getByRole('heading', { name: 'Your data', exact: true }).boundingBox()
  expect(toolbar!.y).toBeGreaterThanOrEqual(-1)
  expect(dataHeading!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height)
  await sections.getByRole('link', { name: 'Profile & goals' }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('UI audit user')
  await expect(page.locator('.you-save-bar')).toContainText('Unsaved changes')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.locator('.you-save-bar')).toContainText('Settings saved')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('UI audit user')

  for (const path of ['/log/text', '/log/photo', '/log/manual']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.locator('.mascot-host')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
