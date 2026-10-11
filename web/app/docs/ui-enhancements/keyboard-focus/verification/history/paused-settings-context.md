# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-deep-link-recovery.spec.ts >> a direct AI setup panel keeps its section focus after the route frame
- Location: e2e\settings-deep-link-recovery.spec.ts:23:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 0

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - navigation "Main" [ref=e5]:
    - generic [ref=e6]:
      - link "Poiem home" [ref=e7] [cursor=pointer]:
        - /url: /
        - img [ref=e8]
      - link "Ada" [ref=e11] [cursor=pointer]:
        - /url: /settings
    - generic [ref=e12]:
      - link "Today" [ref=e13] [cursor=pointer]:
        - /url: /
        - generic [ref=e14]:
          - img [ref=e15]
          - generic [ref=e18]: Today
      - link "Insights" [ref=e19] [cursor=pointer]:
        - /url: /progress
        - generic [ref=e20]:
          - img [ref=e21]
          - generic [ref=e23]: Insights
      - button "Log a meal" [ref=e24] [cursor=pointer]:
        - img [ref=e26]
        - generic [ref=e27]: Log meal
      - link "Saved" [ref=e28] [cursor=pointer]:
        - /url: /discover
        - generic [ref=e29]:
          - img [ref=e30]
          - generic [ref=e32]: Saved
      - link "You" [ref=e33] [cursor=pointer]:
        - /url: /settings
        - generic [ref=e34]:
          - img [ref=e35]
          - generic [ref=e38]: You
  - main [ref=e40]:
    - status [ref=e41]: Opening…
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { applyVisualSeed, VISUAL_NOW } from './seed'
  3  | 
  4  | test.beforeEach(async ({ page }) => {
  5  |   await page.route('**/api/**', route => route.abort('blockedbyclient'))
  6  |   await applyVisualSeed(page)
  7  | })
  8  | 
  9  | test('a valid Settings deep link focuses the recovery heading when its screen download fails', async ({ page }) => {
  10 |   await page.route('**/src/pages/SettingsPage.tsx*', route => route.abort('failed'))
  11 |   await page.goto('/settings?panel=data#setting-import')
  12 |   await expect(page.getByRole('heading', { name: 'Couldn’t open this screen', exact: true })).toBeFocused()
  13 |   await page.getByRole('link', { name: 'Return to Today', exact: true }).click()
  14 |   await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  15 | })
  16 | 
  17 | test('an overview Appearance deep link keeps focus on its setting', async ({ page }) => {
  18 |   await page.goto('/settings#you-appearance')
  19 |   await expect(page.locator('#you-appearance')).toBeFocused()
  20 |   await expect(page.getByRole('group', { name: 'Appearance', exact: true })).toBeVisible()
  21 | })
  22 | 
  23 | test('a direct AI setup panel keeps its section focus after the route frame', async ({ page }) => {
  24 |   // Allow React to mount the lazy screen before checking its panel focus.
  25 |   await page.clock.pauseAt(new Date(Date.parse(VISUAL_NOW) + 1000))
  26 |   await page.goto('/settings?panel=ai')
  27 |   const panel = page.locator('#you-ai')
  28 |   await expect.poll(async () => {
  29 |     await page.clock.runFor(16)
  30 |     return panel.count()
> 31 |   }).toBe(1)
     |      ^ Error: expect(received).toBe(expected) // Object.is equality
  32 |   await expect(panel).toBeFocused()
  33 |   await page.clock.runFor(200)
  34 |   await expect(panel).toBeFocused()
  35 | })
  36 | 
```