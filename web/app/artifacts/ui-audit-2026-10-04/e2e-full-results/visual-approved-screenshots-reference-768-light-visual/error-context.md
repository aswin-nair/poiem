# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> reference 768 light
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  10952 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: reference-768-light.png

Call log:
  - Expect "toHaveScreenshot(reference-768-light.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 10952 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 10952 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - banner [ref=e6]:
    - generic [ref=e7]:
      - paragraph [ref=e8]: Reference
      - heading "Components" [active] [level=1] [ref=e9]
      - paragraph [ref=e10]: Focus, disabled, error, and loading states for the shared primitives.
  - main [ref=e11]:
    - region "Surfaces" [ref=e12]:
      - heading "Surfaces" [level=2] [ref=e14]
      - paragraph [ref=e16]: Plain surface. No frame.
      - paragraph [ref=e18]: Outlined surface.
      - paragraph [ref=e20]: Hero surface. One per route.
    - region "Buttons" [ref=e21]:
      - heading "Buttons" [level=2] [ref=e23]
      - generic [ref=e24]:
        - button "Primary" [ref=e25] [cursor=pointer]:
          - generic [ref=e26]: Primary
        - button "Secondary" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]: Secondary
        - button "Ghost" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: Ghost
        - button "Delete" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: Delete
        - button "Disabled action" [disabled] [ref=e33]:
          - generic [ref=e34]: Disabled action
        - link "Disabled link" [disabled] [ref=e35]:
          - /url: /dev/components
          - generic [ref=e36]: Disabled link
        - button "Loading" [disabled] [ref=e37]:
          - generic [ref=e38]: Loading
      - status [ref=e39]: "Button activations: 0"
    - region "Fields" [ref=e40]:
      - heading "Fields" [level=2] [ref=e42]
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]: Food name
          - textbox "Food name" [ref=e46]: Overnight oats
          - paragraph [ref=e47]: What you ate.
        - generic [ref=e48]:
          - generic [ref=e49]: Calories
          - textbox "Calories" [invalid] [ref=e50]
          - alert [ref=e51]: Enter a number.
        - generic [ref=e52]:
          - generic [ref=e53]: Disabled
          - textbox "Disabled" [disabled] [ref=e54]: Held
        - generic [ref=e55]:
          - generic [ref=e56]: Focused example
          - textbox "Focused example" [ref=e57]: Tab here
      - group "Nutrition total" [ref=e58]:
        - generic [ref=e59]: Nutrition total
        - paragraph [ref=e60]: For the whole portion you’re logging. All four values are editable.
        - generic [ref=e61]:
          - generic [ref=e62]: Calories
          - generic [ref=e63]:
            - spinbutton "Calories kcal" [ref=e64]: "320"
            - generic [ref=e65]: kcal
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e68]: Protein
            - generic [ref=e69]:
              - spinbutton "Protein g" [ref=e70]: "12"
              - generic [ref=e71]: g
          - generic [ref=e72]:
            - generic [ref=e73]: Carbs
            - generic [ref=e74]:
              - spinbutton "Carbs g" [ref=e75]: "52"
              - generic [ref=e76]: g
          - generic [ref=e77]:
            - generic [ref=e78]: Fat
            - generic [ref=e79]:
              - spinbutton "Fat g" [ref=e80]: "8"
              - generic [ref=e81]: g
    - region "Filters" [ref=e82]:
      - heading "Filters" [level=2] [ref=e84]
      - group "Meal" [ref=e85]:
        - button "All" [pressed] [ref=e86] [cursor=pointer]
        - button "Breakfast" [ref=e87] [cursor=pointer]
        - button "Lunch" [ref=e88] [cursor=pointer]
      - button "Focus" [ref=e89] [cursor=pointer]
      - group "Disabled filters" [ref=e90]:
        - button "All" [disabled] [pressed] [ref=e91]
        - button "Held" [disabled] [ref=e92]
    - region "Meal row" [ref=e93]:
      - heading "Meal row" [level=2] [ref=e95]
      - button "Overnight oats8:15 · P 12 · C 52 · F 8320 kcal" [ref=e96] [cursor=pointer]:
        - generic [ref=e98]: Overnight oats8:15 · P 12 · C 52 · F 8
        - text: 320 kcal
    - region "Empty" [ref=e99]:
      - heading "Empty" [level=2] [ref=e101]
      - generic [ref=e102]:
        - img [ref=e103]
        - paragraph [ref=e108]: Your table is ready. Start with whatever you ate — you can change the details later.
    - region "Sheet" [ref=e109]:
      - heading "Sheet" [level=2] [ref=e111]
      - button "Open sheet" [ref=e112] [cursor=pointer]:
        - generic [ref=e113]: Open sheet
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