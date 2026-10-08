import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState, VISUAL_USER } from './seed'
import { settlePageLayout } from './helpers'

test.use({ viewport: { width: 1440, height: 900 } })

async function prepare(page: Page, options: { muted?: boolean; paused?: boolean; activity?: 'lively' | 'calm' | 'off'; quietArea?: boolean } = {}) {
  const state = visualSeedState()
  state.gamification.mascotActivity = options.activity ?? 'lively'
  state.profile.mascotMuted = options.muted ?? false
  state.profile.trackingPaused = options.paused ?? false
  if ((page.viewportSize()?.width ?? 1280) < 1120 && options.quietArea !== false) {
    state.profile.loggingCommitment = 'detailed'
  }
  await applyVisualSeed(page, state)
  await page.addInitScript(() => { window.__POIEM_TEST__ = { rng: () => 0, hideOverlay: true, momoInterludes: true } })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  if (!options.muted && !options.paused && options.activity !== 'off') {
    await page.waitForFunction(() => window.__POIEM_TEST__?.momoInterludeReady === true)
    if ((page.viewportSize()?.width ?? 1280) < 1120 && options.quietArea !== false) {
      await page.locator('.k-today-companion').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    }
  }
}

const cameo = (page: Page) => page.getByRole('complementary', { name: 'A little Momo moment' })

test('a dense phone Today defers Momo without spending a visit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page, { quietArea: false })
  await settlePageLayout(page)
  await page.clock.runFor(18_500)
  await expect(cameo(page)).toBeHidden()
  const visits = await page.evaluate(sub => {
    const ledger = sessionStorage.getItem(`poiem-momo-interludes-${sub}`)
    return ledger ? JSON.parse(ledger).visits : 0
  }, VISUAL_USER.sub)
  expect(visits).toBe(0)
})

test('Today opens before cameo code loads, and the original first-visit timing is kept', async ({ page }) => {
  const state = visualSeedState()
  state.gamification.mascotActivity = 'lively'
  await applyVisualSeed(page, state)
  await page.addInitScript(() => {
    window.__POIEM_TEST__ = { rng: () => 0, hideOverlay: true, momoInterludes: true, momoInterludeImmediate: false }
  })
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
  await page.clock.runFor(7_000)
  expect(await page.evaluate(() => window.__POIEM_TEST__?.momoInterludeReady)).not.toBe(true)
  await page.clock.runFor(2_000)
  await page.waitForFunction(() => window.__POIEM_TEST__?.momoInterludeReady === true)
  await expect(cameo(page)).toBeHidden()
  await page.clock.runFor(9_500)
  await expect(cameo(page)).toBeVisible()
})

for (const width of [320, 390, 1440]) {
  test(`Momo arrives without taking focus and stays clear of navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await prepare(page)
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    await page.clock.runFor(18_500)
    await expect(cameo(page)).toBeVisible()
    await expect(cameo(page)).toContainText(width < 1120 ? 'Tiny splash. Extremely official.' : 'Borrowing this word')
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(focused)
    await expect(cameo(page)).toHaveClass(/is-static/)
    const bounds = await page.evaluate(() => {
      const card = document.querySelector('.k-momo-interlude')!.getBoundingClientRect()
      const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect()
      return { left: card.left, right: card.right, top: card.top, bottom: card.bottom, navTop: nav.top, width: innerWidth, scroll: document.documentElement.scrollWidth }
    })
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(width)
    expect(bounds.scroll).toBeLessThanOrEqual(width)
    if (width < 1120) expect(bounds.bottom).toBeLessThan(bounds.navTop)
    await page.getByRole('button', { name: 'Dismiss Momo moment' }).click()
    await expect(cameo(page)).toBeHidden()
    await page.clock.runFor(85_000)
    await expect(cameo(page)).toBeVisible()
    await expect(cameo(page)).toContainText(width < 1120 ? 'Lifeguard on duty.' : 'Big letters. Tiny stagehand')
  })
}

test('Mute stops subsequent cameos and survives a reload', async ({ page }) => {
  await prepare(page)
  await page.clock.runFor(18_500)
  await page.getByRole('button', { name: 'Mute Momo', exact: true }).click()
  await expect(cameo(page)).toBeHidden()
  await page.clock.runFor(200_000)
  await expect(cameo(page)).toBeHidden()
  await expect.poll(() => page.evaluate(async sub => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    return (await loadDurableState(sub))?.state.profile.mascotMuted
  }, VISUAL_USER.sub)).toBe(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.clock.runFor(60_000)
  await expect(cameo(page)).toBeHidden()
})

for (const options of [{ muted: true }, { paused: true }, { activity: 'off' as const }]) {
  test(`respects existing Momo preferences ${JSON.stringify(options)}`, async ({ page }) => {
    await prepare(page, options)
    await page.clock.runFor(60_000)
    await expect(cameo(page)).toBeHidden()
  })
}

test('Calm uses a later static cameo and caps the session at two visits', async ({ page }) => {
  await prepare(page, { activity: 'calm' })
  await page.clock.runFor(35_000)
  await expect(cameo(page)).toBeHidden()
  await page.clock.runFor(10_500)
  await expect(cameo(page)).toBeVisible()
  await expect(cameo(page)).toHaveClass(/is-static/)
  await page.clock.runFor(190_000)
  await expect(cameo(page)).toBeVisible()
  await page.clock.runFor(400_000)
  await expect(cameo(page)).toBeHidden()
  expect(await page.evaluate(sub => JSON.parse(sessionStorage.getItem(`poiem-momo-interludes-${sub}`)!).visits, VISUAL_USER.sub)).toBe(2)
})

test('dialogs and text entry win over an active cameo', async ({ page }) => {
  await prepare(page)
  await page.clock.runFor(18_500)
  await expect(cameo(page)).toBeVisible()
  await page.getByTestId('fab').click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
  await expect(cameo(page)).toBeHidden()
  await page.clock.runFor(100_000)
  await expect(cameo(page)).toBeHidden()
  await page.goto('/discover')
  const search = page.locator('#saved-meal-search')
  await search.focus()
  await page.clock.runFor(40_000)
  await expect(cameo(page)).toBeHidden()
  await page.goto('/support')
  await page.clock.runFor(100_000)
  await expect(cameo(page)).toBeHidden()
})

test.describe('touch cameos', () => {
  test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  for (const viewport of [{ width: 360, height: 844 }, { width: 844, height: 390 }]) {
    test(`dismissal preserves scroll clearance at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await prepare(page)
      await page.clock.runFor(18_500)
      await expect(cameo(page)).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const scroll = await page.evaluate(() => scrollY)
      const buttons = cameo(page).getByRole('button')
      for (const button of await buttons.all()) {
        const box = await button.boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(44)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      await page.getByRole('button', { name: 'Dismiss Momo moment' }).tap()
      await expect(cameo(page)).toBeHidden()
      expect(await page.evaluate(() => scrollY)).toBe(scroll)
      expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--k-momo-interlude-clearance'))).not.toBe('')
    })
  }
})
