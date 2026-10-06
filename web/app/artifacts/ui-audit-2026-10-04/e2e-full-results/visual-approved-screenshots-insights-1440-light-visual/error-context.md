# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> insights 1440 light
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  Expected an image 1440px by 2097px, received 1440px by 2120px. 136387 pixels (ratio 0.05 of all image pixels) are different.

  Snapshot: insights-1440-light.png

Call log:
  - Expect "toHaveScreenshot(insights-1440-light.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - Expected an image 1440px by 2097px, received 1440px by 2120px. 136387 pixels (ratio 0.05 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - Expected an image 1440px by 2097px, received 1440px by 2120px. 136387 pixels (ratio 0.05 of all image pixels) are different.

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
    - generic [ref=e42]:
      - paragraph [ref=e43]: The bigger picture
      - heading "Insights" [active] [level=1] [ref=e44]
      - paragraph [ref=e45]: See your routine over time, one logged day at a time.
    - region "Journey" [ref=e46]:
      - generic [ref=e47]:
        - heading "Journey" [level=2] [ref=e48]
        - generic [ref=e49]: Level 1
      - generic [ref=e50]:
        - generic [ref=e51]:
          - term [ref=e52]: Day streak
          - definition [ref=e53]: "1"
        - generic [ref=e54]:
          - term [ref=e55]: Total XP
          - definition [ref=e56]: "40"
        - generic [ref=e57]:
          - term [ref=e58]: Freezes
          - definition [ref=e59]: "1"
      - progressbar "Progress to the next level" [ref=e60]
      - paragraph [ref=e62]: First Steps · 60 XP to level 2
    - region "Logging milestones" [ref=e63]:
      - generic [ref=e64]:
        - img [ref=e66]
        - generic [ref=e73]:
          - heading "Small steps. Real progress." [level=2] [ref=e74]
          - paragraph [ref=e75]: "1 logged day · next milestone: 3"
      - list [ref=e76]:
        - listitem [ref=e77]:
          - img [ref=e79]
          - generic [ref=e81]: First log
          - generic [ref=e82]: achieved
        - listitem [ref=e83]:
          - generic [ref=e84]: "3"
          - generic [ref=e85]: 3 days
          - generic [ref=e86]: not yet reached
        - listitem [ref=e87]:
          - generic [ref=e88]: "7"
          - generic [ref=e89]: 7 days
          - generic [ref=e90]: not yet reached
        - listitem [ref=e91]:
          - generic [ref=e92]: "14"
          - generic [ref=e93]: 14 days
          - generic [ref=e94]: not yet reached
        - listitem [ref=e95]:
          - generic [ref=e96]: "30"
          - generic [ref=e97]: 30 days
          - generic [ref=e98]: not yet reached
      - paragraph [ref=e99]: Every logged day counts. Breaks don’t reset these milestones.
    - generic [ref=e100]:
      - generic [ref=e101]:
        - heading "Consistency" [level=2] [ref=e102]
        - generic [ref=e103]: 1-day streak
      - generic [ref=e136]:
        - generic [ref=e137]:
          - strong [ref=e138]: "1"
          - generic [ref=e139]: day logged
        - paragraph [ref=e140]: of 19 days so far this month
        - paragraph [ref=e141]: Days you logged, not how the numbers landed.
      - list [ref=e142]:
        - listitem [ref=e143]: "Day 1: not logged"
        - listitem [ref=e144]: "Day 2: not logged"
        - listitem [ref=e145]: "Day 3: not logged"
        - listitem [ref=e146]: "Day 4: not logged"
        - listitem [ref=e147]: "Day 5: not logged"
        - listitem [ref=e148]: "Day 6: not logged"
        - listitem [ref=e149]: "Day 7: not logged"
        - listitem [ref=e150]: "Day 8: not logged"
        - listitem [ref=e151]: "Day 9: not logged"
        - listitem [ref=e152]: "Day 10: not logged"
        - listitem [ref=e153]: "Day 11: not logged"
        - listitem [ref=e154]: "Day 12: not logged"
        - listitem [ref=e155]: "Day 13: not logged"
        - listitem [ref=e156]: "Day 14: not logged"
        - listitem [ref=e157]: "Day 15: not logged"
        - listitem [ref=e158]: "Day 16: not logged"
        - listitem [ref=e159]: "Day 17: not logged"
        - listitem [ref=e160]: "Day 18: not logged"
        - listitem [ref=e161]: "Day 19: logged"
        - listitem [ref=e162]: "Day 20: upcoming"
        - listitem [ref=e163]: "Day 21: upcoming"
        - listitem [ref=e164]: "Day 22: upcoming"
        - listitem [ref=e165]: "Day 23: upcoming"
        - listitem [ref=e166]: "Day 24: upcoming"
        - listitem [ref=e167]: "Day 25: upcoming"
        - listitem [ref=e168]: "Day 26: upcoming"
        - listitem [ref=e169]: "Day 27: upcoming"
        - listitem [ref=e170]: "Day 28: upcoming"
        - listitem [ref=e171]: "Day 29: upcoming"
        - listitem [ref=e172]: "Day 30: upcoming"
      - generic [ref=e173]:
        - generic [ref=e174]: Logged
        - generic [ref=e176]: Not logged
        - generic [ref=e178]: Upcoming
      - generic [ref=e180]:
        - strong [ref=e181]: You logged breakfast 1 of the last 7 days.
        - generic [ref=e182]: Your best seven-day stretch is 1.
    - region "Weight and calorie chart range" [ref=e183]:
      - heading "Weight & calories" [level=2] [ref=e184]
      - group "Chart time range" [ref=e185]:
        - button "Week" [pressed] [ref=e186] [cursor=pointer]
        - button "Month" [ref=e187] [cursor=pointer]
      - status [ref=e188]: Last 7 days · Applies to the two charts below.
    - generic [ref=e189]:
      - generic [ref=e190]:
        - heading "Weight" [level=2] [ref=e191]
        - button "+ Log weight" [ref=e192] [cursor=pointer]
      - generic [ref=e193]:
        - generic [ref=e194]:
          - generic [ref=e195]: Latest in range
          - generic [ref=e196]: 62.0 kg
        - generic [ref=e197]:
          - generic [ref=e198]: Goal
          - generic [ref=e199]: —
        - generic [ref=e200]:
          - generic [ref=e201]: Net change
          - generic [ref=e202]: —
          - generic [ref=e203]: Needs two weigh-ins
        - generic [ref=e204]:
          - generic [ref=e205]: Average
          - generic [ref=e206]: 62.0 kg
          - generic [ref=e207]: 1 weigh-in in range
      - generic [ref=e208]:
        - img [ref=e209]:
          - generic [ref=e211]: "64"
          - generic [ref=e213]: "62"
          - generic [ref=e215]: "60"
          - generic [ref=e217]: Sep 19
        - paragraph [ref=e218]:
          - text: "Latest:"
          - strong [ref=e219]: 62.0 kg
        - table "Weight over time" [ref=e220]:
          - caption [ref=e221]: Weight over time
          - rowgroup [ref=e222]:
            - row "Period Value ( kg)" [ref=e223]:
              - columnheader "Period" [ref=e224]
              - columnheader "Value ( kg)" [ref=e225]
          - rowgroup [ref=e226]:
            - row "Sep 19 62" [ref=e227]:
              - rowheader "Sep 19" [ref=e228]
              - cell "62" [ref=e229]
    - button "Weight history 1 entry · tap to view or delete" [ref=e230] [cursor=pointer]:
      - img [ref=e232]
      - generic [ref=e233]:
        - strong [ref=e234]: Weight history
        - generic [ref=e235]: 1 entry · tap to view or delete
      - img [ref=e237]
    - generic [ref=e239]:
      - generic [ref=e240]:
        - heading "Calories" [level=2] [ref=e241]
        - generic [ref=e242]: Avg 1,140 kcal
      - generic [ref=e243]:
        - generic [ref=e244]:
          - generic [ref=e245]: Goal
          - generic [ref=e246]: 2,000 kcal
        - generic [ref=e247]:
          - generic [ref=e248]: Days tracked
          - generic [ref=e249]: "1"
          - generic [ref=e250]: of 7 days
      - generic [ref=e251]:
        - img [ref=e252]:
          - generic [ref=e254]: "0"
          - generic [ref=e256]: 2k
          - generic [ref=e258]: 4k
          - generic [ref=e261]: Sep 13
          - generic [ref=e264]: Sep 14
          - generic [ref=e267]: Sep 15
          - generic [ref=e270]: Sep 16
          - generic [ref=e273]: Sep 17
          - generic [ref=e276]: Sep 18
          - generic [ref=e277]:
            - generic [ref=e280]: 1.1k
            - generic [ref=e281]: Sep 19
          - generic [ref=e283]: goal
        - table "Calories by day" [ref=e284]:
          - caption [ref=e285]: Calories by day
          - rowgroup [ref=e286]:
            - row "Period Value" [ref=e287]:
              - columnheader "Period" [ref=e288]
              - columnheader "Value" [ref=e289]
          - rowgroup [ref=e290]:
            - row "Sep 13 0" [ref=e291]:
              - rowheader "Sep 13" [ref=e292]
              - cell "0" [ref=e293]
            - row "Sep 14 0" [ref=e294]:
              - rowheader "Sep 14" [ref=e295]
              - cell "0" [ref=e296]
            - row "Sep 15 0" [ref=e297]:
              - rowheader "Sep 15" [ref=e298]
              - cell "0" [ref=e299]
            - row "Sep 16 0" [ref=e300]:
              - rowheader "Sep 16" [ref=e301]
              - cell "0" [ref=e302]
            - row "Sep 17 0" [ref=e303]:
              - rowheader "Sep 17" [ref=e304]
              - cell "0" [ref=e305]
            - row "Sep 18 0" [ref=e306]:
              - rowheader "Sep 18" [ref=e307]
              - cell "0" [ref=e308]
            - row "Sep 19 1140" [ref=e309]:
              - rowheader "Sep 19" [ref=e310]
              - cell "1140" [ref=e311]
      - paragraph [ref=e312]: Average uses logged days only. An empty day doesn’t mean you ate nothing.
    - generic [ref=e313]:
      - heading "Most logged" [level=2] [ref=e314]
      - paragraph [ref=e315]: Foods you reach for often · All time
      - list [ref=e316]:
        - listitem [ref=e317]:
          - img [ref=e319]
          - generic [ref=e325]: Overnight oats
          - generic "1 time" [ref=e326]: ×1
        - listitem [ref=e327]:
          - img [ref=e329]
          - generic [ref=e332]: Chicken rice bowl
          - generic "1 time" [ref=e333]: ×1
        - listitem [ref=e334]:
          - img [ref=e336]
          - generic [ref=e342]: Tomato soup
          - generic "1 time" [ref=e343]: ×1
    - group [ref=e344]:
      - generic "Ticket archive Eight recent logged days" [ref=e345] [cursor=pointer]:
        - heading "Ticket archive" [level=2] [ref=e346]
        - generic [ref=e347]: Eight recent logged days
    - group [ref=e348]:
      - generic "Achievements 1/6" [ref=e349] [cursor=pointer]:
        - heading "Achievements" [level=2] [ref=e350]
        - generic [ref=e351]: 1/6
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