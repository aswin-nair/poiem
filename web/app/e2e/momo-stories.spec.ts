import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState, VISUAL_USER } from './seed'
import type { MomoInterludeStory } from '../src/lib/momoInterludes'

const cameo = (page: Page) => page.getByRole('complementary', { name: 'A little Momo moment' })
const protectedElements = 'button, a[href], input, textarea, select, summary, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="radio"], [role="checkbox"], [contenteditable="true"], .k-budget-number, .k-macro-value, .k-repeat-kcal, .k-repeat-macros, .k-journey-stats dd, .progress-stat-value'

/** Uses the same local action event as real controls; no test-only scene injection. */
async function prepareStory(page: Page, story: MomoInterludeStory, activity: 'lively' | 'calm' = 'lively', reducedPreference = false) {
  const state = visualSeedState()
  state.gamification.mascotActivity = activity
  state.profile.mascotReducedMotion = reducedPreference
  state.profile.loggingCommitment = 'detailed'
  await applyVisualSeed(page, state)
  await page.addInitScript(({ story, sub }) => {
    window.__POIEM_TEST__ = { rng: () => 0, hideOverlay: true, momoInterludes: true }
    sessionStorage.setItem(`poiem-momo-interludes-${sub}`, JSON.stringify({
      visits: 0,
      seen: story === 'heading-polish' ? ['title-borrow', 'title-heavy', 'title-wiggle'] : [],
    }))
  }, { story, sub: VISUAL_USER.sub })
  // About offers a public heading and reading space on a small phone. The
  // title story leaves the original About text and its navigation untouched.
  await page.goto(story === 'heading-polish' ? '/about' : '/')
  await page.waitForFunction(() => window.__POIEM_TEST__?.momoInterludeReady === true)
  if (story !== 'heading-polish' && (page.viewportSize()?.width ?? 1280) < 1120) {
    await page.locator('.k-today-companion').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  }
  if (story !== 'heading-polish') {
    await page.evaluate(kind => document.dispatchEvent(new CustomEvent('poiem-action-play', { detail: { kind } })), story === 'ticket-plane' ? 'submit' : 'save')
  }
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000))
}

async function expectStoryClear(page: Page) {
  const collisions = await page.evaluate(protectedSelector => {
    const stage = document.querySelector('.k-momo-interlude')!
    const parts = [...stage.querySelectorAll('.k-momo-interlude-bubble, .k-momo-interlude-actions, .k-momo-story-prop')].map(element => element.getBoundingClientRect())
    const controls = [...document.querySelectorAll(protectedSelector)].filter(element => {
      if (stage.contains(element)) return false
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
        && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
    })
    return controls.filter(element => {
      const rect = element.getBoundingClientRect()
      return parts.some(part => part.left < rect.right && part.right > rect.left && part.top < rect.bottom && part.bottom > rect.top)
    }).map(element => element.getAttribute('aria-label') || element.textContent?.trim())
  }, protectedElements)
  expect(collisions).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
}

for (const story of ['ticket-plane', 'heading-polish', 'saved-waiter'] as const) {
  for (const width of [320, 390, 844, 1440]) {
    test(`${story} performs once, preserves focus and protects controls at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await prepareStory(page, story)
      const focus = await page.evaluate(() => document.activeElement?.tagName)
      await page.clock.runFor(18_500)
      await expect(cameo(page)).toBeVisible()
      await expect(cameo(page)).toHaveAttribute('data-momo-scene', story)
      await expect(cameo(page)).not.toHaveClass(/is-static/)
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(focus)
      const prop = cameo(page).locator('.k-momo-story-prop')
      await expect(prop).toHaveCSS('overflow', 'hidden')
      await expect(prop).toHaveAttribute('aria-hidden', 'true')
      expect(await prop.getByRole('button').count()).toBe(0)
      let phase = 500
      for (const elapsed of [0, 1_000, 1_500, 2_500]) {
        await page.clock.runFor(elapsed)
        phase += elapsed
        // CSS uses a separate browser timeline from the installed clock.
        // Sample its actual keyframes at the same deterministic story phase.
        const finite = await cameo(page).evaluate((element, phase) => {
          const animations = element.getAnimations({ subtree: true })
          const finite = animations.every(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
          for (const animation of animations) {
            if (!Number.isFinite(animation.effect?.getComputedTiming().endTime)) continue
            animation.pause()
            animation.currentTime = Math.min(phase, Number(animation.effect?.getComputedTiming().endTime))
          }
          return finite
        }, phase)
        expect(finite).toBe(true)
        await expectStoryClear(page)
      }
      await cameo(page).evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
      expect(await cameo(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
      await expect(cameo(page).locator('.momo-art')).toHaveClass(/pose-still/)
      expect(await page.evaluate(sub => JSON.parse(sessionStorage.getItem(`poiem-momo-interludes-${sub}`)!).visits, VISUAL_USER.sub)).toBe(1)
      await page.clock.runFor(4_000)
      await expect(cameo(page)).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.dataset.momoInterlude)).toBeUndefined()
    })
  }

  for (const mode of ['calm', 'reduce', 'preference'] as const) {
    test(`${story} has a readable static ${mode} scene`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 })
      await page.emulateMedia({ reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' })
      await prepareStory(page, story, mode === 'calm' ? 'calm' : 'lively', mode === 'preference')
      await page.clock.runFor(mode === 'calm' ? 45_500 : 18_500)
      await expect(cameo(page)).toBeVisible()
      await expect(cameo(page)).toHaveAttribute('data-momo-scene', story)
      await expect(cameo(page)).toHaveClass(/is-static/)
      expect(await cameo(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
      await expectStoryClear(page)
      if (story === 'ticket-plane') {
        await expect(cameo(page).locator('.k-momo-story-ticket')).toHaveCSS('opacity', '1')
        await expect(cameo(page).locator('.k-momo-story-plane')).toHaveCSS('opacity', '1')
      }
    })
  }
}

test('a task story waits through the log picker and cancels its performance when another flow opens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await prepareStory(page, 'ticket-plane')
  await page.getByTestId('fab').click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
  await page.clock.runFor(25_000)
  await expect(cameo(page)).toBeHidden()
  expect(await page.evaluate(sub => JSON.parse(sessionStorage.getItem(`poiem-momo-interludes-${sub}`)!).visits, VISUAL_USER.sub)).toBe(0)
  await page.keyboard.press('Escape')
  // Escape is activity, so let the idle guard finish before the queued visit.
  await page.clock.runFor(8_000)
  await expect(cameo(page)).toBeVisible()
  await expect(cameo(page)).toHaveAttribute('data-momo-scene', 'ticket-plane')
  await page.getByTestId('fab').click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
  await expect(cameo(page)).toBeHidden()
  expect(await page.evaluate(() => document.querySelector('.k-momo-story-prop'))).toBeNull()
  expect(await page.evaluate(() => document.getAnimations().some(animation => animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.closest('.k-momo-interlude')))).toBe(false)
})
