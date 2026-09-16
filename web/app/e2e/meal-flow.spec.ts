import { expect, test, type Page, type Route } from '@playwright/test'
import { nav, signUpAndOnboard } from './helpers'

const AI_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FOOD = { name: 'Test rice bowl', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }
const aiReply = (route: Route, food = FOOD) => route.fulfill({ json: { choices: [{ message: { content: JSON.stringify(food) } }] } })

async function configureTestAI(page: Page) {
  // Only a dummy key, and every provider request is intercepted by the test.
  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Show Momo', exact: true }).uncheck()
  await page.getByRole('link', { name: 'AI setup' }).click()
  await page.getByRole('switch', { name: 'Use my own API key' }).check()
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openrouter')
  await page.getByRole('textbox', { name: 'API key' }).fill('local-test-key-not-a-credential')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved' })).toBeVisible()
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
  await page.unroute(AI_URL)
  await page.route(AI_URL, route => aiReply(route))
  await page.getByRole('button', { name: 'Analyze photo' }).click()
  await expect(page).toHaveURL('/review')
  await expect(page.getByAltText('Meal photo being reviewed')).toBeVisible()
})

test('review draft survives reload, and invalid totals cannot be logged', async ({ page }) => {
  await page.goto('/log/text')
  await page.getByLabel('Your meal, your words').fill('A rice bowl')
  await page.getByRole('button', { name: 'Estimate my meal' }).click()
  await expect(page).toHaveURL('/review')
  await page.getByLabel('Food name').fill('My draft bowl')
  await page.getByLabel('Calories', { exact: false }).fill('-5')
  await page.getByRole('button', { name: 'Log meal', exact: true }).click()
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page).toHaveURL('/review')
  await page.getByLabel('Calories', { exact: false }).fill('350')
  await page.getByRole('button', { name: 'Lunch', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Food name')).toHaveValue('My draft bowl')
  await expect(page.getByRole('button', { name: 'Lunch', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Meal total')).toContainText('350')
})
