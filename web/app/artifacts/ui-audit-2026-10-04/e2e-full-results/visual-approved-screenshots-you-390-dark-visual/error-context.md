# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> approved screenshots >> you 390 dark
- Location: e2e\visual.spec.ts:41:9

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  9717 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: you-390-dark.png

Call log:
  - Expect "toHaveScreenshot(you-390-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 9717 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 9717 pixels (ratio 0.02 of all image pixels) are different.

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
      - paragraph [ref=e35]: Your space
      - heading "You" [active] [level=1] [ref=e36]
      - paragraph [ref=e37]: Ada Chen
    - paragraph [ref=e38]: Your routine · your pace
    - search "Find settings" [ref=e39]:
      - generic [ref=e40]:
        - img [ref=e41]
        - generic [ref=e44]: Find a setting
        - searchbox "Find a setting" [ref=e45]
      - status [ref=e46]
    - generic [ref=e47]:
      - navigation "You page sections" [ref=e49]:
        - link "Overview" [ref=e50] [cursor=pointer]:
          - /url: /settings
        - link "Profile & goals" [ref=e51] [cursor=pointer]:
          - /url: /settings?panel=profile
        - link "Preferences" [ref=e52] [cursor=pointer]:
          - /url: /settings?panel=preferences
        - link "Momo" [ref=e53] [cursor=pointer]:
          - /url: /settings?panel=momo
        - link "AI setup" [ref=e54] [cursor=pointer]:
          - /url: /settings?panel=ai
        - link "Account" [ref=e55] [cursor=pointer]:
          - /url: /settings?panel=account
        - link "Your data" [ref=e56] [cursor=pointer]:
          - /url: /settings?panel=data
      - generic [ref=e57]:
        - status [ref=e58]:
          - img [ref=e59]
          - text: All saved
        - button "Save settings" [disabled] [ref=e61]:
          - generic [ref=e62]: Save settings
    - region "Make yourself at home" [ref=e63]:
      - generic [ref=e64]:
        - heading "Make yourself at home" [level=2] [ref=e65]
        - paragraph [ref=e66]: Light, dark, or in step with your device. Your choice saves instantly.
      - group "Appearance" [ref=e67]:
        - generic [ref=e68]: Appearance
        - generic [ref=e69]:
          - generic [ref=e70] [cursor=pointer]:
            - radio "Light" [ref=e71]
            - generic [ref=e72]:
              - img [ref=e73]
              - generic [ref=e79]: Light
          - generic [ref=e80] [cursor=pointer]:
            - radio "Dark" [ref=e81]
            - generic [ref=e82]:
              - img [ref=e83]
              - generic [ref=e85]: Dark
          - generic [ref=e86] [cursor=pointer]:
            - radio "System" [checked] [ref=e87]
            - generic [ref=e88]:
              - img [ref=e89]
              - generic [ref=e91]: System
    - heading "Daily goals" [level=3] [ref=e92]
    - generic [ref=e93]:
      - generic [ref=e94]:
        - generic [ref=e95]: Calories
        - strong [ref=e96]: "2000"
      - generic [ref=e97]:
        - generic [ref=e98]: Protein
        - strong [ref=e99]: 110g
      - generic [ref=e100]:
        - generic [ref=e101]: Carbs
        - strong [ref=e102]: 220g
      - generic [ref=e103]:
        - generic [ref=e104]: Fat
        - strong [ref=e105]: 65g
    - heading "Quick preferences" [level=3] [ref=e106]
    - generic [ref=e107]:
      - generic [ref=e108]:
        - generic [ref=e109]:
          - generic [ref=e110]: Sound
          - generic [ref=e111]: Short cues when you log a meal
        - switch "Sound" [ref=e114] [cursor=pointer]
      - generic [ref=e115]:
        - generic [ref=e116]:
          - generic [ref=e117]: Pause tracking
          - generic [ref=e118]: Hide numbers and hold your streak.
        - switch "Pause tracking" [ref=e121] [cursor=pointer]
      - generic [ref=e122]:
        - generic [ref=e123]:
          - generic [ref=e124]: Notifications
          - generic [ref=e125]: At most two per day. Never about calories.
        - button "Notifications" [ref=e127] [cursor=pointer]: Allow
    - navigation "More in You" [ref=e128]:
      - link "Profile & goals" [ref=e129] [cursor=pointer]:
        - /url: /settings?panel=profile
        - generic [ref=e130]: Profile & goals
        - img [ref=e131]
      - link "Preferences" [ref=e133] [cursor=pointer]:
        - /url: /settings?panel=preferences
        - generic [ref=e134]: Preferences
        - img [ref=e135]
      - link "Momo" [ref=e137] [cursor=pointer]:
        - /url: /settings?panel=momo
        - generic [ref=e138]: Momo
        - img [ref=e139]
      - link "AI setup" [ref=e141] [cursor=pointer]:
        - /url: /settings?panel=ai
        - generic [ref=e142]: AI setup
        - img [ref=e143]
      - link "Account" [ref=e145] [cursor=pointer]:
        - /url: /settings?panel=account
        - generic [ref=e146]: Account
        - img [ref=e147]
      - link "Your data" [ref=e149] [cursor=pointer]:
        - /url: /settings?panel=data
        - generic [ref=e150]: Your data
        - img [ref=e151]
    - paragraph [ref=e153]: Poiem · Poiem AI or your own key · Privacy-first
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