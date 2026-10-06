# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> saved 1440 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  7546 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: saved-1440-dark.png

Call log:
  - Expect "toHaveScreenshot(saved-1440-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 7546 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 7546 pixels (ratio 0.01 of all image pixels) are different.

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
    - generic [ref=e41]:
      - paragraph [ref=e42]: Your usuals
      - heading "Saved" [active] [level=1] [ref=e43]
      - paragraph [ref=e44]: Pinned meals stay up top. Recents skip anything already pinned.
    - generic [ref=e45]: Find a saved or recent meal
    - generic [ref=e46]:
      - img [ref=e47]
      - searchbox "Find a saved or recent meal" [ref=e50]
    - group "Filter saved meals by type" [ref=e51]:
      - button "All" [pressed] [ref=e52] [cursor=pointer]
      - button "Breakfast" [ref=e53] [cursor=pointer]
      - button "Lunch" [ref=e54] [cursor=pointer]
      - button "Dinner" [ref=e55] [cursor=pointer]
      - button "Snack" [ref=e56] [cursor=pointer]
      - button "Other" [ref=e57] [cursor=pointer]
    - status [ref=e58]: 1 saved · 2 recent in your collection
    - generic [ref=e59]:
      - region "Pinned meals" [ref=e60]:
        - generic [ref=e61]:
          - heading "Pinned" [level=2] [ref=e62]
          - generic [ref=e63]: "1"
        - article "Overnight oats" [ref=e65]:
          - generic [ref=e66]:
            - img [ref=e68]
            - button "Unfavorite Overnight oats" [pressed] [ref=e74] [cursor=pointer]:
              - img [ref=e75]
          - heading "Overnight oats" [level=3] [ref=e77]
          - generic [ref=e78]: 320 kcal
          - paragraph [ref=e79]: Total for 1× portion
          - paragraph [ref=e80]: Protein 12g · Carbs 52g · Fat 8g
          - generic [ref=e85]:
            - generic [ref=e86]:
              - button "Decrease servings for Overnight oats" [ref=e87] [cursor=pointer]:
                - img [ref=e88]
              - generic [ref=e89]: 1×
              - button "Increase servings for Overnight oats" [ref=e90] [cursor=pointer]:
                - img [ref=e91]
            - button "Log Overnight oats, 1 times portion" [ref=e92] [cursor=pointer]: Log meal
      - region "Recent meals" [ref=e93]:
        - generic [ref=e94]:
          - img [ref=e96]
          - heading "Recents" [level=2] [ref=e100]
          - generic [ref=e101]: "2"
        - generic [ref=e102]:
          - article "Tomato soup" [ref=e104]:
            - img [ref=e106]
            - generic [ref=e112]:
              - heading "Tomato soup" [level=3] [ref=e113]
              - generic [ref=e114]:
                - generic [ref=e115]: 280 kcal
                - generic [ref=e116]:
                  - generic [ref=e117]: Protein 8g
                  - text: ·
                  - generic [ref=e118]: Carbs 32g
                  - text: ·
                  - generic [ref=e119]: Fat 10g
              - generic [ref=e120]: Dinner
              - paragraph [ref=e121]: Total for 1× portion
            - generic [ref=e122]:
              - button "Favorite Tomato soup" [ref=e123] [cursor=pointer]:
                - img [ref=e124]
              - button "Portion" [ref=e126] [cursor=pointer]
              - button "Log Tomato soup, 1 times portion" [ref=e127] [cursor=pointer]: Log meal
          - article "Chicken rice bowl" [ref=e130]:
            - img [ref=e132]
            - generic [ref=e135]:
              - heading "Chicken rice bowl" [level=3] [ref=e136]
              - generic [ref=e137]:
                - generic [ref=e138]: 540 kcal
                - generic [ref=e139]:
                  - generic [ref=e140]: Protein 38g
                  - text: ·
                  - generic [ref=e141]: Carbs 48g
                  - text: ·
                  - generic [ref=e142]: Fat 16g
              - generic [ref=e143]: Lunch
              - paragraph [ref=e144]: Total for 1× portion
            - generic [ref=e145]:
              - button "Favorite Chicken rice bowl" [ref=e146] [cursor=pointer]:
                - img [ref=e147]
              - button "Portion" [ref=e149] [cursor=pointer]
              - button "Log Chicken rice bowl, 1 times portion" [ref=e150] [cursor=pointer]: Log meal
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