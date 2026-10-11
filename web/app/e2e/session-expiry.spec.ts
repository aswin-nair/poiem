import { expect, test, type Page, type Route } from '@playwright/test'
import { visualSeedState, VISUAL_USER } from './seed'
import { openYouDestination, signInWithEmail } from './helpers'

const FOOD = { name: 'Unfinished private bowl', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }

/** Exercises the cloud client lifecycle with simulated local auth/state responses, never a live account. */
async function service(page: Page, refreshAllowed: boolean) {
  const controls = { refreshAllowed, holdNextWrite: false, held: null as Route | null, saved: visualSeedState(), version: 1, activeUser: { ...VISUAL_USER } }
  const token = () => `e2e.${Buffer.from(JSON.stringify({ sub: controls.activeUser.sub, iat: 1_791_486_000 })).toString('base64url')}.simulated`
  await page.addInitScript(user => {
    sessionStorage.setItem('poiem-splash-seen', '1')
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    window.__POIEM_TEST__ = { hideOverlay: true }
  }, VISUAL_USER)
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth') {
      const action = url.searchParams.get('action')
      if (action === 'refresh' && !controls.refreshAllowed) return route.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
      if (action === 'login') {
        const body = route.request().postDataJSON() as { email: string }
        if (body.email === 'other@poiem.test') {
          controls.activeUser = { ...VISUAL_USER, sub: 'other-account', email: body.email, name: 'Other person' }
          controls.saved = visualSeedState()
          controls.saved.profile.name = 'Other person'
          controls.saved.foodEntries = []
        }
        controls.refreshAllowed = true
      }
      return route.fulfill({ json: { token: token(), user: controls.activeUser, ok: true } })
    }
    if (url.pathname === '/api/state') {
      if (route.request().method() === 'GET') return route.fulfill({ json: { state: controls.saved, version: controls.version } })
      if (controls.holdNextWrite) {
        controls.holdNextWrite = false
        controls.held = route
        return
      }
      controls.saved = route.request().postDataJSON().state
      controls.version += 1
      return route.fulfill({ json: { version: controls.version } })
    }
    return route.fulfill({ status: 503, json: { error: 'Simulated service is unavailable' } })
  })
  return controls
}

async function seedReview(page: Page) {
  await page.addInitScript(food => {
    const draft = { version: 1, review: { analysis: { ...food, calories: 460 }, baseAnalysis: { ...food, calories: 460 }, originalAnalysis: food, mealType: 'dinner', servings: 1, source: 'textInput', emptyNumericFields: [], updatedAt: new Date().toISOString() } }
    localStorage.setItem('fud-log-drafts-v1-visual-ada', JSON.stringify(draft))
  }, FOOD)
}

test('cold refresh expiry returns the same account to its hydrated corrected review once', async ({ page }) => {
  await service(page, false)
  await seedReview(page)
  await page.goto('/review')
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('status').filter({ hasText: 'Your session ended' })).toContainText('meal review')
  await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  await expect(page).toHaveURL('/review')
  await expect(page.getByLabel('Food name', { exact: true })).toHaveValue(FOOD.name)
  await expect(page.getByRole('spinbutton', { name: /^Calories/ })).toHaveValue('460')
  await expect(page.getByRole('button', { name: 'Dinner', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/settings?panel=momo')
  await expect(page).toHaveURL('/settings?panel=momo')
  await expect(page.getByRole('switch', { name: 'Show Momo', exact: true })).toBeVisible()
})

test('a 401 on a queued write preserves work and restores the settings panel after sign-in', async ({ page }) => {
  const controls = await service(page, true)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  controls.holdNextWrite = true
  await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  await expect.poll(() => Boolean(controls.held)).toBe(true)
  await page.getByLabel('Main').getByRole('link', { name: 'You', exact: true }).click()
  await openYouDestination(page, 'AI setup')
  await expect(page).toHaveURL('/settings?panel=ai')
  controls.refreshAllowed = false
  await controls.held!.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
  await expect(page).toHaveURL('/login')
  await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  await expect(page).toHaveURL('/settings?panel=ai')
  await expect.poll(() => Object.values(controls.saved.gamification.waterByDate).some(value => value === 1)).toBe(true)
})

test('signing into another account drops the old destination and private draft', async ({ page }) => {
  await service(page, false)
  await seedReview(page)
  await page.goto('/review')
  await expect(page).toHaveURL('/login')
  await signInWithEmail(page, 'other@poiem.test', 'SimulatedPass123!')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText(FOOD.name, { exact: true })).toHaveCount(0)
  await page.goto('/review')
  await expect(page.getByRole('heading', { name: 'Let’s start with a meal.', exact: true })).toBeVisible()
})

test('an expired review without a valid hydrated draft returns to the meal picker', async ({ page }) => {
  await service(page, false)
  await page.goto('/review')
  await expect(page).toHaveURL('/login')
  await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  await expect(page).toHaveURL('/log')
  await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
})

test('session expiry preserves the selected journal day after a same-account return', async ({ page }) => {
  const controls = await service(page, true)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  controls.holdNextWrite = true
  await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  await expect.poll(() => Boolean(controls.held)).toBe(true)
  const yesterdayLabel = await page.evaluate(() => {
    const day = new Date()
    day.setDate(day.getDate() - 1)
    return day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  })
  await page.getByRole('button', { name: 'Choose date', exact: true }).click()
  await page.getByRole('dialog', { name: 'Choose a date', exact: true }).getByRole('button', { name: yesterdayLabel, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
  controls.refreshAllowed = false
  await controls.held!.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
  await expect(page).toHaveURL('/login')
  await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add a glass of water', exact: true })).toHaveCount(0)
})

test('cloud password recovery retains setup context without forwarding private URL fields', async ({ page }) => {
  await service(page, false)
  await page.goto('/login?setup=1&token=private-token&email=private-email')
  await expect(page.getByRole('link', { name: 'Back to setup', exact: true })).toHaveAttribute('href', '/onboarding')
  await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
  await expect(page).toHaveURL('/forgot-password?setup=1')
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click()
  await expect(page).toHaveURL('/login?setup=1')
})
