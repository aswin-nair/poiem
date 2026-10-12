import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

// Destructive and discarding choices use the app's own dialog, never the browser's prompt.
test.use({ timezoneId: 'UTC', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // A native prompt would be dismissed silently and look like a cancel: fail loudly instead.
  page.on('dialog', dialog => {
    void dialog.dismiss()
    throw new Error(`Unexpected native dialog: ${dialog.message()}`)
  })
  await applyVisualSeed(page)
})

test.describe('Edit meal: leaving with changes', () => {
  test('asks in-page, keeps editing on Escape, and leaves only when confirmed', async ({ page }) => {
    await page.goto('/edit/seed-oats')
    await page.getByLabel('Food name').fill('Overnight oats, edited')
    await page.getByRole('button', { name: 'Today' }).click()

    const dialog = page.getByRole('dialog', { name: 'Leave without saving?' })
    await expect(dialog).toBeVisible()
    // Focus starts on the safe choice.
    await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/edit\/seed-oats/)
    await expect(page.getByLabel('Food name')).toHaveValue('Overnight oats, edited')

    await page.getByRole('button', { name: 'Today' }).click()
    await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave without saving' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('does not ask when nothing changed', async ({ page }) => {
    await page.goto('/edit/seed-oats')
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('You: delete all data', () => {
  test('asks in-page and keeps the journal when cancelled', async ({ page }) => {
    // The panel is a search parameter, so this opens Your data on phone and desktop alike.
    await page.goto('/settings?panel=data#setting-delete-data')
    await page.getByRole('button', { name: 'Delete all data', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Delete all saved data?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Keep my data' })).toBeFocused()
    await expect(dialog).toContainText('can’t be undone')

    await dialog.getByRole('button', { name: 'Keep my data' }).click()
    await expect(dialog).toHaveCount(0)

    await page.goto('/')
    await expect(page.getByText('Overnight oats').first()).toBeVisible()
  })
})
