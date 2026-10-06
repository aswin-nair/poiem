# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> insights 390 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  16459 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: insights-390-dark.png

Call log:
  - Expect "toHaveScreenshot(insights-390-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 16459 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 16459 pixels (ratio 0.02 of all image pixels) are different.

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
    - generic [ref=e34]:
      - paragraph [ref=e35]: The bigger picture
      - heading "Insights" [active] [level=1] [ref=e36]
      - paragraph [ref=e37]: See your routine over time, one logged day at a time.
    - region "Journey" [ref=e38]:
      - generic [ref=e39]:
        - heading "Journey" [level=2] [ref=e40]
        - generic [ref=e41]: Level 1
      - generic [ref=e42]:
        - generic [ref=e43]:
          - term [ref=e44]: Day streak
          - definition [ref=e45]: "1"
        - generic [ref=e46]:
          - term [ref=e47]: Total XP
          - definition [ref=e48]: "40"
        - generic [ref=e49]:
          - term [ref=e50]: Freezes
          - definition [ref=e51]: "1"
      - progressbar "Progress to the next level" [ref=e52]
      - paragraph [ref=e54]: First Steps · 60 XP to level 2
    - region "Logging milestones" [ref=e55]:
      - generic [ref=e56]:
        - img [ref=e58]
        - generic [ref=e65]:
          - heading "Small steps. Real progress." [level=2] [ref=e66]
          - paragraph [ref=e67]: "1 logged day · next milestone: 3"
      - list [ref=e68]:
        - listitem [ref=e69]:
          - img [ref=e71]
          - generic [ref=e73]: First log
          - generic [ref=e74]: achieved
        - listitem [ref=e75]:
          - generic [ref=e76]: "3"
          - generic [ref=e77]: 3 days
          - generic [ref=e78]: not yet reached
        - listitem [ref=e79]:
          - generic [ref=e80]: "7"
          - generic [ref=e81]: 7 days
          - generic [ref=e82]: not yet reached
        - listitem [ref=e83]:
          - generic [ref=e84]: "14"
          - generic [ref=e85]: 14 days
          - generic [ref=e86]: not yet reached
        - listitem [ref=e87]:
          - generic [ref=e88]: "30"
          - generic [ref=e89]: 30 days
          - generic [ref=e90]: not yet reached
      - paragraph [ref=e91]: Every logged day counts. Breaks don’t reset these milestones.
    - generic [ref=e92]:
      - generic [ref=e93]:
        - heading "Consistency" [level=2] [ref=e94]
        - generic [ref=e95]: 1-day streak
      - generic [ref=e128]:
        - generic [ref=e129]:
          - strong [ref=e130]: "1"
          - generic [ref=e131]: day logged
        - paragraph [ref=e132]: of 19 days so far this month
        - paragraph [ref=e133]: Days you logged, not how the numbers landed.
      - list [ref=e134]:
        - listitem [ref=e135]: "Day 1: not logged"
        - listitem [ref=e136]: "Day 2: not logged"
        - listitem [ref=e137]: "Day 3: not logged"
        - listitem [ref=e138]: "Day 4: not logged"
        - listitem [ref=e139]: "Day 5: not logged"
        - listitem [ref=e140]: "Day 6: not logged"
        - listitem [ref=e141]: "Day 7: not logged"
        - listitem [ref=e142]: "Day 8: not logged"
        - listitem [ref=e143]: "Day 9: not logged"
        - listitem [ref=e144]: "Day 10: not logged"
        - listitem [ref=e145]: "Day 11: not logged"
        - listitem [ref=e146]: "Day 12: not logged"
        - listitem [ref=e147]: "Day 13: not logged"
        - listitem [ref=e148]: "Day 14: not logged"
        - listitem [ref=e149]: "Day 15: not logged"
        - listitem [ref=e150]: "Day 16: not logged"
        - listitem [ref=e151]: "Day 17: not logged"
        - listitem [ref=e152]: "Day 18: not logged"
        - listitem [ref=e153]: "Day 19: logged"
        - listitem [ref=e154]: "Day 20: upcoming"
        - listitem [ref=e155]: "Day 21: upcoming"
        - listitem [ref=e156]: "Day 22: upcoming"
        - listitem [ref=e157]: "Day 23: upcoming"
        - listitem [ref=e158]: "Day 24: upcoming"
        - listitem [ref=e159]: "Day 25: upcoming"
        - listitem [ref=e160]: "Day 26: upcoming"
        - listitem [ref=e161]: "Day 27: upcoming"
        - listitem [ref=e162]: "Day 28: upcoming"
        - listitem [ref=e163]: "Day 29: upcoming"
        - listitem [ref=e164]: "Day 30: upcoming"
      - generic [ref=e165]:
        - generic [ref=e166]: Logged
        - generic [ref=e168]: Not logged
        - generic [ref=e170]: Upcoming
      - generic [ref=e172]:
        - strong [ref=e173]: You logged breakfast 1 of the last 7 days.
        - generic [ref=e174]: Your best seven-day stretch is 1.
    - region "Weight and calorie chart range" [ref=e175]:
      - heading "Weight & calories" [level=2] [ref=e176]
      - group "Chart time range" [ref=e177]:
        - button "Week" [pressed] [ref=e178] [cursor=pointer]
        - button "Month" [ref=e179] [cursor=pointer]
      - status [ref=e180]: Last 7 days · Applies to the two charts below.
    - generic [ref=e181]:
      - generic [ref=e182]:
        - heading "Weight" [level=2] [ref=e183]
        - button "+ Log weight" [ref=e184] [cursor=pointer]
      - generic [ref=e185]:
        - generic [ref=e186]:
          - generic [ref=e187]: Latest in range
          - generic [ref=e188]: 62.0 kg
        - generic [ref=e189]:
          - generic [ref=e190]: Goal
          - generic [ref=e191]: —
        - generic [ref=e192]:
          - generic [ref=e193]: Net change
          - generic [ref=e194]: —
          - generic [ref=e195]: Needs two weigh-ins
        - generic [ref=e196]:
          - generic [ref=e197]: Average
          - generic [ref=e198]: 62.0 kg
          - generic [ref=e199]: 1 weigh-in in range
      - generic [ref=e200]:
        - img [ref=e201]:
          - generic [ref=e203]: "64"
          - generic [ref=e205]: "62"
          - generic [ref=e207]: "60"
          - generic [ref=e209]: Sep 19
        - paragraph [ref=e210]:
          - text: "Latest:"
          - strong [ref=e211]: 62.0 kg
        - table "Weight over time" [ref=e212]:
          - caption [ref=e213]: Weight over time
          - rowgroup [ref=e214]:
            - row "Period Value ( kg)" [ref=e215]:
              - columnheader "Period" [ref=e216]
              - columnheader "Value ( kg)" [ref=e217]
          - rowgroup [ref=e218]:
            - row "Sep 19 62" [ref=e219]:
              - rowheader "Sep 19" [ref=e220]
              - cell "62" [ref=e221]
    - button "Weight history 1 entry · tap to view or delete" [ref=e222] [cursor=pointer]:
      - img [ref=e224]
      - generic [ref=e225]:
        - strong [ref=e226]: Weight history
        - generic [ref=e227]: 1 entry · tap to view or delete
      - img [ref=e229]
    - generic [ref=e231]:
      - generic [ref=e232]:
        - heading "Calories" [level=2] [ref=e233]
        - generic [ref=e234]: Avg 1,140 kcal
      - generic [ref=e235]:
        - generic [ref=e236]:
          - generic [ref=e237]: Goal
          - generic [ref=e238]: 2,000 kcal
        - generic [ref=e239]:
          - generic [ref=e240]: Days tracked
          - generic [ref=e241]: "1"
          - generic [ref=e242]: of 7 days
      - generic [ref=e243]:
        - img [ref=e244]:
          - generic [ref=e246]: "0"
          - generic [ref=e248]: 2k
          - generic [ref=e250]: 4k
          - generic [ref=e253]: Sep 13
          - generic [ref=e256]: Sep 14
          - generic [ref=e259]: Sep 15
          - generic [ref=e262]: Sep 16
          - generic [ref=e265]: Sep 17
          - generic [ref=e268]: Sep 18
          - generic [ref=e269]:
            - generic [ref=e272]: 1.1k
            - generic [ref=e273]: Sep 19
          - generic [ref=e275]: goal
        - table "Calories by day" [ref=e276]:
          - caption [ref=e277]: Calories by day
          - rowgroup [ref=e278]:
            - row "Period Value" [ref=e279]:
              - columnheader "Period" [ref=e280]
              - columnheader "Value" [ref=e281]
          - rowgroup [ref=e282]:
            - row "Sep 13 0" [ref=e283]:
              - rowheader "Sep 13" [ref=e284]
              - cell "0" [ref=e285]
            - row "Sep 14 0" [ref=e286]:
              - rowheader "Sep 14" [ref=e287]
              - cell "0" [ref=e288]
            - row "Sep 15 0" [ref=e289]:
              - rowheader "Sep 15" [ref=e290]
              - cell "0" [ref=e291]
            - row "Sep 16 0" [ref=e292]:
              - rowheader "Sep 16" [ref=e293]
              - cell "0" [ref=e294]
            - row "Sep 17 0" [ref=e295]:
              - rowheader "Sep 17" [ref=e296]
              - cell "0" [ref=e297]
            - row "Sep 18 0" [ref=e298]:
              - rowheader "Sep 18" [ref=e299]
              - cell "0" [ref=e300]
            - row "Sep 19 1140" [ref=e301]:
              - rowheader "Sep 19" [ref=e302]
              - cell "1140" [ref=e303]
      - paragraph [ref=e304]: Average uses logged days only. An empty day doesn’t mean you ate nothing.
    - generic [ref=e305]:
      - heading "Most logged" [level=2] [ref=e306]
      - paragraph [ref=e307]: Foods you reach for often · All time
      - list [ref=e308]:
        - listitem [ref=e309]:
          - img [ref=e311]
          - generic [ref=e317]: Overnight oats
          - generic "1 time" [ref=e318]: ×1
        - listitem [ref=e319]:
          - img [ref=e321]
          - generic [ref=e324]: Chicken rice bowl
          - generic "1 time" [ref=e325]: ×1
        - listitem [ref=e326]:
          - img [ref=e328]
          - generic [ref=e334]: Tomato soup
          - generic "1 time" [ref=e335]: ×1
    - group [ref=e336]:
      - generic "Ticket archive Eight recent logged days" [ref=e337] [cursor=pointer]:
        - heading "Ticket archive" [level=2] [ref=e338]
        - generic [ref=e339]: Eight recent logged days
    - group [ref=e340]:
      - generic "Achievements 1/6" [ref=e341] [cursor=pointer]:
        - heading "Achievements" [level=2] [ref=e342]
        - generic [ref=e343]: 1/6
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