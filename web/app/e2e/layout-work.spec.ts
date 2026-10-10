import { expect, test } from '@playwright/test'
import { applyVisualSeed, visualSeedState, VISUAL_USER, VISUAL_NOW } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

test('Coach draft grows, shrinks and updates its cap after viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
  await page.goto('/coach')
  const draft = page.getByRole('textbox', { name: 'Message Coach', exact: true })
  await expect(draft).toBeVisible()
  const initial = await draft.evaluate(element => element.getBoundingClientRect().height)
  await draft.fill(Array.from({ length: 20 }, (_, i) => `Meal idea ${i}`).join('\n'))
  await expect(draft).toHaveCSS('max-height', '192px')
  expect(await draft.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(initial)
  await page.setViewportSize({ width: 390, height: 400 })
  await page.clock.runFor(100)
  await expect(draft).toHaveCSS('max-height', '112px')
  // Desktop window resizing does not emulate a phone keyboard's automatic
  // focus reveal. The user can scroll the focused control into view.
  await draft.scrollIntoViewIfNeeded()
  await expect(draft).toBeFocused()
  const short = await draft.boundingBox()
  expect(short!.height).toBeLessThanOrEqual(112)
  expect(short!.y + short!.height).toBeLessThanOrEqual(400)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.clock.runFor(100)
  await expect(draft).toHaveCSS('max-height', '192px')
  await draft.fill('A short idea')
  expect(await draft.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(initial + 4)
})

async function visibleOverlay(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  const state = visualSeedState()
  state.aiSettings.mascotEnabled = false
  state.profile.mascotMuted = false
  state.gamification.mascotActivity = 'lively'
  await page.addInitScript(({ user, state }) => {
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
    sessionStorage.setItem('poiem-splash-seen', '1')
    window.__POIEM_TEST__ = { rng: () => .5 }
  }, { user: VISUAL_USER, state })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
  await page.goto('/')
  await expect(page.locator('.mascot-host')).toBeVisible()
  await page.clock.runFor(1500)
}

test('Momo steps aside for the real log dialog and returns after it closes', async ({ page }) => {
  await visibleOverlay(page)
  const host = page.locator('.mascot-host')
  await host.click()
  await page.clock.runFor(100)
  await expect(host.locator('.momo-art')).toHaveAttribute('data-expression', 'wink')
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: 'Log a meal', exact: true }).click()
  await page.clock.runFor(100)
  await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeVisible()
  await expect(host).toBeHidden()
  await page.keyboard.press('Escape')
  await page.clock.runFor(400)
  await expect(host).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Log a meal', exact: true })).toBeHidden()
})

test('one scheduled Momo check shares obstacle reads with its speech check', async ({ page }) => {
  await visibleOverlay(page)
  const host = page.locator('.mascot-host')
  await host.click()
  await page.clock.runFor(100)
  await expect(host.locator('.mascot-quip')).toHaveCount(1)
  await page.evaluate(() => {
    const fixture = window as Window & { obstacleScans?: number }
    fixture.obstacleScans = 0
    const original = document.querySelectorAll
    document.querySelectorAll = function (selector: string) {
      if (selector.includes('main input')) fixture.obstacleScans! += 1
      return original.call(this, selector)
    } as typeof document.querySelectorAll
    // One task's mutation burst belongs to one frame; speech remains mounted.
    document.body.classList.add('layout-work-fixture')
    document.body.classList.remove('layout-work-fixture')
  })
  await page.clock.runFor(32)
  expect(await page.evaluate(() => (window as Window & { obstacleScans?: number }).obstacleScans)).toBe(1)
  await expect(host).toBeVisible()
})

test('an absent floating Momo does not retry placement on every frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  const state = visualSeedState()
  state.aiSettings.mascotEnabled = false
  await applyVisualSeed(page, state)
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  await expect(page.locator('.mascot-host')).toHaveCount(0)
  await page.evaluate(() => {
    const fixture = window as Window & { obstacleScans?: number }
    fixture.obstacleScans = 0
    const original = document.querySelectorAll
    document.querySelectorAll = function (selector: string) {
      if (selector.includes('main input')) fixture.obstacleScans! += 1
      return original.call(this, selector)
    } as typeof document.querySelectorAll
  })
  await page.clock.runFor(200_000)
  // Allow occasional ambient/state checks, but reject a per-frame retry loop.
  expect(await page.evaluate(() => (window as Window & { obstacleScans?: number }).obstacleScans)).toBeLessThan(100)
  await expect(page.locator('.mascot-host')).toHaveCount(0)
})
