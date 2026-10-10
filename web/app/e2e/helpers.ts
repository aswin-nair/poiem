import { expect, type Page } from '@playwright/test'

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@fud-ai.test`
}

/** Measure the resting layout, not an intermediate entrance scale/translation. */
export async function settlePageLayout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    // A paused animation never resolves `finished`, so wait only on running ones, and never
    // longer than a few seconds: entrances are short, and a stuck wait hides the real assertion.
    // Any entrance can move what we are about to measure, wherever it renders: a sheet
    // rises in a portal outside the shell, and the first run has no shell at all. So the
    // filter is "running, on an element, and it ends" rather than a list of containers,
    // which leaves Momo's endless idling out without naming it.
    const entrances = document.getAnimations().filter(animation => {
      const effect = animation.effect
      return animation.playState === 'running'
        && effect instanceof KeyframeEffect && effect.target instanceof Element
        && Number.isFinite(effect.getComputedTiming().endTime)
    })
    const settled = Promise.all(entrances.map(animation => animation.finished.catch(() => undefined)))
    await Promise.race([settled, new Promise(resolve => setTimeout(resolve, 5_000))])
  })
}

export function birthdayYearsAgo(years: number, from = new Date()): string {
  const year = from.getFullYear() - years
  const month = String(from.getMonth() + 1).padStart(2, '0')
  const day = String(from.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function clickAuthTab(page: Page, tab: 'Sign in' | 'Sign up'): Promise<void> {
  await page.locator('.auth-tabs').getByRole('button', { name: tab, exact: true }).click()
}

export async function signUp(page: Page, opts?: { name?: string; email?: string; password?: string }) {
  const email = opts?.email ?? uniqueEmail()
  const password = opts?.password ?? 'TestPass123!'
  const name = opts?.name ?? 'E2E User'

  await clickAuthTab(page, 'Sign up')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.waitForURL(/\/onboarding/)
  return { email, password, name }
}

/**
 * Verify the receipt for this meal, then optionally dismiss its non-modal card.
 * Ordinary logs use a status toast. A card can expire while the dismissal is
 * being actioned; only that completed expiry may replace a successful click.
 */
export async function finishLogConfirmation(page: Page, mealName: string, dismissCelebration: boolean): Promise<void> {
  const moment = page.getByRole('complementary', { name: `Log confirmation for ${mealName}`, exact: true })
  const toast = page.getByRole('status').and(page.locator('.toast')).filter({ hasText: `Logged ${mealName}` })
  const confirmation = moment.or(toast)
  await expect(confirmation).toHaveCount(1)
  await expect(confirmation).toBeVisible()
  if (!await moment.isVisible()) return
  await expect(moment.locator('.k-log-moment-food')).toHaveText(mealName)
  await expect(moment.getByRole('status')).toContainText(`Logged ${mealName}`)
  if (!dismissCelebration) return
  try {
    await moment.getByRole('button', { name: 'Dismiss', exact: true }).click({ timeout: 5_000 })
  } catch (error) {
    if (await moment.isVisible()) throw error
  }
  await expect(moment).toBeHidden()
}

export async function completeOnboarding(
  page: Page,
  options?: {
    birthday?: string
    meal?: { name?: string; calories?: string; protein?: string; carbs?: string; fat?: string }
    dismissCelebration?: boolean
  },
): Promise<void> {
  // Enter profile setup directly; the introduction is optional.
  await page.getByRole('button', { name: 'Get started' }).click()

  await page.getByRole('heading', { name: 'What is your date of birth?' }).waitFor()
  await page.getByLabel('Date of birth').fill(options?.birthday ?? birthdayYearsAgo(25))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // About, goal, body, activity, and pace use safe defaults in routine feature tests.
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Continue to first meal' }).click()

  const meal = {
    name: options?.meal?.name ?? 'Onboarding yogurt bowl',
    calories: options?.meal?.calories ?? '240',
    protein: options?.meal?.protein ?? '18',
    carbs: options?.meal?.carbs ?? '30',
    fat: options?.meal?.fat ?? '6',
  }
  await page.getByLabel('Meal name').fill(meal.name)
  await page.getByLabel('Calories', { exact: true }).fill(meal.calories)
  await page.getByLabel('Protein (g)').fill(meal.protein)
  await page.getByLabel('Carbs (g)').fill(meal.carbs)
  await page.getByLabel('Fat (g)').fill(meal.fat)
  await page.getByRole('button', { name: 'Log first meal' }).click()
  await page.waitForURL('/')

  if (options?.dismissCelebration !== false) {
    await finishLogConfirmation(page, meal.name, true)
  }
}

export async function signUpAndOnboard(page: Page) {
  await clearAppStorage(page)
  const creds = await signUp(page)
  await completeOnboarding(page)
  return creds
}

export async function signInWithEmail(page: Page, email: string, password: string): Promise<void> {
  await clickAuthTab(page, 'Sign in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('form.auth-form').getByRole('button', { name: 'Sign in' }).click()
}

export function nav(page: Page) {
  return page.getByLabel('Main')
}

export function youNav(page: Page) {
  return page.getByRole('navigation', { name: 'You page sections' })
}

export async function openYouDestination(page: Page, name: string | RegExp) {
  const picker = page.getByRole('combobox', { name: 'Category', exact: true })
  if (await picker.isVisible()) {
    const labels = await picker.locator('option').allTextContents()
    const label = labels.find(label => typeof name === 'string' ? label === name : name.test(label))
    if (!label) throw new Error(`Unknown You category: ${name}`)
    const [panel] = await picker.selectOption({ label })
    await expect(page).toHaveURL(url => url.searchParams.get('panel') === panel)
    return
  }
  await youNav(page).getByRole('link', { name }).click()
}

export async function logManualMeal(
  page: Page,
  meal: { name: string; calories: string; protein?: string; carbs?: string; fat?: string },
  options?: { dismissCelebration?: boolean },
): Promise<void> {
  await page.getByTestId('fab').click()
  await page.waitForURL('/log')
  await page.getByRole('link', { name: /Manual entry/i }).click()
  await page.waitForURL(/\/log\/manual/)

  await page.getByLabel('Food name').fill(meal.name)
  await page.getByLabel('Calories per serving Required', { exact: true }).fill(meal.calories)
  if (meal.protein) await page.getByLabel('Protein (g)').fill(meal.protein)
  if (meal.carbs) await page.getByLabel('Carbs (g)').fill(meal.carbs)
  if (meal.fat) await page.getByLabel('Fat (g)').fill(meal.fat)

  await page.getByRole('button', { name: 'Log meal' }).click()
  await page.waitForURL('/')
  await finishLogConfirmation(page, meal.name, options?.dismissCelebration !== false)
}
