import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC' })

async function doubleActivate(button: Locator): Promise<void> {
  // One browser task: the second activation must be rejected before a route
  // render can remove the control or a disabled state can reach the DOM.
  await button.evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error('Expected a button')
    element.click()
    element.click()
  })
}

async function expectOneConfirmation(page: Page, mealName: string): Promise<void> {
  const moment = page.getByRole('complementary', { name: `Log confirmation for ${mealName}`, exact: true })
  const toast = page.getByRole('status').and(page.locator('.toast')).filter({ hasText: `Logged ${mealName}` })
  const confirmation = moment.or(toast)
  await expect(confirmation).toHaveCount(1)
  await expect(confirmation).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await applyVisualSeed(page, visualSeedState())
})

test('a double click on Manual Save creates one entry', async ({ page }) => {
  await page.goto('/log/manual')
  await page.getByLabel('Food name').fill('Activation toast')
  await page.getByLabel('Calories per serving Required', { exact: true }).fill('250')
  await doubleActivate(page.getByRole('button', { name: 'Log meal', exact: true }))
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: /^Activation toast/ })).toHaveCount(1)
  await expectOneConfirmation(page, 'Activation toast')
})

test('a double activation of a Saved relog creates one entry', async ({ page }) => {
  await page.goto('/discover')
  const saved = page.getByRole('article', { name: 'Overnight oats', exact: true })
  await doubleActivate(saved.getByRole('button', { name: 'Log Overnight oats, 1 times portion', exact: true }))
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: /^Overnight oats/ })).toHaveCount(2)
  await expectOneConfirmation(page, 'Overnight oats')
})

test('a double tap on a sheet quick-add creates one entry', async ({ page }) => {
  await page.goto('/log')
  const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
  await sheet.getByRole('textbox', { name: 'Search your foods, or type calories' }).fill('123')
  await doubleActivate(sheet.getByRole('button', { name: /Quick add 123 kcal/ }))
  await expect(page).toHaveURL('/')
  await expect(page.locator('.k-meal-row').filter({ hasText: '123 kcal' })).toHaveCount(1)
  await expectOneConfirmation(page, 'Quick add')
})

test('the log sheet opens without waiting on a timer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('fab')).toBeVisible()
  await page.clock.pauseAt(new Date('2026-09-19T20:01:00Z'))
  // A programmatic native activation avoids waiting for CSS entrance motion
  // while the clock is frozen; no timer is advanced after activating the FAB.
  await page.getByTestId('fab').evaluate(element => (element as HTMLButtonElement).click())
  await expect(page).toHaveURL('/log')
  await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
})
