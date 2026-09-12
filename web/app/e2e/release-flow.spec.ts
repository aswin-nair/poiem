import { expect, test, type Page } from '@playwright/test'

import { logManualMeal, nav, signUpAndOnboard } from './helpers'

async function openMealEditor(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL('/')
  const meal = page.locator('.k-meal-row').filter({ hasText: name })
  await expect(meal).toBeVisible()
  await meal.click()
  await expect(page).toHaveURL(/\/edit\//)
}

async function completeReleaseFlow(page: Page, mealName: string): Promise<void> {
  await signUpAndOnboard(page)
  await logManualMeal(page, {
    name: mealName,
    calories: '410',
    protein: '24',
    carbs: '52',
    fat: '11',
  })

  await openMealEditor(page, mealName)

  const editedName = `${mealName} edited`
  await page.getByLabel('Food name').fill(editedName)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL('/')

  await openMealEditor(page, editedName)
  await page.getByRole('button', { name: 'Add saved entry to favourites' }).click()
  await expect(page.getByRole('button', { name: 'Remove saved entry from favourites' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByRole('button', { name: 'Today', exact: true }).click()

  await nav(page).getByRole('link', { name: 'Saved' }).click()
  await expect(page).toHaveURL('/discover')
  await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible()
  await expect(page.getByText('allowed.has is not a function')).toHaveCount(0)

  await nav(page).getByRole('link', { name: 'Today' }).click()
  await openMealEditor(page, editedName)
  await page.locator('.flow-delete > summary').click()
  await page.getByRole('button', { name: 'Yes, delete entry' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('.k-meal-row').filter({ hasText: editedName })).toHaveCount(0)

  await page.locator('.toast').filter({ hasText: `Deleted ${editedName}` }).getByRole('button', { name: 'Undo', exact: true }).click()
  await openMealEditor(page, editedName)
  await expect(page.getByLabel('Food name')).toHaveValue(editedName)
  await page.locator('.flow-delete > summary').click()
  await page.getByRole('button', { name: 'Yes, delete entry' }).click()
  await expect(page).toHaveURL('/')

  await nav(page).getByRole('link', { name: 'Saved' }).click()
  await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible()
}

test.describe('Release journey', () => {
  for (const setup of [
    { name: 'desktop', viewport: { width: 1280, height: 800 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'tablet', viewport: { width: 768, height: 1024 } },
  ] as const) {
    test(`${setup.name}: signup through edit, delete, and Saved`, async ({ page }) => {
      await page.setViewportSize(setup.viewport)
      await completeReleaseFlow(page, `Release bowl ${setup.name}`)
    })
  }

  test('Momo visibility, dialogue, and motion controls persist', async ({ page }) => {
    await signUpAndOnboard(page)
    await nav(page).getByRole('link', { name: 'You' }).click()

    const showMomo = page.getByRole('switch', { name: 'Show Momo' })
    await expect(showMomo).toBeChecked()
    await showMomo.click()
    await expect(page.getByRole('radio', { name: 'Lively' })).toHaveCount(0)
    await showMomo.click()
    await expect(page.getByRole('radio', { name: 'Lively' })).toBeChecked()

    await page.getByRole('switch', { name: 'Mute Momo' }).click()
    await page.getByRole('switch', { name: 'Reduce Momo motion' }).click()
    await page.getByRole('button', { name: 'Save settings' }).click()
    await page.reload()

    await expect(page.getByRole('switch', { name: 'Show Momo' })).toBeChecked()
    await expect(page.getByRole('switch', { name: 'Mute Momo' })).toBeChecked()
    await expect(page.getByRole('switch', { name: 'Reduce Momo motion' })).toBeChecked()
  })
})
