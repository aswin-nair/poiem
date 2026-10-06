# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> log-sheet 390 light
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  4599 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: log-sheet-390-light.png

Call log:
  - Expect "toHaveScreenshot(log-sheet-390-light.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 4599 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 4599 pixels (ratio 0.02 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e2]:
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
        - button "Log a meal" [expanded] [ref=e17] [cursor=pointer]:
          - img [ref=e19]
        - link "Saved" [ref=e22] [cursor=pointer]:
          - /url: /discover
          - generic [ref=e23]:
            - img [ref=e24]
            - generic [ref=e26]: Saved
        - link "You" [ref=e27] [cursor=pointer]:
          - /url: /settings
          - generic [ref=e28]:
            - img [ref=e29]
            - generic [ref=e32]: You
    - generic [ref=e33]:
      - banner [ref=e34]:
        - generic [ref=e35]:
          - paragraph [ref=e36]: Saturday, September 19
          - heading "Today" [level=1] [ref=e37]
        - button "Choose date" [ref=e38] [cursor=pointer]:
          - img [ref=e39]
      - generic [ref=e43]:
        - button "Sunday, September 13" [ref=e44] [cursor=pointer]:
          - generic [ref=e45]: S
          - generic [ref=e46]: "13"
        - button "Monday, September 14" [ref=e48] [cursor=pointer]:
          - generic [ref=e49]: M
          - generic [ref=e50]: "14"
        - button "Tuesday, September 15" [ref=e52] [cursor=pointer]:
          - generic [ref=e53]: T
          - generic [ref=e54]: "15"
        - button "Wednesday, September 16" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: W
          - generic [ref=e58]: "16"
        - button "Thursday, September 17" [ref=e60] [cursor=pointer]:
          - generic [ref=e61]: T
          - generic [ref=e62]: "17"
        - button "Friday, September 18" [ref=e64] [cursor=pointer]:
          - generic [ref=e65]: F
          - generic [ref=e66]: "18"
        - button "Saturday, September 19, logged" [pressed] [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: S
          - generic [ref=e70]: "19"
      - generic [ref=e72]:
        - generic:
          - img
        - main [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]:
              - complementary "A note from Momo" [ref=e77]:
                - button "Say something, Momo" [ref=e78] [cursor=pointer]:
                  - img [ref=e80]
                - generic [ref=e118]:
                  - paragraph [ref=e119]: Evening, Ada!
                  - paragraph [ref=e120]: You showed up. That’s the part worth celebrating.
              - region "Today’s snapshot" [ref=e121]:
                - heading "Today’s snapshot" [level=2] [ref=e122]
                - paragraph [ref=e123]:
                  - strong [ref=e124]: "860"
                  - img [ref=e125]
                  - generic [ref=e127]: kcal left
                - progressbar "Calories" [ref=e128]
                - paragraph [ref=e130]:
                  - generic [ref=e131]: 1,140 eaten
                  - generic [ref=e132]: 2,000 guide
              - region "Macros" [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: Protein
                  - generic [ref=e137]:
                    - strong [ref=e138]: "58"
                    - text: / 110 g
                  - progressbar "Protein" [ref=e139]
                - generic [ref=e141]:
                  - generic [ref=e142]: Carbs
                  - generic [ref=e144]:
                    - strong [ref=e145]: "132"
                    - text: / 220 g
                  - progressbar "Carbs" [ref=e146]
                - generic [ref=e148]:
                  - generic [ref=e149]: Fat
                  - generic [ref=e151]:
                    - strong [ref=e152]: "34"
                    - text: / 65 g
                  - progressbar "Fat" [ref=e153]
              - region "Water and notes" [ref=e155]:
                - generic [ref=e156]:
                  - generic [ref=e158]:
                    - img [ref=e159]
                    - text: Water
                  - group "Water glasses" [ref=e171]:
                    - button "Remove a glass of water" [ref=e172] [cursor=pointer]: −
                    - generic [ref=e173]: 3/8
                    - button "Add a glass of water" [ref=e174] [cursor=pointer]: +
                - button "Add a kitchen note" [ref=e175] [cursor=pointer]
            - region "Meals" [ref=e176]:
              - generic [ref=e177]:
                - heading "Meals" [level=2] [ref=e178]
                - generic [ref=e179]: 3 meals · 1,140 kcal
              - region "Breakfast" [ref=e180]:
                - generic [ref=e181]:
                  - img [ref=e183]
                  - heading "Breakfast" [level=3] [ref=e188]
                  - generic [ref=e189]: 320 kcal
                - generic [ref=e190]:
                  - generic "Actions for Overnight oats" [ref=e191]:
                    - button "Edit" [ref=e192] [cursor=pointer]
                    - button "Delete" [ref=e193] [cursor=pointer]
                  - button "Overnight oats 8:15 AM · P 12 · C 52 · F 8 320 kcal" [ref=e195] [cursor=pointer]:
                    - img [ref=e197]
                    - generic [ref=e203]:
                      - text: Overnight oats
                      - generic [ref=e204]: 8:15 AM · P 12 · C 52 · F 8
                    - generic [ref=e205]: 320 kcal
                - button "Add breakfast" [ref=e206] [cursor=pointer]:
                  - img [ref=e208]
                  - text: Add breakfast
              - region "Lunch" [ref=e209]:
                - generic [ref=e210]:
                  - img [ref=e212]
                  - heading "Lunch" [level=3] [ref=e218]
                  - generic [ref=e219]: 540 kcal
                - generic [ref=e220]:
                  - generic "Actions for Chicken rice bowl" [ref=e221]:
                    - button "Edit" [ref=e222] [cursor=pointer]
                    - button "Delete" [ref=e223] [cursor=pointer]
                  - button "Chicken rice bowl 12:40 PM · P 38 · C 48 · F 16 540 kcal" [ref=e225] [cursor=pointer]:
                    - img [ref=e227]
                    - generic [ref=e230]:
                      - text: Chicken rice bowl
                      - generic [ref=e231]: 12:40 PM · P 38 · C 48 · F 16
                    - generic [ref=e232]: 540 kcal
                - button "Add lunch" [ref=e233] [cursor=pointer]:
                  - img [ref=e235]
                  - text: Add lunch
              - region "Dinner" [ref=e236]:
                - generic [ref=e237]:
                  - img [ref=e239]
                  - heading "Dinner" [level=3] [ref=e241]
                  - generic [ref=e242]: 280 kcal
                - generic [ref=e243]:
                  - generic "Actions for Tomato soup" [ref=e244]:
                    - button "Edit" [ref=e245] [cursor=pointer]
                    - button "Delete" [ref=e246] [cursor=pointer]
                  - button "Tomato soup 6:20 PM · P 8 · C 32 · F 10 280 kcal" [ref=e248] [cursor=pointer]:
                    - img [ref=e250]
                    - generic [ref=e256]:
                      - text: Tomato soup
                      - generic [ref=e257]: 6:20 PM · P 8 · C 32 · F 10
                    - generic [ref=e258]: 280 kcal
                - button "Add dinner" [ref=e259] [cursor=pointer]:
                  - img [ref=e261]
                  - text: Add dinner
              - region "Snack" [ref=e262]:
                - generic [ref=e263]:
                  - img [ref=e265]
                  - heading "Snack" [level=3] [ref=e274]
                - button "Add snack" [ref=e275] [cursor=pointer]:
                  - img [ref=e277]
                  - text: Add snack
        - status [ref=e278]
  - dialog "Log a meal" [ref=e279]:
    - banner [ref=e281]:
      - generic [ref=e282]:
        - generic:
          - img
      - generic [ref=e283]:
        - heading "Log a meal" [level=2] [ref=e284]
        - paragraph [ref=e285]: What’s for dinner?
      - button "Close" [active] [ref=e286] [cursor=pointer]:
        - img [ref=e287]
    - generic [ref=e290]:
      - img [ref=e292]
      - generic [ref=e294]: Logging to
      - button "Dinner" [ref=e295] [cursor=pointer]:
        - text: Dinner
        - img [ref=e296]
    - generic [ref=e298]:
      - generic [ref=e299]:
        - img
        - textbox "Search your foods, or type calories" [ref=e300]:
          - /placeholder: Search your meals, or type calories
      - paragraph [ref=e301]: A number on its own logs just the calories.
    - group "Your meal shortcuts" [ref=e302]:
      - button "Recent" [pressed] [ref=e303] [cursor=pointer]:
        - img [ref=e304]
        - text: Recent
      - button "Favourites" [ref=e308] [cursor=pointer]:
        - img [ref=e309]
        - text: Favourites
    - paragraph [ref=e311]: Recent · tap to log again
    - list [ref=e312]:
      - listitem [ref=e313]:
        - button "Tomato soup 280 kcal" [ref=e314] [cursor=pointer]:
          - img [ref=e316]
          - generic [ref=e322]: Tomato soup
          - generic [ref=e323]: 280 kcal
          - img [ref=e325]
        - button "Adjust portion for Tomato soup" [ref=e326] [cursor=pointer]: Portion
      - listitem [ref=e327]:
        - button "Chicken rice bowl 540 kcal" [ref=e328] [cursor=pointer]:
          - img [ref=e330]
          - generic [ref=e333]: Chicken rice bowl
          - generic [ref=e334]: 540 kcal
          - img [ref=e336]
        - button "Adjust portion for Chicken rice bowl" [ref=e337] [cursor=pointer]: Portion
      - listitem [ref=e338]:
        - button "Overnight oats 320 kcal" [ref=e339] [cursor=pointer]:
          - img [ref=e341]
          - generic [ref=e347]: Overnight oats
          - generic [ref=e348]: 320 kcal
          - img [ref=e350]
        - button "Adjust portion for Overnight oats" [ref=e351] [cursor=pointer]: Portion
    - paragraph [ref=e352]: More ways to log
    - navigation "Other ways to log" [ref=e353]:
      - link "Snap a photo" [ref=e354] [cursor=pointer]:
        - /url: /log/photo
        - img [ref=e356]
        - generic [ref=e359]:
          - strong [ref=e360]: Photo
          - generic [ref=e361]: Point, shoot, check
        - generic [ref=e362]: Snap a photo
      - link "Describe your meal" [ref=e363] [cursor=pointer]:
        - /url: /log/text
        - img [ref=e365]
        - generic [ref=e368]:
          - strong [ref=e369]: Describe
          - generic [ref=e370]: Say it in your words
        - generic [ref=e371]: Describe your meal
      - link "Manual entry" [ref=e372] [cursor=pointer]:
        - /url: /log/manual
        - img [ref=e374]
        - generic [ref=e377]:
          - strong [ref=e378]: Manual
          - generic [ref=e379]: Type the numbers
        - generic [ref=e380]: Manual entry
      - link "Saved meals" [ref=e381] [cursor=pointer]:
        - /url: /log/saved
        - img [ref=e383]
        - generic [ref=e385]:
          - strong [ref=e386]: Saved
          - generic [ref=e387]: Your usuals
        - generic [ref=e388]: Saved meals
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