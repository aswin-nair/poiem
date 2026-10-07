# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> today 320 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  Expected an image 320px by 1466px, received 320px by 1538px. 73198 pixels (ratio 0.15 of all image pixels) are different.

  Snapshot: today-320-dark.png

Call log:
  - Expect "toHaveScreenshot(today-320-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - Expected an image 320px by 1466px, received 320px by 1538px. 73198 pixels (ratio 0.15 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - Expected an image 320px by 1466px, received 320px by 1538px. 73198 pixels (ratio 0.15 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - navigation "Main":
    - generic [ref=e5]:
      - link "Today" [ref=e6] [cursor=pointer]:
        - /url: /
        - generic [ref=e7]:
          - img [ref=e8]
          - generic [ref=e11]: Today
      - link "Insights" [ref=e12] [cursor=pointer]:
        - /url: /progress
        - generic [ref=e13]:
          - img [ref=e14]
          - generic [ref=e16]: Insights
      - button "Log a meal" [ref=e17] [cursor=pointer]:
        - img [ref=e19]
      - link "Saved" [ref=e20] [cursor=pointer]:
        - /url: /discover
        - generic [ref=e21]:
          - img [ref=e22]
          - generic [ref=e24]: Saved
      - link "You" [ref=e25] [cursor=pointer]:
        - /url: /settings
        - generic [ref=e26]:
          - img [ref=e27]
          - generic [ref=e30]: You
  - generic [ref=e31]:
    - banner [ref=e32]:
      - generic [ref=e33]:
        - paragraph [ref=e34]: Saturday, September 19
        - heading "Today" [active] [level=1] [ref=e35]
      - button "Choose date" [ref=e36] [cursor=pointer]:
        - img [ref=e37]
    - generic [ref=e41]:
      - button "Sunday, September 13" [ref=e42] [cursor=pointer]:
        - generic [ref=e43]: S
        - generic [ref=e44]: "13"
      - button "Monday, September 14" [ref=e46] [cursor=pointer]:
        - generic [ref=e47]: M
        - generic [ref=e48]: "14"
      - button "Tuesday, September 15" [ref=e50] [cursor=pointer]:
        - generic [ref=e51]: T
        - generic [ref=e52]: "15"
      - button "Wednesday, September 16" [ref=e54] [cursor=pointer]:
        - generic [ref=e55]: W
        - generic [ref=e56]: "16"
      - button "Thursday, September 17" [ref=e58] [cursor=pointer]:
        - generic [ref=e59]: T
        - generic [ref=e60]: "17"
      - button "Friday, September 18" [ref=e62] [cursor=pointer]:
        - generic [ref=e63]: F
        - generic [ref=e64]: "18"
      - button "Saturday, September 19, logged" [pressed] [ref=e66] [cursor=pointer]:
        - generic [ref=e67]: S
        - generic [ref=e68]: "19"
    - generic [ref=e70]:
      - generic:
        - img
      - main [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - complementary "A note from Momo" [ref=e75]:
              - button "Say something, Momo" [ref=e76] [cursor=pointer]:
                - img [ref=e78]
              - generic [ref=e116]:
                - paragraph [ref=e117]: Evening, Ada!
                - paragraph [ref=e118]: You showed up. That’s the part worth celebrating.
            - region "Today’s snapshot" [ref=e119]:
              - heading "Today’s snapshot" [level=2] [ref=e120]
              - paragraph [ref=e121]:
                - strong [ref=e122]: "860"
                - img [ref=e123]
                - generic [ref=e125]: kcal left
              - progressbar "Calories" [ref=e126]
              - paragraph [ref=e128]:
                - generic [ref=e129]: 1,140 eaten
                - generic [ref=e130]: 2,000 guide
            - region "Macros" [ref=e131]:
              - generic [ref=e132]:
                - generic [ref=e133]: Protein
                - generic [ref=e135]:
                  - strong [ref=e136]: "58"
                  - text: / 110 g
                - progressbar "Protein" [ref=e137]
              - generic [ref=e139]:
                - generic [ref=e140]: Carbs
                - generic [ref=e142]:
                  - strong [ref=e143]: "132"
                  - text: / 220 g
                - progressbar "Carbs" [ref=e144]
              - generic [ref=e146]:
                - generic [ref=e147]: Fat
                - generic [ref=e149]:
                  - strong [ref=e150]: "34"
                  - text: / 65 g
                - progressbar "Fat" [ref=e151]
            - region "Water and notes" [ref=e153]:
              - generic [ref=e154]:
                - generic [ref=e156]:
                  - img [ref=e157]
                  - text: Water
                - group "Water glasses" [ref=e169]:
                  - button "Remove a glass of water" [ref=e170] [cursor=pointer]: −
                  - generic [ref=e171]: 3/8
                  - button "Add a glass of water" [ref=e172] [cursor=pointer]: +
              - button "Add a kitchen note" [ref=e173] [cursor=pointer]
          - region "Meals" [ref=e174]:
            - generic [ref=e175]:
              - heading "Meals" [level=2] [ref=e176]
              - generic [ref=e177]: 3 meals · 1,140 kcal
            - region "Breakfast" [ref=e178]:
              - generic [ref=e179]:
                - img [ref=e181]
                - heading "Breakfast" [level=3] [ref=e186]
                - generic [ref=e187]: 320 kcal
              - generic [ref=e188]:
                - generic "Actions for Overnight oats" [ref=e189]:
                  - button "Edit" [ref=e190] [cursor=pointer]
                  - button "Delete" [ref=e191] [cursor=pointer]
                - button "Overnight oats 8:15 AM · P 12 · C 52 · F 8 320 kcal" [ref=e193] [cursor=pointer]:
                  - img [ref=e195]
                  - generic [ref=e201]:
                    - text: Overnight oats
                    - generic [ref=e202]: 8:15 AM · P 12 · C 52 · F 8
                  - generic [ref=e203]: 320 kcal
              - button "Add breakfast" [ref=e204] [cursor=pointer]:
                - img [ref=e206]
                - text: Add breakfast
            - region "Lunch" [ref=e207]:
              - generic [ref=e208]:
                - img [ref=e210]
                - heading "Lunch" [level=3] [ref=e216]
                - generic [ref=e217]: 540 kcal
              - generic [ref=e218]:
                - generic "Actions for Chicken rice bowl" [ref=e219]:
                  - button "Edit" [ref=e220] [cursor=pointer]
                  - button "Delete" [ref=e221] [cursor=pointer]
                - button "Chicken rice bowl 12:40 PM · P 38 · C 48 · F 16 540 kcal" [ref=e223] [cursor=pointer]:
                  - img [ref=e225]
                  - generic [ref=e228]:
                    - text: Chicken rice bowl
                    - generic [ref=e229]: 12:40 PM · P 38 · C 48 · F 16
                  - generic [ref=e230]: 540 kcal
              - button "Add lunch" [ref=e231] [cursor=pointer]:
                - img [ref=e233]
                - text: Add lunch
            - region "Dinner" [ref=e234]:
              - generic [ref=e235]:
                - img [ref=e237]
                - heading "Dinner" [level=3] [ref=e239]
                - generic [ref=e240]: 280 kcal
              - generic [ref=e241]:
                - generic "Actions for Tomato soup" [ref=e242]:
                  - button "Edit" [ref=e243] [cursor=pointer]
                  - button "Delete" [ref=e244] [cursor=pointer]
                - button "Tomato soup 6:20 PM · P 8 · C 32 · F 10 280 kcal" [ref=e246] [cursor=pointer]:
                  - img [ref=e248]
                  - generic [ref=e254]:
                    - text: Tomato soup
                    - generic [ref=e255]: 6:20 PM · P 8 · C 32 · F 10
                  - generic [ref=e256]: 280 kcal
              - button "Add dinner" [ref=e257] [cursor=pointer]:
                - img [ref=e259]
                - text: Add dinner
            - region "Snack" [ref=e260]:
              - generic [ref=e261]:
                - img [ref=e263]
                - heading "Snack" [level=3] [ref=e272]
              - button "Add snack" [ref=e273] [cursor=pointer]:
                - img [ref=e275]
                - text: Add snack
      - status [ref=e276]
```

# Test source

```ts
  1  | import { expect, test, type Locator, type Page } from '@playwright/test'
  2  | import { settlePageLayout } from './helpers'
  3  | import { applyVisualSeed } from './seed'
  4  | 
  5  | const WIDTHS = [320, 390, 768, 1440] as const
  6  | /* The two widths that decide a composition: one phone column, one desktop rail. */
  7  | const PHONE_AND_DESKTOP = [390, 1440] as const
  8  | const THEMES = ['light', 'dark'] as const
  9  | 
  10 | type Surface = {
  11 |   name: string
  12 |   path: string
  13 |   /** Waited on before the capture, so the shot never lands mid-render. */
  14 |   ready: (page: Page) => Locator
  15 |   /** Defaults to every width; the phase 2 screens only lock the two that matter. */
  16 |   widths?: readonly number[]
  17 | }
  18 | 
  19 | const SURFACES: readonly Surface[] = [
  20 |   { name: 'today', path: '/', ready: page => page.getByRole('progressbar', { name: 'Calories' }) },
  21 |   { name: 'reference', path: '/dev/components', ready: page => page.getByRole('heading', { name: 'Components' }) },
  22 |   { name: 'log-sheet', path: '/log', ready: page => page.getByRole('dialog', { name: 'Log a meal' }), widths: PHONE_AND_DESKTOP },
  23 |   { name: 'describe', path: '/log/text', ready: page => page.getByLabel('Your meal, your words'), widths: PHONE_AND_DESKTOP },
  24 |   { name: 'manual', path: '/log/manual', ready: page => page.getByLabel('Food name'), widths: PHONE_AND_DESKTOP },
  25 |   { name: 'saved', path: '/discover', ready: page => page.getByRole('heading', { name: 'Saved', exact: true }), widths: PHONE_AND_DESKTOP },
  26 |   { name: 'insights', path: '/progress', ready: page => page.getByRole('region', { name: 'Journey' }), widths: PHONE_AND_DESKTOP },
  27 |   { name: 'you', path: '/settings', ready: page => page.getByRole('heading', { name: 'You', exact: true }), widths: PHONE_AND_DESKTOP },
  28 |   { name: 'coach', path: '/coach', ready: page => page.getByRole('heading', { name: 'AI Coach' }), widths: PHONE_AND_DESKTOP },
  29 | ]
  30 | 
  31 | async function prepare(page: Page, width: number, theme: 'light' | 'dark') {
  32 |   await page.setViewportSize({ width, height: 900 })
  33 |   await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  34 |   await applyVisualSeed(page)
  35 | }
  36 | 
  37 | test.describe('approved screenshots', () => {
  38 |   for (const surface of SURFACES) {
  39 |     for (const width of surface.widths ?? WIDTHS) {
  40 |       for (const theme of THEMES) {
  41 |         test(`${surface.name} ${width} ${theme}`, async ({ page }) => {
  42 |           await prepare(page, width, theme)
  43 |           await page.goto(surface.path)
  44 |           await expect(surface.ready(page)).toBeVisible()
  45 |           await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  46 |           await settlePageLayout(page)
  47 |           await page.addStyleTag({ content: '@media (max-width: 1119px) { .k-app .bottom-nav-wrap { position: absolute; top: auto; } }' })
  48 |           const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
  49 |           expect(fits, `${surface.name} scrolls sideways at ${width}px ${theme}`).toBe(true)
> 50 |           await expect(page).toHaveScreenshot(`${surface.name}-${width}-${theme}.png`, {
     |                              ^ Error: expect(page).toHaveScreenshot(expected) failed
  51 |             // The log sheet is an overlay; a full-page shot of it would mostly be
  52 |             // the page underneath.
  53 |             fullPage: surface.name !== 'log-sheet',
  54 |             animations: 'disabled',
  55 |           })
  56 |         })
  57 |       }
  58 |     }
  59 |   }
  60 | })
  61 | 
  62 | test('Today fields stay aligned and Momo stays off the numbers', async ({ page }) => {
  63 |   await prepare(page, 390, 'light')
  64 |   await page.goto('/')
  65 |   await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
  66 |   await settlePageLayout(page)
  67 | 
  68 |   const layout = await page.evaluate(() => {
  69 |     const macros = [...document.querySelectorAll('.k-macro')].map(node => node.getBoundingClientRect())
  70 |     const meals = document.querySelector('.k-meals')?.getBoundingClientRect()
  71 |     const overlay = document.querySelector('.mascot-overlay')
  72 |     const protectedRegion = document.querySelector('[data-mascot-avoid].k-today-main')?.getBoundingClientRect()
  73 |     return {
  74 |       macroLefts: macros.map(box => Math.round(box.left)),
  75 |       macroHeights: macros.map(box => Math.round(box.height)),
  76 |       mealsTop: meals ? Math.round(meals.top) : 0,
  77 |       overlay: overlay?.getBoundingClientRect() ?? null,
  78 |       protected: protectedRegion
  79 |         ? { left: protectedRegion.left, right: protectedRegion.right, top: protectedRegion.top, bottom: protectedRegion.bottom }
  80 |         : null,
  81 |     }
  82 |   })
  83 | 
  84 |   expect(layout.macroLefts.length).toBe(3)
  85 |   expect(Math.max(...layout.macroHeights) - Math.min(...layout.macroHeights)).toBeLessThanOrEqual(4)
  86 |   expect(layout.overlay).toBeNull()
  87 |   expect(layout.protected).not.toBeNull()
  88 | })
  89 | 
```