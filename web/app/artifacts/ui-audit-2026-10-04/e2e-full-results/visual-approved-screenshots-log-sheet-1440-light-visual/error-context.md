# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> log-sheet 1440 light
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  6956 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: log-sheet-1440-light.png

Call log:
  - Expect "toHaveScreenshot(log-sheet-1440-light.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 6956 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 6956 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e2]:
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
        - button "Log a meal" [expanded] [ref=e24] [cursor=pointer]:
          - img [ref=e26]
          - generic [ref=e29]: Log meal
        - link "Saved" [ref=e30] [cursor=pointer]:
          - /url: /discover
          - generic [ref=e31]:
            - img [ref=e32]
            - generic [ref=e34]: Saved
        - link "You" [ref=e35] [cursor=pointer]:
          - /url: /settings
          - generic [ref=e36]:
            - img [ref=e37]
            - generic [ref=e40]: You
    - generic [ref=e41]:
      - banner [ref=e42]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Saturday, September 19
          - heading "Today" [level=1] [ref=e45]
        - button "Choose date" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
      - generic [ref=e51]:
        - button "Sunday, September 13" [ref=e52] [cursor=pointer]:
          - generic [ref=e53]: S
          - generic [ref=e54]: "13"
        - button "Monday, September 14" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: M
          - generic [ref=e58]: "14"
        - button "Tuesday, September 15" [ref=e60] [cursor=pointer]:
          - generic [ref=e61]: T
          - generic [ref=e62]: "15"
        - button "Wednesday, September 16" [ref=e64] [cursor=pointer]:
          - generic [ref=e65]: W
          - generic [ref=e66]: "16"
        - button "Thursday, September 17" [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: T
          - generic [ref=e70]: "17"
        - button "Friday, September 18" [ref=e72] [cursor=pointer]:
          - generic [ref=e73]: F
          - generic [ref=e74]: "18"
        - button "Saturday, September 19, logged" [pressed] [ref=e76] [cursor=pointer]:
          - generic [ref=e77]: S
          - generic [ref=e78]: "19"
      - generic [ref=e80]:
        - generic:
          - img
        - main [ref=e82]:
          - generic [ref=e83]:
            - generic [ref=e84]:
              - complementary "A note from Momo" [ref=e85]:
                - button "Say something, Momo" [ref=e86] [cursor=pointer]:
                  - img [ref=e88]
                - generic [ref=e126]:
                  - paragraph [ref=e127]: Evening, Ada!
                  - paragraph [ref=e128]: You showed up. That’s the part worth celebrating.
              - region "Today’s snapshot" [ref=e129]:
                - heading "Today’s snapshot" [level=2] [ref=e130]
                - paragraph [ref=e131]:
                  - strong [ref=e132]: "860"
                  - img [ref=e133]
                  - generic [ref=e135]: kcal left
                - progressbar "Calories" [ref=e136]
                - paragraph [ref=e138]:
                  - generic [ref=e139]: 1,140 eaten
                  - generic [ref=e140]: 2,000 guide
              - region "Macros" [ref=e141]:
                - generic [ref=e142]:
                  - generic [ref=e143]: Protein
                  - generic [ref=e145]:
                    - strong [ref=e146]: "58"
                    - text: / 110 g
                  - progressbar "Protein" [ref=e147]
                - generic [ref=e149]:
                  - generic [ref=e150]: Carbs
                  - generic [ref=e152]:
                    - strong [ref=e153]: "132"
                    - text: / 220 g
                  - progressbar "Carbs" [ref=e154]
                - generic [ref=e156]:
                  - generic [ref=e157]: Fat
                  - generic [ref=e159]:
                    - strong [ref=e160]: "34"
                    - text: / 65 g
                  - progressbar "Fat" [ref=e161]
              - region "Water and notes" [ref=e163]:
                - generic [ref=e164]:
                  - generic [ref=e166]:
                    - img [ref=e167]
                    - text: Water
                  - group "Water glasses" [ref=e179]:
                    - button "Remove a glass of water" [ref=e180] [cursor=pointer]: −
                    - generic [ref=e181]: 3/8
                    - button "Add a glass of water" [ref=e182] [cursor=pointer]: +
                - button "Add a kitchen note" [ref=e183] [cursor=pointer]
            - region "Meals" [ref=e184]:
              - generic [ref=e185]:
                - heading "Meals" [level=2] [ref=e186]
                - generic [ref=e187]: 3 meals · 1,140 kcal
              - region "Breakfast" [ref=e188]:
                - generic [ref=e189]:
                  - img [ref=e191]
                  - heading "Breakfast" [level=3] [ref=e196]
                  - generic [ref=e197]: 320 kcal
                - generic [ref=e198]:
                  - generic "Actions for Overnight oats" [ref=e199]:
                    - button "Edit" [ref=e200] [cursor=pointer]
                    - button "Delete" [ref=e201] [cursor=pointer]
                  - button "Overnight oats 8:15 AM · P 12 · C 52 · F 8 320 kcal" [ref=e203] [cursor=pointer]:
                    - img [ref=e205]
                    - generic [ref=e211]:
                      - text: Overnight oats
                      - generic [ref=e212]: 8:15 AM · P 12 · C 52 · F 8
                    - generic [ref=e213]: 320 kcal
                - button "Add breakfast" [ref=e214] [cursor=pointer]:
                  - img [ref=e216]
                  - text: Add breakfast
              - region "Lunch" [ref=e217]:
                - generic [ref=e218]:
                  - img [ref=e220]
                  - heading "Lunch" [level=3] [ref=e226]
                  - generic [ref=e227]: 540 kcal
                - generic [ref=e228]:
                  - generic "Actions for Chicken rice bowl" [ref=e229]:
                    - button "Edit" [ref=e230] [cursor=pointer]
                    - button "Delete" [ref=e231] [cursor=pointer]
                  - button "Chicken rice bowl 12:40 PM · P 38 · C 48 · F 16 540 kcal" [ref=e233] [cursor=pointer]:
                    - img [ref=e235]
                    - generic [ref=e238]:
                      - text: Chicken rice bowl
                      - generic [ref=e239]: 12:40 PM · P 38 · C 48 · F 16
                    - generic [ref=e240]: 540 kcal
                - button "Add lunch" [ref=e241] [cursor=pointer]:
                  - img [ref=e243]
                  - text: Add lunch
              - region "Dinner" [ref=e244]:
                - generic [ref=e245]:
                  - img [ref=e247]
                  - heading "Dinner" [level=3] [ref=e249]
                  - generic [ref=e250]: 280 kcal
                - generic [ref=e251]:
                  - generic "Actions for Tomato soup" [ref=e252]:
                    - button "Edit" [ref=e253] [cursor=pointer]
                    - button "Delete" [ref=e254] [cursor=pointer]
                  - button "Tomato soup 6:20 PM · P 8 · C 32 · F 10 280 kcal" [ref=e256] [cursor=pointer]:
                    - img [ref=e258]
                    - generic [ref=e264]:
                      - text: Tomato soup
                      - generic [ref=e265]: 6:20 PM · P 8 · C 32 · F 10
                    - generic [ref=e266]: 280 kcal
                - button "Add dinner" [ref=e267] [cursor=pointer]:
                  - img [ref=e269]
                  - text: Add dinner
              - region "Snack" [ref=e270]:
                - generic [ref=e271]:
                  - img [ref=e273]
                  - heading "Snack" [level=3] [ref=e282]
                - button "Add snack" [ref=e283] [cursor=pointer]:
                  - img [ref=e285]
                  - text: Add snack
        - status [ref=e286]
  - dialog "Log a meal" [ref=e287]:
    - banner [ref=e288]:
      - generic [ref=e289]:
        - generic:
          - img
      - generic [ref=e290]:
        - heading "Log a meal" [level=2] [ref=e291]
        - paragraph [ref=e292]: What’s for dinner?
      - button "Close" [active] [ref=e293] [cursor=pointer]:
        - img [ref=e294]
    - generic [ref=e297]:
      - img [ref=e299]
      - generic [ref=e301]: Logging to
      - button "Dinner" [ref=e302] [cursor=pointer]:
        - text: Dinner
        - img [ref=e303]
    - generic [ref=e305]:
      - generic [ref=e306]:
        - img
        - textbox "Search your foods, or type calories" [ref=e307]:
          - /placeholder: Search your meals, or type calories
      - paragraph [ref=e308]: A number on its own logs just the calories.
    - group "Your meal shortcuts" [ref=e309]:
      - button "Recent" [pressed] [ref=e310] [cursor=pointer]:
        - img [ref=e311]
        - text: Recent
      - button "Favourites" [ref=e315] [cursor=pointer]:
        - img [ref=e316]
        - text: Favourites
    - paragraph [ref=e318]: Recent · tap to log again
    - list [ref=e319]:
      - listitem [ref=e320]:
        - button "Tomato soup 280 kcal" [ref=e321] [cursor=pointer]:
          - img [ref=e323]
          - generic [ref=e329]: Tomato soup
          - generic [ref=e330]: 280 kcal
          - img [ref=e332]
        - button "Adjust portion for Tomato soup" [ref=e333] [cursor=pointer]: Portion
      - listitem [ref=e334]:
        - button "Chicken rice bowl 540 kcal" [ref=e335] [cursor=pointer]:
          - img [ref=e337]
          - generic [ref=e340]: Chicken rice bowl
          - generic [ref=e341]: 540 kcal
          - img [ref=e343]
        - button "Adjust portion for Chicken rice bowl" [ref=e344] [cursor=pointer]: Portion
      - listitem [ref=e345]:
        - button "Overnight oats 320 kcal" [ref=e346] [cursor=pointer]:
          - img [ref=e348]
          - generic [ref=e354]: Overnight oats
          - generic [ref=e355]: 320 kcal
          - img [ref=e357]
        - button "Adjust portion for Overnight oats" [ref=e358] [cursor=pointer]: Portion
    - paragraph [ref=e359]: More ways to log
    - navigation "Other ways to log" [ref=e360]:
      - link "Snap a photo" [ref=e361] [cursor=pointer]:
        - /url: /log/photo
        - img [ref=e363]
        - generic [ref=e366]:
          - strong [ref=e367]: Photo
          - generic [ref=e368]: Point, shoot, check
        - generic [ref=e369]: Snap a photo
      - link "Describe your meal" [ref=e370] [cursor=pointer]:
        - /url: /log/text
        - img [ref=e372]
        - generic [ref=e375]:
          - strong [ref=e376]: Describe
          - generic [ref=e377]: Say it in your words
        - generic [ref=e378]: Describe your meal
      - link "Manual entry" [ref=e379] [cursor=pointer]:
        - /url: /log/manual
        - img [ref=e381]
        - generic [ref=e384]:
          - strong [ref=e385]: Manual
          - generic [ref=e386]: Type the numbers
        - generic [ref=e387]: Manual entry
      - link "Saved meals" [ref=e388] [cursor=pointer]:
        - /url: /log/saved
        - img [ref=e390]
        - generic [ref=e392]:
          - strong [ref=e393]: Saved
          - generic [ref=e394]: Your usuals
        - generic [ref=e395]: Saved meals
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