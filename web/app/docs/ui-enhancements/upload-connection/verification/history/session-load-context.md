# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session-expiry.spec.ts >> cold refresh expiry returns the same account to its hydrated corrected review once
- Location: e2e\session-expiry.spec.ts:56:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "http://localhost:5294/review", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page, type Route } from '@playwright/test'
  2   | import { visualSeedState, VISUAL_USER } from './seed'
  3   | import { openYouDestination, signInWithEmail } from './helpers'
  4   | 
  5   | const FOOD = { name: 'Unfinished private bowl', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }
  6   | 
  7   | /** Exercises the cloud client lifecycle with simulated local auth/state responses, never a live account. */
  8   | async function service(page: Page, refreshAllowed: boolean) {
  9   |   const controls = { refreshAllowed, holdNextWrite: false, held: null as Route | null, saved: visualSeedState(), version: 1, activeUser: { ...VISUAL_USER } }
  10  |   const token = () => `e2e.${Buffer.from(JSON.stringify({ sub: controls.activeUser.sub, iat: 1_791_486_000 })).toString('base64url')}.simulated`
  11  |   await page.addInitScript(user => {
  12  |     sessionStorage.setItem('poiem-splash-seen', '1')
  13  |     localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
  14  |     window.__POIEM_TEST__ = { hideOverlay: true }
  15  |   }, VISUAL_USER)
  16  |   await page.route('**/api/**', async route => {
  17  |     const url = new URL(route.request().url())
  18  |     if (url.pathname === '/api/auth') {
  19  |       const action = url.searchParams.get('action')
  20  |       if (action === 'refresh' && !controls.refreshAllowed) return route.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
  21  |       if (action === 'login') {
  22  |         const body = route.request().postDataJSON() as { email: string }
  23  |         if (body.email === 'other@poiem.test') {
  24  |           controls.activeUser = { ...VISUAL_USER, sub: 'other-account', email: body.email, name: 'Other person' }
  25  |           controls.saved = visualSeedState()
  26  |           controls.saved.profile.name = 'Other person'
  27  |           controls.saved.foodEntries = []
  28  |         }
  29  |         controls.refreshAllowed = true
  30  |       }
  31  |       return route.fulfill({ json: { token: token(), user: controls.activeUser, ok: true } })
  32  |     }
  33  |     if (url.pathname === '/api/state') {
  34  |       if (route.request().method() === 'GET') return route.fulfill({ json: { state: controls.saved, version: controls.version } })
  35  |       if (controls.holdNextWrite) {
  36  |         controls.holdNextWrite = false
  37  |         controls.held = route
  38  |         return
  39  |       }
  40  |       controls.saved = route.request().postDataJSON().state
  41  |       controls.version += 1
  42  |       return route.fulfill({ json: { version: controls.version } })
  43  |     }
  44  |     return route.fulfill({ status: 503, json: { error: 'Simulated service is unavailable' } })
  45  |   })
  46  |   return controls
  47  | }
  48  | 
  49  | async function seedReview(page: Page) {
  50  |   await page.addInitScript(food => {
  51  |     const draft = { version: 1, review: { analysis: { ...food, calories: 460 }, baseAnalysis: { ...food, calories: 460 }, originalAnalysis: food, mealType: 'dinner', servings: 1, source: 'textInput', emptyNumericFields: [], updatedAt: new Date().toISOString() } }
  52  |     localStorage.setItem('fud-log-drafts-v1-visual-ada', JSON.stringify(draft))
  53  |   }, FOOD)
  54  | }
  55  | 
  56  | test('cold refresh expiry returns the same account to its hydrated corrected review once', async ({ page }) => {
  57  |   await service(page, false)
  58  |   await seedReview(page)
> 59  |   await page.goto('/review')
      |              ^ Error: page.goto: Test timeout of 60000ms exceeded.
  60  |   await expect(page).toHaveURL('/login')
  61  |   await expect(page.getByRole('status').filter({ hasText: 'Your session ended' })).toContainText('meal review')
  62  |   await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  63  |   await expect(page).toHaveURL('/review')
  64  |   await expect(page.getByLabel('Food name', { exact: true })).toHaveValue(FOOD.name)
  65  |   await expect(page.getByRole('spinbutton', { name: /^Calories/ })).toHaveValue('460')
  66  |   await expect(page.getByRole('button', { name: 'Dinner', exact: true })).toHaveAttribute('aria-pressed', 'true')
  67  |   await page.goto('/settings?panel=momo')
  68  |   await expect(page).toHaveURL('/settings?panel=momo')
  69  |   await expect(page.getByRole('switch', { name: 'Show Momo', exact: true })).toBeVisible()
  70  | })
  71  | 
  72  | test('a 401 on a queued write preserves work and restores the settings panel after sign-in', async ({ page }) => {
  73  |   const controls = await service(page, true)
  74  |   await page.goto('/')
  75  |   await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  76  |   controls.holdNextWrite = true
  77  |   await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  78  |   await expect.poll(() => Boolean(controls.held)).toBe(true)
  79  |   await page.getByLabel('Main').getByRole('link', { name: 'You', exact: true }).click()
  80  |   await openYouDestination(page, 'AI setup')
  81  |   await expect(page).toHaveURL('/settings?panel=ai')
  82  |   controls.refreshAllowed = false
  83  |   await controls.held!.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
  84  |   await expect(page).toHaveURL('/login')
  85  |   await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  86  |   await expect(page).toHaveURL('/settings?panel=ai')
  87  |   await expect.poll(() => Object.values(controls.saved.gamification.waterByDate).some(value => value === 1)).toBe(true)
  88  | })
  89  | 
  90  | test('signing into another account drops the old destination and private draft', async ({ page }) => {
  91  |   await service(page, false)
  92  |   await seedReview(page)
  93  |   await page.goto('/review')
  94  |   await expect(page).toHaveURL('/login')
  95  |   await signInWithEmail(page, 'other@poiem.test', 'SimulatedPass123!')
  96  |   await expect(page).toHaveURL('/')
  97  |   await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  98  |   await expect(page.getByText(FOOD.name, { exact: true })).toHaveCount(0)
  99  |   await page.goto('/review')
  100 |   await expect(page.getByRole('heading', { name: 'Let’s start with a meal.', exact: true })).toBeVisible()
  101 | })
  102 | 
  103 | test('an expired review without a valid hydrated draft returns to the meal picker', async ({ page }) => {
  104 |   await service(page, false)
  105 |   await page.goto('/review')
  106 |   await expect(page).toHaveURL('/login')
  107 |   await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  108 |   await expect(page).toHaveURL('/log')
  109 |   await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
  110 | })
  111 | 
  112 | test('session expiry preserves the selected journal day after a same-account return', async ({ page }) => {
  113 |   const controls = await service(page, true)
  114 |   await page.goto('/')
  115 |   await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  116 |   controls.holdNextWrite = true
  117 |   await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  118 |   await expect.poll(() => Boolean(controls.held)).toBe(true)
  119 |   const yesterdayLabel = await page.evaluate(() => {
  120 |     const day = new Date()
  121 |     day.setDate(day.getDate() - 1)
  122 |     return day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  123 |   })
  124 |   await page.getByRole('button', { name: 'Choose date', exact: true }).click()
  125 |   await page.getByRole('dialog', { name: 'Choose a date', exact: true }).getByRole('button', { name: yesterdayLabel, exact: true }).click()
  126 |   await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
  127 |   controls.refreshAllowed = false
  128 |   await controls.held!.fulfill({ status: 401, json: { error: 'Simulated session expired' } })
  129 |   await expect(page).toHaveURL('/login')
  130 |   await signInWithEmail(page, VISUAL_USER.email, 'SimulatedPass123!')
  131 |   await expect(page).toHaveURL('/')
  132 |   await expect(page.getByRole('heading', { name: 'Yesterday', exact: true })).toBeVisible()
  133 |   await expect(page.getByRole('button', { name: 'Add a glass of water', exact: true })).toHaveCount(0)
  134 | })
  135 | 
  136 | test('cloud password recovery retains setup context without forwarding private URL fields', async ({ page }) => {
  137 |   await service(page, false)
  138 |   await page.goto('/login?setup=1&token=private-token&email=private-email')
  139 |   await expect(page.getByRole('link', { name: 'Back to setup', exact: true })).toHaveAttribute('href', '/onboarding')
  140 |   await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
  141 |   await expect(page).toHaveURL('/forgot-password?setup=1')
  142 |   await page.getByRole('link', { name: 'Back to sign in', exact: true }).click()
  143 |   await expect(page).toHaveURL('/login?setup=1')
  144 | })
  145 | 
```