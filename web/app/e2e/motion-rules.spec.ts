import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

async function coachSeed(page: Page) {
  const state = visualSeedState()
  state.chatMessages = Array.from({ length: 30 }, (_, index) => ({
    id: `history-${index}`,
    role: index % 2 ? 'assistant' as const : 'user' as const,
    content: `Journal conversation ${index}. ${'An earlier message worth reading. '.repeat(12)}`,
    timestamp: new Date(Date.now() - (30 - index) * 60000).toISOString(),
  }))
  await applyVisualSeed(page, state)
  await page.addInitScript(() => {
    const calls: ScrollIntoViewOptions[] = []
    Object.assign(window, { __coachScrollCalls: calls })
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      if (typeof options === 'object') calls.push(options)
      original.call(this, options)
    }
  })
}

test('Today meters reflect the value without animating width', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  const meter = page.getByRole('progressbar').first()
  await expect(meter).toBeVisible()
  const style = await meter.locator('.k-meter-fill').evaluate(fill => {
    const computed = getComputedStyle(fill)
    return { transition: computed.transitionProperty, transform: computed.transform, origin: computed.transformOrigin }
  })
  expect(style.transition).toBe('transform')
  expect(style.transform).not.toBe('none')
  expect(style.origin).toMatch(/^0px /)
})

test('a quickly reopened sheet gets the quick class', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Log a meal', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
  await page.getByRole('dialog', { name: 'Log a meal' }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Log a meal', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toHaveClass(/is-quick/)
})

test('Coach does not scroll a reader who scrolled up', async ({ page }) => {
  await coachSeed(page)
  await page.goto('/coach')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.evaluate(() => { (window as unknown as { __coachScrollCalls: ScrollIntoViewOptions[] }).__coachScrollCalls.length = 0 })
  await page.getByRole('button', { name: 'Delete your message' }).first().click()
  const calls = await page.evaluate(() => (window as unknown as { __coachScrollCalls: ScrollIntoViewOptions[] }).__coachScrollCalls)
  expect(calls).toEqual([])
})

test('Coach uses instant scrolling under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await coachSeed(page)
  await page.goto('/coach')
  const calls = await page.evaluate(() => (window as unknown as { __coachScrollCalls: ScrollIntoViewOptions[] }).__coachScrollCalls)
  expect(calls.length).toBeGreaterThan(0)
  expect(calls.every(call => call.behavior === 'auto')).toBe(true)
})
