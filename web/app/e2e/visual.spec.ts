import { expect, test, type Locator, type Page } from '@playwright/test'
import { settlePageLayout } from './helpers'
import { applyVisualSeed, visualSeedState, VISUAL_NOW, VISUAL_USER } from './seed'

const WIDTHS = [320, 390, 768, 1440] as const
/* The two widths that decide a composition: one phone column, one desktop rail. */
const PHONE_AND_DESKTOP = [390, 1440] as const
const THEMES = ['light', 'dark'] as const

type Surface = {
  name: string
  path: string
  /** Waited on before the capture, so the shot never lands mid-render. */
  ready: (page: Page) => Locator
  /** Defaults to every width; the phase 2 screens only lock the two that matter. */
  widths?: readonly number[]
}

const SURFACES: readonly Surface[] = [
  { name: 'today', path: '/', ready: page => page.getByRole('progressbar', { name: 'Calories' }) },
  { name: 'reference', path: '/dev/components', ready: page => page.getByRole('heading', { name: 'Components' }) },
  { name: 'log-sheet', path: '/log', ready: page => page.getByRole('dialog', { name: 'Log a meal' }), widths: [320, ...PHONE_AND_DESKTOP] },
  { name: 'describe', path: '/log/text', ready: page => page.getByLabel('Your meal, your words'), widths: PHONE_AND_DESKTOP },
  { name: 'photo', path: '/log/photo', ready: page => page.getByRole('heading', { name: 'Give your meal a close-up.' }), widths: PHONE_AND_DESKTOP },
  { name: 'manual', path: '/log/manual', ready: page => page.getByLabel('Food name'), widths: PHONE_AND_DESKTOP },
  { name: 'saved', path: '/discover', ready: page => page.getByRole('heading', { name: 'Saved', exact: true }), widths: PHONE_AND_DESKTOP },
  { name: 'insights', path: '/progress', ready: page => page.getByRole('region', { name: 'Journey' }), widths: PHONE_AND_DESKTOP },
  { name: 'you', path: '/settings', ready: page => page.getByRole('heading', { name: 'You', exact: true }), widths: PHONE_AND_DESKTOP },
  { name: 'coach', path: '/coach', ready: page => page.getByRole('heading', { name: 'AI Coach' }), widths: PHONE_AND_DESKTOP },
]

async function prepare(page: Page, width: number, theme: 'light' | 'dark', height = 900, state = visualSeedState()) {
  await page.setViewportSize({ width, height })
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await applyVisualSeed(page, state)
}

test.describe('approved screenshots', () => {
  for (const surface of SURFACES) {
    for (const width of surface.widths ?? WIDTHS) {
      for (const theme of THEMES) {
        test(`${surface.name} ${width} ${theme}`, async ({ page }) => {
          await prepare(page, width, theme)
          await page.goto(surface.path)
          await expect(surface.ready(page)).toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          await settlePageLayout(page)
          await page.addStyleTag({ content: '@media (max-width: 1119px) { .k-app .bottom-nav-wrap { position: absolute; top: auto; } }' })
          const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          expect(fits, `${surface.name} scrolls sideways at ${width}px ${theme}`).toBe(true)
          await expect(page).toHaveScreenshot(`${surface.name}-${width}-${theme}.png`, {
            // The log sheet is an overlay; a full-page shot of it would mostly be
            // the page underneath.
            fullPage: surface.name !== 'log-sheet',
            animations: 'disabled',
          })
        })
      }
    }
  }
  for (const name of ['today', 'log-sheet'] as const) {
    const surface = SURFACES.find(candidate => candidate.name === name)!
    for (const theme of THEMES) {
      test(`${name} landscape 844 ${theme}`, async ({ page }) => {
        await prepare(page, 844, theme, 390)
        await page.goto(surface.path)
        await expect(surface.ready(page)).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await settlePageLayout(page)
        await page.addStyleTag({ content: '@media (max-width: 1119px) { .k-app .bottom-nav-wrap { position: absolute; top: auto; } }' })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
        await expect(page).toHaveScreenshot(`${name}-844-landscape-${theme}.png`, {
          fullPage: name !== 'log-sheet', animations: 'disabled',
        })
      })
    }
  }
})

test.describe('Momo surprise cameos', () => {
  for (const width of PHONE_AND_DESKTOP) {
    for (const theme of THEMES) {
      test(`momo cameo ${width} ${theme}`, async ({ page }) => {
        const state = visualSeedState()
        state.gamification.mascotActivity = 'lively'
        // An incomplete chosen-step ring supplies real reading space. The
        // completed ring's Details action remains protected by the scheduler.
        if (width < 1120) state.profile.loggingCommitment = 'detailed'
        await prepare(page, width, theme, 900, state)
        await page.addInitScript(() => { window.__POIEM_TEST__ = { rng: () => 0, hideOverlay: true, momoInterludes: true } })
        await page.goto('/')
        await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
        await page.waitForFunction(() => window.__POIEM_TEST__?.momoInterludeReady === true)
        await settlePageLayout(page)
        if (width < 1120) {
          await page.locator('.k-today-companion').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
        }
        await page.clock.runFor(18_500)
        await expect(page.getByRole('complementary', { name: 'A little Momo moment' })).toBeVisible()
        await expect(page).toHaveScreenshot(`momo-cameo-${width}-${theme}.png`, { fullPage: false, animations: 'disabled' })
      })
    }
  }
})

for (const width of PHONE_AND_DESKTOP) {
  for (const theme of THEMES) {
    test(`review corrections ${width} ${theme}`, async ({ page }) => {
      await prepare(page, width, theme)
      await page.addInitScript(({ userId, now }) => {
        const original = { name: 'Rice with tofu', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }
        const analysis = { ...original, calories: 580, protein: 35, carbs: 75, fat: 20, servingSizeGrams: 450 }
        const base = { ...original, calories: 580 / 1.5, protein: 35 / 1.5 }
        localStorage.setItem(`fud-log-drafts-v1-${encodeURIComponent(userId)}`, JSON.stringify({ version: 1, review: {
          analysis, baseAnalysis: base, originalAnalysis: original, servings: 1.5,
          mealType: 'lunch', source: 'textInput', emptyNumericFields: [], updatedAt: now,
        } }))
      }, { userId: VISUAL_USER.sub, now: VISUAL_NOW })
      await page.goto('/review')
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Reset calories to estimate', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reset protein to estimate', exact: true })).toBeVisible()
      await settlePageLayout(page)
      if (width === 390) {
        await page.locator('.flow-nutrition').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      const confirmation = page.getByRole('region', { name: 'Final meal confirmation', exact: true })
      await expect(confirmation).toHaveCSS('position', width === 390 ? 'fixed' : 'static')
      await expect(page).toHaveScreenshot(`review-corrections-${width}-${theme}.png`, { fullPage: width === 1440, animations: 'disabled' })
    })
  }
}

test('Today fields stay aligned and Momo stays off the numbers', async ({ page }) => {
  await prepare(page, 390, 'light')
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
  await settlePageLayout(page)

  const layout = await page.evaluate(() => {
    const macros = [...document.querySelectorAll('.k-macro')].map(node => node.getBoundingClientRect())
    const meals = document.querySelector('.k-meals')?.getBoundingClientRect()
    const overlay = document.querySelector('.mascot-overlay')
    const protectedRegion = document.querySelector('[data-mascot-avoid].k-today-main')?.getBoundingClientRect()
    return {
      macroLefts: macros.map(box => Math.round(box.left)),
      macroHeights: macros.map(box => Math.round(box.height)),
      mealsTop: meals ? Math.round(meals.top) : 0,
      overlay: overlay?.getBoundingClientRect() ?? null,
      protected: protectedRegion
        ? { left: protectedRegion.left, right: protectedRegion.right, top: protectedRegion.top, bottom: protectedRegion.bottom }
        : null,
    }
  })

  expect(layout.macroLefts.length).toBe(3)
  expect(Math.max(...layout.macroHeights) - Math.min(...layout.macroHeights)).toBeLessThanOrEqual(4)
  expect(layout.overlay).toBeNull()
  expect(layout.protected).not.toBeNull()
})
