import { expect, test, type Page } from '@playwright/test'
import type { AppState, FoodEntry, SavedMeal } from '../src/types'
import { applyVisualSeed, VISUAL_USER_ID, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

function savedLibraryState(): AppState {
  const state = visualSeedState()
  const oats: SavedMeal = {
    ...state.favoriteMeals[0], protein: 10, carbs: 21.4, fat: 7.6, servingSizeGrams: 180.5,
    ingredients: [{ item: 'Oats', grams: 80, calories: 200, protein: 6, carbs: 18, fat: 4 }],
  }
  const bowl: SavedMeal = { id: 'saved-bowl', name: 'Chicken rice bowl', calories: 540, protein: 38, carbs: 48, fat: 16, mealType: 'lunch', emoji: '🍗' }
  const soup: SavedMeal = { id: 'saved-soup', name: 'Tomato soup', calories: 280, protein: 8, carbs: 32, fat: 10, mealType: 'dinner', emoji: '🍲' }
  const apple: SavedMeal = { id: 'saved-apple', name: 'Apple', calories: 100, protein: 0.5, carbs: 25, fat: 0.3, mealType: 'snack', emoji: '🍎' }
  const loggedOats = (id: string, timestamp: string): FoodEntry => ({ ...oats, id, timestamp, localDate: timestamp.slice(0, 10), source: 'manual' })
  state.favoriteMeals = [oats, bowl, soup, apple]
  state.foodEntries = [
    loggedOats('oats-one', '2026-09-16T08:00:00.000Z'),
    loggedOats('oats-two', '2026-09-17T08:00:00.000Z'),
    loggedOats('oats-three', '2026-09-18T08:00:00.000Z'),
    state.foodEntries[1], state.foodEntries[2],
    { ...apple, id: 'recent-apple', calories: 125, timestamp: '2026-09-19T19:00:00.000Z', localDate: '2026-09-19', source: 'manual' },
  ]
  return state
}

async function readState(page: Page): Promise<AppState> {
  return page.evaluate(async userId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    const durable = await loadDurableState(userId)
    if (!durable) throw new Error('Expected saved account state')
    return durable.state
  }, VISUAL_USER_ID)
}

for (const width of [320, 390, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`Saved sort, filters and retained portions at ${width}px ${colorScheme}`, async ({ page }, testInfo) => {
      const state = savedLibraryState()
      const templates = structuredClone(state.favoriteMeals)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/api/**', route => route.abort('blockedbyclient'))
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme })
      await applyVisualSeed(page, state)
      await page.goto('/discover')
      const saved = page.getByRole('region', { name: 'Saved meals', exact: true })
      const names = () => saved.locator('.k-repeat-name').allTextContents()
      await expect(saved.getByRole('article')).toHaveCount(4)
      await expect.poll(names).toEqual(['Tomato soup', 'Chicken rice bowl', 'Overnight oats', 'Apple'])
      await expect(saved).toContainText('3 matching journal logs')
      await expect(saved).toContainText('No matching journal logs yet')
      const sortPicker = page.getByRole('combobox', { name: 'Sort saved meals', exact: true })
      const destinationPicker = page.getByRole('combobox', { name: 'Logging to', exact: true })
      for (const picker of [sortPicker, destinationPicker]) {
        await expect(picker).toHaveCSS('appearance', 'none')
        await expect(picker).toHaveCSS('font-size', '16px')
        await picker.focus()
        await expect(picker).toBeFocused()
      }
      await page.evaluate(async () => { await document.fonts.ready })
      const clippedSelections = await page.locator('.saved-library-select select').evaluateAll(elements => elements.filter(element => {
        const select = element as HTMLSelectElement
        const style = getComputedStyle(select)
        const context = document.createElement('canvas').getContext('2d')!
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const textWidth = context.measureText(select.selectedOptions[0].textContent ?? '').width
        return textWidth > select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1
      }).map(element => element.id))
      expect(clippedSelections).toEqual([])
      const decorativeArrows = page.locator('.saved-library-select svg')
      await expect(decorativeArrows).toHaveCount(2)
      for (const arrow of await decorativeArrows.all()) {
        await expect(arrow).toHaveAttribute('aria-hidden', 'true')
        await expect(arrow).toHaveCSS('pointer-events', 'none')
      }
      await sortPicker.focus()
      await sortPicker.press('ArrowDown')
      await expect(sortPicker).toHaveValue('name')
      await expect.poll(names).toEqual(['Apple', 'Chicken rice bowl', 'Overnight oats', 'Tomato soup'])
      await sortPicker.press('ArrowUp')
      await expect(sortPicker).toHaveValue('recent')
      const oats = saved.getByRole('article', { name: 'Overnight oats', exact: true })
      await oats.getByRole('button', { name: /Adjust portion for Overnight oats/ }).click()
      await oats.getByRole('button', { name: 'Increase portion for Overnight oats', exact: true }).click()
      await expect(oats).toContainText('400 kcal')
      await expect(oats).toContainText('Protein 12.5g · Carbs 26.8g · Fat 9.5g')
      await page.getByLabel('Sort saved meals', { exact: true }).selectOption('most-used')
      await expect.poll(names).toEqual(['Overnight oats', 'Tomato soup', 'Chicken rice bowl', 'Apple'])
      await page.getByLabel('Find a saved or recent meal', { exact: true }).fill('rice')
      await expect(oats).toHaveCount(0)
      await page.getByRole('button', { name: 'Clear search and filters', exact: true }).click()
      await expect(oats.getByRole('button', { name: /currently 1.25 times/ })).toBeVisible()
      await page.getByRole('group', { name: 'Filter saved meals by type' }).getByRole('button', { name: 'Lunch', exact: true }).click()
      await expect(oats).toHaveCount(0)
      await page.getByRole('group', { name: 'Filter saved meals by type' }).getByRole('button', { name: 'All', exact: true }).click()
      await page.getByLabel('Sort saved meals', { exact: true }).selectOption('name')
      await expect.poll(names).toEqual(['Apple', 'Chicken rice bowl', 'Overnight oats', 'Tomato soup'])
      await expect(oats).toContainText('400 kcal')
      await page.getByRole('combobox', { name: 'Logging to', exact: true }).selectOption('snack')
      await expect(oats.getByRole('button', { name: 'Log Overnight oats, 1.25 times your saved meal to Snack', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const sizes = await page.locator('.k-saved main button, .k-saved main select, #saved-meal-search').evaluateAll(elements => elements.map(element => ({
        label: element.getAttribute('aria-label') ?? element.textContent,
        height: element.getBoundingClientRect().height,
      })))
      // Layout transforms can report 43.99998 for a computed 44px control.
      expect(sizes.filter(size => size.height < 43.99)).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`saved-library-${width}-${colorScheme}.png`), fullPage: true, animations: 'disabled' })
      await oats.getByRole('button', { name: 'Log Overnight oats, 1.25 times your saved meal to Snack', exact: true }).click()
      await expect(page).toHaveURL('/')
      await expect.poll(async () => (await readState(page)).foodEntries.filter(entry => entry.name === 'Overnight oats' && entry.mealType === 'snack').length).toBe(1)
      const logged = (await readState(page)).foodEntries.find(entry => entry.name === 'Overnight oats' && entry.mealType === 'snack')!
      expect(logged).toMatchObject({ calories: 400, protein: 12.5, carbs: 26.8, fat: 9.5, servingSizeGrams: 225.6, mealType: 'snack', localDate: '2026-09-19', ingredients: [{ item: 'Oats', grams: 100, calories: 250, protein: 7.5, carbs: 22.5, fat: 5 }] })
      expect((await readState(page)).favoriteMeals).toEqual(templates)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(async () => (await readState(page)).foodEntries.some(entry => entry.id === logged.id)).toBe(false)
      expect((await readState(page)).favoriteMeals).toEqual(templates)
      expect(errors).toEqual([])
    })
  }
}

test('Saving a recent meal retains its chosen portion as it moves to Saved', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page, savedLibraryState())
  await page.goto('/discover')
  const recentApple = page.getByRole('region', { name: 'Recent meals', exact: true }).getByRole('article', { name: 'Apple', exact: true })
  await recentApple.getByRole('button', { name: /Adjust portion for Apple/ }).click()
  await recentApple.getByRole('button', { name: 'Increase portion for Apple', exact: true }).click()
  await recentApple.getByRole('button', { name: 'Save Apple', exact: true }).click()
  const savedApple = page.getByRole('region', { name: 'Saved meals', exact: true }).getByRole('article', { name: 'Apple', exact: true }).filter({ hasText: '156 kcal' })
  await expect(savedApple.getByRole('button', { name: /currently 1.25 times your saved meal/ })).toBeVisible()
  const template = (await readState(page)).favoriteMeals.find(meal => meal.name === 'Apple' && meal.calories === 125)!
  expect(template).toMatchObject({ calories: 125, protein: 0.5, carbs: 25, fat: 0.3 })
})
