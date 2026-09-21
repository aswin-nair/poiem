import { test, expect } from '@playwright/test'
import { settlePageLayout, signUpAndOnboard } from './helpers'

/* Apple HIG and Material both put the minimum comfortable tap target at 44px.
   An audit before this test existed found 32 of 83 interactive elements below
   it, so this guards the floor: a control that shrinks back under 44px, or
   ships without an accessible name, fails here rather than on someone's thumb. */
const MIN_TARGET_PX = 44

const SCREENS = [
  { name: 'Home', path: '/' },
  { name: 'Log', path: '/log' },
  { name: 'Insights', path: '/progress' },
  { name: 'Saved', path: '/discover' },
  { name: 'Settings', path: '/settings' },
  { name: 'Support', path: '/support' },
]

const RESPONSIVE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1280, height: 800 },
]

const RESPONSIVE_SCREENS = [
  { name: 'Home', path: '/' },
  { name: 'Log', path: '/log' },
  { name: 'Saved', path: '/discover' },
]

interface Scan {
  small: Offender[]
  unnamed: string[]
  scanned: number
}

interface Offender {
  label: string
  width: number
  height: number
  name: string
}

test.describe('Tap targets', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 })
    await signUpAndOnboard(page)
  })

  for (const screen of SCREENS) {
    test(`${screen.name}: every control is at least ${MIN_TARGET_PX}px and named`, async ({ page }) => {
      await page.goto(screen.path)
      // Wait for a real signal, not a guess: the nav only paints once the app
      // has booted. A fixed sleep let an earlier version of this test measure a
      // blank page and pass without checking anything.
      await page.getByLabel('Main').waitFor({ state: 'visible' })
      await settlePageLayout(page)

      const offenders = await page.evaluate((min): Scan => {
        const small: Offender[] = []
        const unnamed: string[] = []
        const selector = 'button, a[href], [role="button"], input, select, textarea'

        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          if (el.offsetParent === null) continue
          const rect = el.getBoundingClientRect()
          if (rect.height === 0) continue

          const label = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0] || '(none)'}`

          // An accessible name can come from any of these; checking only one
          // of them is what made an earlier audit over-report by nine.
          const name = (
            el.getAttribute('aria-label') ||
            (el.getAttribute('aria-labelledby')
              ? document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent
              : '') ||
            el.closest('label')?.textContent ||
            (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : '') ||
            el.textContent ||
            el.getAttribute('title') ||
            ''
          ).trim()

          if (rect.width < min || rect.height < min) {
            small.push({ label, width: Math.round(rect.width), height: Math.round(rect.height), name })
          }
          if (!name) unnamed.push(label)
        }
        return { small, unnamed, scanned: document.querySelectorAll(selector).length }
      }, MIN_TARGET_PX)

      // Guard the guard: if the page renders nothing, the assertions below are
      // vacuous and would report a false pass.
      expect(offenders.scanned, `No controls found on ${screen.name}`).toBeGreaterThan(0)

      expect(
        offenders.small,
        `Controls under ${MIN_TARGET_PX}px on ${screen.name}: ` +
          offenders.small.map(o => `${o.label} ${o.width}x${o.height}`).join(', '),
      ).toEqual([])

      expect(
        offenders.unnamed,
        `Controls with no accessible name on ${screen.name}: ${offenders.unnamed.join(', ')}`,
      ).toEqual([])
    })
  }

  /* Being 44px is not enough if something decorative is painted on top. This
     app has had four separate cases of an overlay swallowing taps, so the
     toggles are checked by actually operating them: Playwright refuses to
     click an element that is not the topmost at its own centre. */
  test('Settings: toggles and radios are hittable, not just present', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('Main').waitFor({ state: 'visible' })

    const pause = page.locator('.settings-row').filter({ hasText: 'Pause tracking' })
      .locator('input[type="checkbox"]')

    // On and back off — the knob slides under the pointer between the two, so
    // only doing one direction misses the case that actually broke.
    await pause.check()
    await expect(pause).toBeChecked()
    await pause.uncheck()
    await expect(pause).not.toBeChecked()

    await page.goto('/settings?panel=momo')
    const calm = page.locator('.settings-row').filter({ hasText: 'Calm' }).locator('input[type="radio"]')
    await calm.check()
    await expect(calm).toBeChecked()
  })

  test('Core flows fit the supported viewport matrix without horizontal clipping', async ({ page }) => {
    test.setTimeout(120_000)
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize(viewport)

      for (const screen of RESPONSIVE_SCREENS) {
        await page.goto(screen.path)
        await page.getByLabel('Main').waitFor({ state: 'visible' })

        const layout = await page.evaluate(() => {
          const nav = document.querySelector<HTMLElement>('.bottom-nav-wrap')?.getBoundingClientRect()
          return {
            viewportWidth: document.documentElement.clientWidth,
            pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            navLeft: nav?.left ?? -1,
            navRight: nav?.right ?? Number.POSITIVE_INFINITY,
          }
        })

        const context = `${screen.name} at ${viewport.width}×${viewport.height}`
        expect(layout.pageWidth, `${context} overflows horizontally`).toBeLessThanOrEqual(layout.viewportWidth + 1)
        expect(layout.navLeft, `${context} clips the bottom navigation on the left`).toBeGreaterThanOrEqual(-1)
        expect(layout.navRight, `${context} clips the bottom navigation on the right`).toBeLessThanOrEqual(layout.viewportWidth + 1)
      }
    }
  })
})
