# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> saved 390 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  7033 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: saved-390-dark.png

Call log:
  - Expect "toHaveScreenshot(saved-390-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 7033 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 7033 pixels (ratio 0.02 of all image pixels) are different.

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
  - main [ref=e32]:
    - generic [ref=e33]:
      - paragraph [ref=e34]: Your usuals
      - heading "Saved" [active] [level=1] [ref=e35]
      - paragraph [ref=e36]: Pinned meals stay up top. Recents skip anything already pinned.
    - generic [ref=e37]: Find a saved or recent meal
    - generic [ref=e38]:
      - img [ref=e39]
      - searchbox "Find a saved or recent meal" [ref=e42]
    - group "Filter saved meals by type" [ref=e43]:
      - button "All" [pressed] [ref=e44] [cursor=pointer]
      - button "Breakfast" [ref=e45] [cursor=pointer]
      - button "Lunch" [ref=e46] [cursor=pointer]
      - button "Dinner" [ref=e47] [cursor=pointer]
      - button "Snack" [ref=e48] [cursor=pointer]
      - button "Other" [ref=e49] [cursor=pointer]
    - status [ref=e50]: 1 saved · 2 recent in your collection
    - generic [ref=e51]:
      - region "Pinned meals" [ref=e52]:
        - generic [ref=e53]:
          - heading "Pinned" [level=2] [ref=e54]
          - generic [ref=e55]: "1"
        - article "Overnight oats" [ref=e57]:
          - generic [ref=e58]:
            - img [ref=e60]
            - button "Unfavorite Overnight oats" [pressed] [ref=e66] [cursor=pointer]:
              - img [ref=e67]
          - heading "Overnight oats" [level=3] [ref=e69]
          - generic [ref=e70]: 320 kcal
          - paragraph [ref=e71]: Total for 1× portion
          - paragraph [ref=e72]: Protein 12g · Carbs 52g · Fat 8g
          - generic [ref=e77]:
            - generic [ref=e78]:
              - button "Decrease servings for Overnight oats" [ref=e79] [cursor=pointer]:
                - img [ref=e80]
              - generic [ref=e81]: 1×
              - button "Increase servings for Overnight oats" [ref=e82] [cursor=pointer]:
                - img [ref=e83]
            - button "Log Overnight oats, 1 times portion" [ref=e84] [cursor=pointer]: Log meal
      - region "Recent meals" [ref=e85]:
        - generic [ref=e86]:
          - img [ref=e88]
          - heading "Recents" [level=2] [ref=e92]
          - generic [ref=e93]: "2"
        - generic [ref=e94]:
          - article "Tomato soup" [ref=e96]:
            - img [ref=e98]
            - generic [ref=e104]:
              - heading "Tomato soup" [level=3] [ref=e105]
              - generic [ref=e106]:
                - generic [ref=e107]: 280 kcal
                - generic [ref=e108]:
                  - generic [ref=e109]: Protein 8g
                  - text: ·
                  - generic [ref=e110]: Carbs 32g
                  - text: ·
                  - generic [ref=e111]: Fat 10g
              - generic [ref=e112]: Dinner
              - paragraph [ref=e113]: Total for 1× portion
            - generic [ref=e114]:
              - button "Favorite Tomato soup" [ref=e115] [cursor=pointer]:
                - img [ref=e116]
              - button "Portion" [ref=e118] [cursor=pointer]
              - button "Log Tomato soup, 1 times portion" [ref=e119] [cursor=pointer]: Log meal
          - article "Chicken rice bowl" [ref=e122]:
            - img [ref=e124]
            - generic [ref=e127]:
              - heading "Chicken rice bowl" [level=3] [ref=e128]
              - generic [ref=e129]:
                - generic [ref=e130]: 540 kcal
                - generic [ref=e131]:
                  - generic [ref=e132]: Protein 38g
                  - text: ·
                  - generic [ref=e133]: Carbs 48g
                  - text: ·
                  - generic [ref=e134]: Fat 16g
              - generic [ref=e135]: Lunch
              - paragraph [ref=e136]: Total for 1× portion
            - generic [ref=e137]:
              - button "Favorite Chicken rice bowl" [ref=e138] [cursor=pointer]:
                - img [ref=e139]
              - button "Portion" [ref=e141] [cursor=pointer]
              - button "Log Chicken rice bowl, 1 times portion" [ref=e142] [cursor=pointer]: Log meal
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