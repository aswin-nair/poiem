import { expect, test, type Page } from '@playwright/test'
import type { AppState } from '../src/types'
import { applyVisualSeed, VISUAL_USER_ID, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })

async function readState(page: Page): Promise<AppState> {
  return page.evaluate(async userId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    const durable = await loadDurableState(userId)
    if (!durable) throw new Error('Expected saved account state')
    return durable.state
  }, VISUAL_USER_ID)
}

for (const choice of ['saved quarter', 'recent quarter', 'recent half preset'] as const) {
  test(`${choice} logs the shown nutrition to the chosen Snack slot`, async ({ page }) => {
    const state = visualSeedState()
    const nutrition = {
      protein: 10, carbs: 21.4, fat: 7.6, servingSizeGrams: 180.5,
      ingredients: [{ item: 'Oats', grams: 80, calories: 200, protein: 6, carbs: 18, fat: 4 }],
    }
    state.foodEntries[0] = { ...state.foodEntries[0], ...nutrition }
    state.favoriteMeals[0] = { ...state.favoriteMeals[0], ...nutrition }
    await page.route('**/api/**', route => route.abort('blockedbyclient'))
    await applyVisualSeed(page, state)
    await page.goto('/')
    await page.getByRole('button', { name: 'Add snack', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
    await expect(sheet.locator('.k-log-meal')).toHaveText('Snack')
    if (choice === 'saved quarter') {
      await sheet.getByRole('link', { name: 'Saved meals', exact: true }).click()
      await expect(page.getByRole('combobox', { name: 'Logging to', exact: true })).toHaveValue('snack')
    }
    const row = page.getByRole('article', { name: 'Overnight oats', exact: true })
    await expect(row).toContainText('1× = your')
    await expect(row).toContainText('180.5 g')
    await expect(row).toContainText('Logging to Snack · Today')
    const multiplier = choice === 'recent half preset' ? 0.5 : 1.25
    if (choice === 'recent half preset') {
      await row.getByRole('button', { name: 'Log Overnight oats, 1 times your previous meal to Snack', exact: true }).click({ button: 'right' })
      const preset = page.getByRole('dialog', { name: 'Portion for Overnight oats', exact: true })
      await expect(preset).toContainText('1× = your previous meal · 180.5 g')
      await expect(preset).toContainText('Logging to Snack · Today')
      await expect(preset.getByRole('button', { name: 'Log Overnight oats, 0.5 times your previous meal to Snack', exact: true })).toContainText('160 kcal')
      await preset.getByRole('button', { name: 'Log Overnight oats, 0.5 times your previous meal to Snack', exact: true }).click()
    } else {
      await row.getByRole('button', { name: /Adjust portion for Overnight oats/ }).click()
      await row.getByRole('button', { name: 'Increase portion for Overnight oats', exact: true }).click()
      await expect(row).toContainText('400 kcal')
      if (choice === 'saved quarter') await expect(row).toContainText('Protein 12.5g · Carbs 26.8g · Fat 9.5g')
      await row.getByRole('button', { name: /Log Overnight oats, 1.25 times your (saved|previous) meal to Snack/ }).click()
    }
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('region', { name: 'Snack', exact: true }).getByRole('button', { name: /^Overnight oats/ })).toHaveCount(1)
    await expect.poll(async () => (await readState(page)).foodEntries.filter(entry => entry.name === 'Overnight oats' && entry.mealType === 'snack').length).toBe(1)
    const logged = (await readState(page)).foodEntries.find(entry => entry.name === 'Overnight oats' && entry.mealType === 'snack')!
    expect(logged).toMatchObject({
      calories: Math.round(320 * multiplier),
      protein: Math.round(10 * multiplier * 10) / 10,
      carbs: Math.round(21.4 * multiplier * 10) / 10,
      fat: Math.round(7.6 * multiplier * 10) / 10,
      servingSizeGrams: Math.round(180.5 * multiplier * 10) / 10,
      ingredients: [{ item: 'Oats', grams: 80 * multiplier, calories: 200 * multiplier, protein: 6 * multiplier, carbs: 18 * multiplier, fat: 4 * multiplier }],
    })
  })
}
