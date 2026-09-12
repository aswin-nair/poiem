import type { Page } from '@playwright/test'

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@fud-ai.test`
}

/** Measure the resting layout, not an intermediate entrance scale/translation. */
export async function settlePageLayout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    // A paused animation never resolves `finished`, so wait only on running ones, and never
    // longer than a few seconds: entrances are short, and a stuck wait hides the real assertion.
    const entrances = document.getAnimations().filter(animation => {
      const effect = animation.effect
      return animation.playState === 'running'
        && effect instanceof KeyframeEffect && effect.target instanceof Element
        && effect.target.closest('.app-shell') && Number.isFinite(effect.getComputedTiming().endTime)
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
 * Wait for a logged meal's confirmation and, when it is the full-screen
 * "Logged." moment, see it closed. That moment closes itself after a few
 * seconds, so Continue is a shortcut rather than a requirement: under load the
 * click can lose the race, and what matters is that the moment ends. Later
 * meals of the day confirm with a "Logged …" toast instead.
 */
async function finishLogConfirmation(page: Page, mealName: string, dismissCelebration: boolean): Promise<void> {
  const celebration = page.getByRole('dialog', { name: 'Meal logged' })
  const toast = page.locator('.toast').filter({ hasText: `Logged ${mealName}` })
  await celebration.or(toast).first().waitFor()
  if (!dismissCelebration || !await celebration.isVisible()) return
  await celebration.getByRole('button', { name: 'Continue' }).click({ timeout: 5_000 }).catch(() => undefined)
  await celebration.waitFor({ state: 'hidden' })
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
  await page.getByLabel('Calories').fill(meal.calories)
  if (meal.protein) await page.getByLabel('Protein (g)').fill(meal.protein)
  if (meal.carbs) await page.getByLabel('Carbs (g)').fill(meal.carbs)
  if (meal.fat) await page.getByLabel('Fat (g)').fill(meal.fat)

  await page.getByRole('button', { name: 'Log meal' }).click()
  await page.waitForURL('/')
  await finishLogConfirmation(page, meal.name, options?.dismissCelebration !== false)
}
