# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> you 1440 light
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  12414 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: you-1440-light.png

Call log:
  - Expect "toHaveScreenshot(you-1440-light.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 12414 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 12414 pixels (ratio 0.01 of all image pixels) are different.

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
      - paragraph [ref=e43]: Your space
      - heading "You" [active] [level=1] [ref=e44]
      - paragraph [ref=e45]: Ada Chen
    - paragraph [ref=e46]: Your routine · your pace
    - search "Find settings" [ref=e47]:
      - generic [ref=e48]:
        - img [ref=e49]
        - generic [ref=e52]: Find a setting
        - searchbox "Find a setting" [ref=e53]
      - status [ref=e54]
    - generic [ref=e55]:
      - navigation "You page sections" [ref=e57]:
        - link "Overview" [ref=e58] [cursor=pointer]:
          - /url: /settings
        - link "Profile & goals" [ref=e59] [cursor=pointer]:
          - /url: /settings?panel=profile
        - link "Preferences" [ref=e60] [cursor=pointer]:
          - /url: /settings?panel=preferences
        - link "Momo" [ref=e61] [cursor=pointer]:
          - /url: /settings?panel=momo
        - link "AI setup" [ref=e62] [cursor=pointer]:
          - /url: /settings?panel=ai
        - link "Account" [ref=e63] [cursor=pointer]:
          - /url: /settings?panel=account
        - link "Your data" [ref=e64] [cursor=pointer]:
          - /url: /settings?panel=data
      - generic [ref=e65]:
        - status [ref=e66]:
          - img [ref=e67]
          - text: All saved
        - button "Save settings" [disabled] [ref=e69]:
          - generic [ref=e70]: Save settings
    - region "Make yourself at home" [ref=e71]:
      - generic [ref=e72]:
        - heading "Make yourself at home" [level=2] [ref=e73]
        - paragraph [ref=e74]: Light, dark, or in step with your device. Your choice saves instantly.
      - group "Appearance" [ref=e75]:
        - generic [ref=e76]: Appearance
        - generic [ref=e77]:
          - generic [ref=e78] [cursor=pointer]:
            - radio "Light" [ref=e79]
            - generic [ref=e80]:
              - img [ref=e81]
              - generic [ref=e87]: Light
          - generic [ref=e88] [cursor=pointer]:
            - radio "Dark" [ref=e89]
            - generic [ref=e90]:
              - img [ref=e91]
              - generic [ref=e93]: Dark
          - generic [ref=e94] [cursor=pointer]:
            - radio "System" [checked] [ref=e95]
            - generic [ref=e96]:
              - img [ref=e97]
              - generic [ref=e99]: System
    - heading "Daily goals" [level=3] [ref=e100]
    - generic [ref=e101]:
      - generic [ref=e102]:
        - generic [ref=e103]: Calories
        - strong [ref=e104]: "2000"
      - generic [ref=e105]:
        - generic [ref=e106]: Protein
        - strong [ref=e107]: 110g
      - generic [ref=e108]:
        - generic [ref=e109]: Carbs
        - strong [ref=e110]: 220g
      - generic [ref=e111]:
        - generic [ref=e112]: Fat
        - strong [ref=e113]: 65g
    - heading "Quick preferences" [level=3] [ref=e114]
    - generic [ref=e115]:
      - generic [ref=e116]:
        - generic [ref=e117]:
          - generic [ref=e118]: Sound
          - generic [ref=e119]: Short cues when you log a meal
        - switch "Sound" [ref=e122] [cursor=pointer]
      - generic [ref=e123]:
        - generic [ref=e124]:
          - generic [ref=e125]: Pause tracking
          - generic [ref=e126]: Hide numbers and hold your streak.
        - switch "Pause tracking" [ref=e129] [cursor=pointer]
      - generic [ref=e130]:
        - generic [ref=e131]:
          - generic [ref=e132]: Notifications
          - generic [ref=e133]: At most two per day. Never about calories.
        - button "Notifications" [ref=e135] [cursor=pointer]: Allow
    - paragraph [ref=e136]: Poiem · Poiem AI or your own key · Privacy-first
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