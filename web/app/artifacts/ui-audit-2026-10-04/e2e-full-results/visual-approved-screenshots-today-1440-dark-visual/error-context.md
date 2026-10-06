# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> today 1440 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  6645 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: today-1440-dark.png

Call log:
  - Expect "toHaveScreenshot(today-1440-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 6645 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 6645 pixels (ratio 0.01 of all image pixels) are different.

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
  - generic [ref=e39]:
    - banner [ref=e40]:
      - generic [ref=e41]:
        - paragraph [ref=e42]: Saturday, September 19
        - heading "Today" [active] [level=1] [ref=e43]
      - button "Choose date" [ref=e44] [cursor=pointer]:
        - img [ref=e45]
    - generic [ref=e49]:
      - button "Sunday, September 13" [ref=e50] [cursor=pointer]:
        - generic [ref=e51]: S
        - generic [ref=e52]: "13"
      - button "Monday, September 14" [ref=e54] [cursor=pointer]:
        - generic [ref=e55]: M
        - generic [ref=e56]: "14"
      - button "Tuesday, September 15" [ref=e58] [cursor=pointer]:
        - generic [ref=e59]: T
        - generic [ref=e60]: "15"
      - button "Wednesday, September 16" [ref=e62] [cursor=pointer]:
        - generic [ref=e63]: W
        - generic [ref=e64]: "16"
      - button "Thursday, September 17" [ref=e66] [cursor=pointer]:
        - generic [ref=e67]: T
        - generic [ref=e68]: "17"
      - button "Friday, September 18" [ref=e70] [cursor=pointer]:
        - generic [ref=e71]: F
        - generic [ref=e72]: "18"
      - button "Saturday, September 19, logged" [pressed] [ref=e74] [cursor=pointer]:
        - generic [ref=e75]: S
        - generic [ref=e76]: "19"
    - generic [ref=e78]:
      - generic:
        - img
      - main [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]:
            - complementary "A note from Momo" [ref=e83]:
              - button "Say something, Momo" [ref=e84] [cursor=pointer]:
                - img [ref=e86]
              - generic [ref=e124]:
                - paragraph [ref=e125]: Evening, Ada!
                - paragraph [ref=e126]: You showed up. That’s the part worth celebrating.
            - region "Today’s snapshot" [ref=e127]:
              - heading "Today’s snapshot" [level=2] [ref=e128]
              - paragraph [ref=e129]:
                - strong [ref=e130]: "860"
                - img [ref=e131]
                - generic [ref=e133]: kcal left
              - progressbar "Calories" [ref=e134]
              - paragraph [ref=e136]:
                - generic [ref=e137]: 1,140 eaten
                - generic [ref=e138]: 2,000 guide
            - region "Macros" [ref=e139]:
              - generic [ref=e140]:
                - generic [ref=e141]: Protein
                - generic [ref=e143]:
                  - strong [ref=e144]: "58"
                  - text: / 110 g
                - progressbar "Protein" [ref=e145]
              - generic [ref=e147]:
                - generic [ref=e148]: Carbs
                - generic [ref=e150]:
                  - strong [ref=e151]: "132"
                  - text: / 220 g
                - progressbar "Carbs" [ref=e152]
              - generic [ref=e154]:
                - generic [ref=e155]: Fat
                - generic [ref=e157]:
                  - strong [ref=e158]: "34"
                  - text: / 65 g
                - progressbar "Fat" [ref=e159]
            - region "Water and notes" [ref=e161]:
              - generic [ref=e162]:
                - generic [ref=e164]:
                  - img [ref=e165]
                  - text: Water
                - group "Water glasses" [ref=e177]:
                  - button "Remove a glass of water" [ref=e178] [cursor=pointer]: −
                  - generic [ref=e179]: 3/8
                  - button "Add a glass of water" [ref=e180] [cursor=pointer]: +
              - button "Add a kitchen note" [ref=e181] [cursor=pointer]
          - region "Meals" [ref=e182]:
            - generic [ref=e183]:
              - heading "Meals" [level=2] [ref=e184]
              - generic [ref=e185]: 3 meals · 1,140 kcal
            - region "Breakfast" [ref=e186]:
              - generic [ref=e187]:
                - img [ref=e189]
                - heading "Breakfast" [level=3] [ref=e194]
                - generic [ref=e195]: 320 kcal
              - generic [ref=e196]:
                - generic "Actions for Overnight oats" [ref=e197]:
                  - button "Edit" [ref=e198] [cursor=pointer]
                  - button "Delete" [ref=e199] [cursor=pointer]
                - button "Overnight oats 8:15 AM · P 12 · C 52 · F 8 320 kcal" [ref=e201] [cursor=pointer]:
                  - img [ref=e203]
                  - generic [ref=e209]:
                    - text: Overnight oats
                    - generic [ref=e210]: 8:15 AM · P 12 · C 52 · F 8
                  - generic [ref=e211]: 320 kcal
              - button "Add breakfast" [ref=e212] [cursor=pointer]:
                - img [ref=e214]
                - text: Add breakfast
            - region "Lunch" [ref=e215]:
              - generic [ref=e216]:
                - img [ref=e218]
                - heading "Lunch" [level=3] [ref=e224]
                - generic [ref=e225]: 540 kcal
              - generic [ref=e226]:
                - generic "Actions for Chicken rice bowl" [ref=e227]:
                  - button "Edit" [ref=e228] [cursor=pointer]
                  - button "Delete" [ref=e229] [cursor=pointer]
                - button "Chicken rice bowl 12:40 PM · P 38 · C 48 · F 16 540 kcal" [ref=e231] [cursor=pointer]:
                  - img [ref=e233]
                  - generic [ref=e236]:
                    - text: Chicken rice bowl
                    - generic [ref=e237]: 12:40 PM · P 38 · C 48 · F 16
                  - generic [ref=e238]: 540 kcal
              - button "Add lunch" [ref=e239] [cursor=pointer]:
                - img [ref=e241]
                - text: Add lunch
            - region "Dinner" [ref=e242]:
              - generic [ref=e243]:
                - img [ref=e245]
                - heading "Dinner" [level=3] [ref=e247]
                - generic [ref=e248]: 280 kcal
              - generic [ref=e249]:
                - generic "Actions for Tomato soup" [ref=e250]:
                  - button "Edit" [ref=e251] [cursor=pointer]
                  - button "Delete" [ref=e252] [cursor=pointer]
                - button "Tomato soup 6:20 PM · P 8 · C 32 · F 10 280 kcal" [ref=e254] [cursor=pointer]:
                  - img [ref=e256]
                  - generic [ref=e262]:
                    - text: Tomato soup
                    - generic [ref=e263]: 6:20 PM · P 8 · C 32 · F 10
                  - generic [ref=e264]: 280 kcal
              - button "Add dinner" [ref=e265] [cursor=pointer]:
                - img [ref=e267]
                - text: Add dinner
            - region "Snack" [ref=e268]:
              - generic [ref=e269]:
                - img [ref=e271]
                - heading "Snack" [level=3] [ref=e280]
              - button "Add snack" [ref=e281] [cursor=pointer]:
                - img [ref=e283]
                - text: Add snack
      - status [ref=e284]
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