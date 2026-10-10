import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState, VISUAL_USER } from './seed'
import { nav, settlePageLayout } from './helpers'

test.use({ timezoneId: 'UTC' })

// Synthetic CSS insets exercise the existing cameo placement on real screens.
// They do not certify Safari env(), hardware cutouts or visual-viewport offsets.
const scenarios = [
  { name: 'portrait', width: 390, height: 900, top: 44, right: 7, bottom: 34, left: 11 },
  { name: 'desktop', width: 1440, height: 900, top: 44, right: 44, bottom: 21, left: 44 },
] as const
type Scenario = { name: string; width: number; height: number; top: number; right: number; bottom: number; left: number }

const cameo = (page: Page) => page.getByRole('complementary', { name: 'A little Momo moment', exact: true })

async function prepare(page: Page, scenario: Scenario, theme: 'light' | 'dark', quietArea = true) {
  await page.setViewportSize({ width: scenario.width, height: scenario.height })
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  const state = visualSeedState()
  state.gamification.mascotActivity = 'lively'
  state.profile.mascotMuted = false
  state.profile.trackingPaused = false
  if (scenario.width < 1120 && quietArea) state.profile.loggingCommitment = 'detailed'
  await applyVisualSeed(page, state)
  await page.addInitScript(insets => {
    window.__POIEM_TEST__ = { rng: () => 0, hideOverlay: true, momoInterludes: true }
    const apply = () => {
      const root = document.documentElement
      if (!root) return false
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        root.style.setProperty(`--k-safe-${side}`, `${insets[side]}px`, 'important')
      }
      return true
    }
    if (!apply()) {
      const observer = new MutationObserver(() => { if (apply()) observer.disconnect() })
      observer.observe(document, { childList: true })
    }
    document.addEventListener('DOMContentLoaded', apply, { once: true })
  }, scenario)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.waitForFunction(() => window.__POIEM_TEST__?.momoInterludeReady === true)
  if (scenario.width < 1120 && quietArea) {
    // Reuse the real detailed-day quiet area used by momo-interlude.spec.ts.
    await page.locator('.k-today-companion').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  }
  await settlePageLayout(page)
}

async function visits(page: Page): Promise<number> {
  return page.evaluate(sub => {
    const ledger = sessionStorage.getItem(`poiem-momo-interludes-${sub}`)
    return ledger ? JSON.parse(ledger).visits : 0
  }, VISUAL_USER.sub)
}

async function expectSafePart(part: Locator, scenario: Scenario, navigation: Locator) {
  await expect(part).toBeVisible()
  const bounds = await part.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x, 'Paint clears the left inset').toBeGreaterThanOrEqual(scenario.left - 1)
  expect(bounds!.y, 'Paint clears the top inset').toBeGreaterThanOrEqual(scenario.top - 1)
  expect(bounds!.x + bounds!.width, 'Paint clears the right inset').toBeLessThanOrEqual(scenario.width - scenario.right + 1)
  expect(bounds!.y + bounds!.height, 'Paint clears the bottom inset').toBeLessThanOrEqual(scenario.height - scenario.bottom + 1)
  // Phone navigation owns its whole bottom bar. The desktop rail has usable
  // blank space beneath its actions, so protect the actual interactive items.
  const protectedNavigation = scenario.width < 1120 ? [navigation]
    : await navigation.locator('.nav-item, .nav-fab').all()
  expect(protectedNavigation.length).toBeGreaterThan(0)
  for (const control of protectedNavigation) {
    const rail = await control.boundingBox()
    expect(rail).not.toBeNull()
    expect(bounds!.x + bounds!.width <= rail!.x || bounds!.x >= rail!.x + rail!.width
      || bounds!.y + bounds!.height <= rail!.y || bounds!.y >= rail!.y + rail!.height,
    'Paint stays clear of protected navigation').toBe(true)
  }
}

for (const scenario of scenarios) for (const theme of ['light', 'dark'] as const) {
  test(`Momo respects synthetic safe edges in the ${scenario.name} quiet area ${theme}`, async ({ page }) => {
    await prepare(page, scenario, theme)
    const previousFocus = nav(page).getByRole('link', { name: 'Today', exact: true })
    await previousFocus.evaluate(element => element.focus({ preventScroll: true }))
    await expect(previousFocus).toBeFocused()
    expect(await visits(page)).toBe(0)
    await page.clock.runFor(18_500)
    const scene = cameo(page)
    await expect(scene).toBeVisible()
    await expect(scene).toHaveClass(/is-static/)
    await expect(previousFocus).toBeFocused()
    await settlePageLayout(page)
    for (const selector of ['.k-momo-interlude-bubble', '.k-momo-interlude-art', '.k-momo-interlude-prop']) {
      await expectSafePart(scene.locator(selector), scenario, nav(page))
    }
    for (const action of await scene.getByRole('button').all()) {
      await expectSafePart(action, scenario, nav(page))
      const box = await action.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(await action.evaluate(element => {
        const rect = element.getBoundingClientRect()
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
        return hit === element || element.contains(hit)
      }), 'Momo controls accept a pointer').toBe(true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    expect(await visits(page)).toBe(1)
    await scene.getByRole('button', { name: 'Dismiss Momo moment', exact: true }).click()
    await expect(scene).toBeHidden()
    await expect(previousFocus).toBeFocused()
  })
}

test('a dense phone with synthetic safe edges defers Momo without spending a visit', async ({ page }) => {
  const dense = { ...scenarios[0], height: 664 }
  await prepare(page, dense, 'light', false)
  const previousFocus = nav(page).getByRole('link', { name: 'Today', exact: true })
  await previousFocus.evaluate(element => element.focus({ preventScroll: true }))
  await page.clock.runFor(18_500)
  await expect(cameo(page)).toBeHidden()
  expect(await visits(page)).toBe(0)
  await expect(previousFocus).toBeFocused()
})

test('an unavailable inset region keeps the visit for a later usable viewport', async ({ page }) => {
  const scenario = scenarios[0]
  await prepare(page, scenario, 'light')
  // Change the existing CSS contract rather than inventing another DOM surface
  // or mocking browser-owned visualViewport geometry.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--k-safe-left', '150px', 'important')
    document.documentElement.style.setProperty('--k-safe-right', '150px', 'important')
    window.dispatchEvent(new Event('resize'))
  })
  await page.clock.runFor(18_500)
  await expect(cameo(page)).toBeHidden()
  expect(await visits(page)).toBe(0)
  await page.evaluate(insets => {
    document.documentElement.style.setProperty('--k-safe-left', `${insets.left}px`, 'important')
    document.documentElement.style.setProperty('--k-safe-right', `${insets.right}px`, 'important')
    window.dispatchEvent(new Event('resize'))
  }, scenario)
  await page.locator('.k-today-companion').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await settlePageLayout(page)
  await page.clock.runFor(2_500)
  await expect(cameo(page)).toBeVisible()
  expect(await visits(page)).toBe(1)
})
