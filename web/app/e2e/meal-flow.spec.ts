import { expect, test, type Page, type Route } from '@playwright/test'
import { nav, openYouDestination, signUpAndOnboard } from './helpers'

const AI_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FOOD = { name: 'Test rice bowl', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }
const aiReply = (route: Route, food = FOOD) => route.fulfill({ json: { choices: [{ message: { content: JSON.stringify(food) } }] } })

async function configureTestAI(page: Page) {
  // Only a dummy key, and every provider request is intercepted by the test.
  await page.goto('/settings?panel=momo')
  await page.getByRole('switch', { name: 'Show Momo', exact: true }).uncheck()
  await openYouDestination(page, 'AI setup')
  await page.getByRole('switch', { name: 'Use my own API key' }).check()
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openrouter')
  await page.getByRole('textbox', { name: 'API key' }).fill('local-test-key-not-a-credential')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'AI settings saved' })).toBeVisible()
  await nav(page).getByRole('link', { name: 'Today', exact: true }).click()
  await expect(page).toHaveURL('/')
}

test.beforeEach(async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', route => route.abort())
  await page.route(AI_URL, route => aiReply(route))
  await signUpAndOnboard(page)
  await configureTestAI(page)
})

test('text estimate, portion, review correction and logging work together', async ({ page }) => {
  await page.goto('/log/text')
  await page.getByLabel('Your meal, your words').fill('Rice with vegetables and tofu')
  await page.getByRole('button', { name: 'Estimate my meal' }).click()
  await expect(page).toHaveURL('/review')
  await expect(page.getByLabel('Food name')).toHaveValue(FOOD.name)
  await page.getByLabel('Servings', { exact: true }).fill('1.5')
  await page.getByLabel('Servings', { exact: true }).press('Tab')
  await expect(page.getByLabel('Calories', { exact: false })).toHaveValue('600')
  await page.getByLabel('Food name').fill('My rice bowl')
  await page.getByLabel('Calories', { exact: false }).fill('580')
  await page.getByRole('button', { name: 'Lunch', exact: true }).click()
  await expect(page.getByLabel('Meal total')).toContainText('580')
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  // The day's second meal confirms with a toast rather than the full-screen moment.
  await expect(page.locator('.toast').filter({ hasText: 'Logged My rice bowl' })).toBeVisible()
  const lunch = page.getByRole('region', { name: 'Lunch', exact: true })
  await expect(lunch.locator('.k-meal-row').filter({ hasText: 'My rice bowl' })).toContainText('580 kcal')
})

test('a cancelled text request keeps its draft and can retry', async ({ page }) => {
  let held: Route | undefined
  await page.route(AI_URL, route => { held = route })
  await page.goto('/log/text')
  await page.getByLabel('Your meal, your words').fill('Soup and toast')
  await page.getByRole('button', { name: 'Estimate my meal' }).click()
  await expect.poll(() => Boolean(held)).toBe(true)
  await page.getByRole('button', { name: 'Cancel analysis' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your description is still here' })).toBeVisible()
  await expect(page.getByLabel('Your meal, your words')).toHaveValue('Soup and toast')
  await aiReply(held!).catch(() => undefined)
  await expect(page).toHaveURL('/log/text')
  await page.unroute(AI_URL)
  await page.route(AI_URL, route => aiReply(route))
  await page.getByRole('button', { name: 'Estimate my meal' }).click()
  await expect(page).toHaveURL('/review')
})

test('photo selection is local; failed analysis retains the photo for retry', async ({ page }) => {
  let requests = 0
  await page.route(AI_URL, route => { requests++; return route.fulfill({ status: 503, body: '{}' }) })
  await page.goto('/log/photo')
  await page.getByLabel('Choose a photo from gallery').setInputFiles({
    name: 'sample-meal.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9E0AAAAASUVORK5CYII=', 'base64'),
  })
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Analyze photo' }).click()
  await expect(page.getByRole('alert')).toContainText('503')
  expect(requests).toBe(1)
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'Unfinished meal restored' })).toBeVisible()
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.unroute(AI_URL)
  await page.route(AI_URL, route => aiReply(route))
  await page.getByRole('button', { name: 'Analyze photo' }).click()
  await expect(page).toHaveURL('/review')
  await expect(page.getByAltText('Meal photo being reviewed')).toBeVisible()
})

test('review draft survives reload, and invalid totals cannot be logged', async ({ page }) => {
  await page.getByRole('button', { name: 'Add snack', exact: true }).click()
  await page.getByRole('link', { name: 'Describe your meal', exact: true }).click()
  await page.getByLabel('Your meal, your words').fill('A rice bowl')
  await page.getByRole('button', { name: 'Estimate my meal' }).click()
  await expect(page).toHaveURL('/review')
  await page.getByLabel('Food name').fill('My draft bowl')
  await page.getByLabel('Calories', { exact: false }).fill('-5')
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  await expect(page.getByLabel('Calories', { exact: false })).toBeFocused()
  await expect(page.getByLabel('Calories', { exact: false })).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL('/review')
  await page.getByLabel('Calories', { exact: false }).fill('350')
  await page.getByRole('button', { name: 'Lunch', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Food name')).toHaveValue('My draft bowl')
  await expect(page.getByRole('button', { name: 'Lunch', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Meal total')).toContainText('350')
  await expect(page.getByText('Logging to Lunch · Today', { exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Unfinished meal restored' })).toBeVisible()
})

for (const method of ['text', 'photo'] as const) {
  test(`keeps Today’s Snack choice through ${method} estimation and the accepted log`, async ({ page }) => {
    await page.getByRole('button', { name: 'Add snack', exact: true }).click()
    await page.getByRole('link', { name: method === 'text' ? 'Describe your meal' : 'Snap a photo', exact: true }).click()
    if (method === 'text') {
      await page.getByLabel('Your meal, your words').fill('Rice with tofu')
      await page.getByRole('button', { name: 'Estimate my meal' }).click()
    } else {
      await page.getByLabel('Choose a photo from gallery').setInputFiles({
        name: 'snack.png', mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9E0AAAAASUVORK5CYII=', 'base64'),
      })
      await page.getByRole('button', { name: 'Analyze photo' }).click()
    }
    await expect(page).toHaveURL('/review')
    await expect(page.getByRole('button', { name: 'Snack', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Logging to Snack · Today', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Log meal', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Snack', exact: true }).locator('.k-meal-row').filter({ hasText: FOOD.name })).toContainText('400 kcal')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Snack', exact: true }).locator('.k-meal-row').filter({ hasText: FOOD.name })).toHaveCount(0)
  })
}

test('manual fallback keeps Dinner and draft recovery clears only the chosen form', async ({ page }) => {
  await page.getByRole('button', { name: 'Add dinner', exact: true }).click()
  await page.getByRole('link', { name: 'Describe your meal', exact: true }).click()
  await page.getByLabel('Your meal, your words').fill('Vegetable soup and bread')
  await page.getByRole('link', { name: 'Enter the numbers myself', exact: true }).click()
  await expect(page.getByText('Logging to Dinner · Today', { exact: true })).toBeVisible()
  await page.getByLabel('Food name').fill('Soup draft')
  await page.getByLabel('Calories per serving Required', { exact: true }).fill('-5')
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  await expect(page.getByLabel('Calories per serving Required', { exact: true })).toBeFocused()
  await expect(page.getByText('Calories must be between 0 and 100,000.', { exact: true }).last()).toBeVisible()
  await page.getByLabel('Calories per serving Required', { exact: true }).fill('120')
  await page.getByLabel('Servings', { exact: true }).fill('1.5')
  await expect(page.locator('.flow-portion-total')).toContainText('180 kcal')
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'Unfinished meal restored' })).toBeVisible()
  await expect(page.getByLabel('Food name')).toHaveValue('Soup draft')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByLabel('Food name')).toBeFocused()
  await page.reload()
  await page.getByRole('button', { name: 'Start fresh', exact: true }).click()
  await expect(page.getByLabel('Food name')).toHaveValue('')
  await page.goto('/log/text')
  await expect(page.getByLabel('Your meal, your words')).toHaveValue('Vegetable soup and bread')
  await expect(page.getByRole('status').filter({ hasText: 'Unfinished meal restored' })).toBeVisible()
  await page.getByRole('button', { name: 'Start fresh', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Your meal, your words')).toHaveValue('')
  await expect(page.getByText('Unfinished meal restored', { exact: true })).toHaveCount(0)
})
