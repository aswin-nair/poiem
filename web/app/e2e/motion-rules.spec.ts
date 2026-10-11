import { expect, test, type Page, type Route } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'
import { settlePageLayout } from './helpers'

test.use({ timezoneId: 'UTC' })

interface CoachScrollSpy {
  __coachScrollCalls: ScrollIntoViewOptions[]
  __coachScrollEvents: Array<{ top: number; distance: number }>
}

const coachScrollCalls = (page: Page) => page.evaluate(() => [...(window as unknown as CoachScrollSpy).__coachScrollCalls])

async function afterScrollEvent(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

async function coachSeed(page: Page) {
  const state = visualSeedState()
  state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: 'local-test-key-not-a-credential', mascotEnabled: false }
  state.chatMessages = Array.from({ length: 30 }, (_, index) => ({
    id: `history-${index}`,
    role: index % 2 ? 'assistant' as const : 'user' as const,
    content: `Journal conversation ${index}. ${'An earlier message worth reading. '.repeat(12)}`,
    timestamp: new Date(Date.now() - (30 - index) * 60000).toISOString(),
  }))
  await applyVisualSeed(page, state)
  await page.addInitScript(() => {
    const calls: ScrollIntoViewOptions[] = []
    const events: Array<{ top: number; distance: number }> = []
    Object.assign(window, { __coachScrollCalls: calls, __coachScrollEvents: events })
    window.addEventListener('scroll', () => {
      const scroller = document.scrollingElement
      if (scroller) events.push({ top: scroller.scrollTop, distance: scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop })
    }, { passive: true })
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      if (typeof options === 'object') calls.push(options)
      original.call(this, options)
    }
  })
}

async function openCoach(page: Page) {
  await page.goto('/coach')
  // Coach is a lazy route: reaching its URL does not mean the follow effect ran.
  await expect(page.getByRole('heading', { name: 'AI Coach', exact: true })).toBeVisible()
  await expect(page.locator('.k-coach-thread article')).toHaveCount(30)
  await expect.poll(async () => (await coachScrollCalls(page)).length).toBeGreaterThan(0)
  // Cancel any initial smooth scroll before simulating the reader's scroll.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await afterScrollEvent(page)
}

async function scrollUpAndResetSpy(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  await afterScrollEvent(page)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500)
  await page.evaluate(() => {
    const spy = window as unknown as CoachScrollSpy
    spy.__coachScrollCalls.length = 0
    spy.__coachScrollEvents.length = 0
  })
}

async function expectNewestAboveComposer(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const latest = document.querySelector('.k-coach-thread article:last-of-type')?.getBoundingClientRect()
    const composer = document.querySelector('.k-coach-compose')?.getBoundingClientRect()
    return Boolean(latest && composer && latest.bottom <= composer.top + 1 && latest.bottom > 0)
  })).toBe(true)
}

test('Today meters reflect the value without animating width', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  const meters = page.getByRole('progressbar')
  await expect(meters.first()).toBeVisible()
  await settlePageLayout(page)
  const styles = await meters.evaluateAll(elements => elements.map(meter => {
    const fill = meter.querySelector('.k-meter-fill') as HTMLElement
    const computed = getComputedStyle(fill)
    const matrix = new DOMMatrixReadOnly(computed.transform)
    const progress = Number(meter.getAttribute('aria-valuenow')) / Number(meter.getAttribute('aria-valuemax'))
    return {
      transition: computed.transitionProperty,
      width: fill.getBoundingClientRect().width,
      trackWidth: meter.clientWidth,
      overflow: getComputedStyle(meter).overflowX,
      scaleX: matrix.a, scaleY: matrix.d, skewX: matrix.b, skewY: matrix.c,
      translation: matrix.e,
      expectedTranslation: (progress - 1) * meter.clientWidth,
      background: computed.backgroundImage,
      label: meter.getAttribute('aria-label'),
    }
  }))
  expect(styles.length).toBeGreaterThan(0)
  for (const style of styles) {
    expect(style.transition).toBe('transform')
    expect(style.overflow).toBe('hidden')
    expect(style.width).toBeCloseTo(style.trackWidth, 0)
    expect(style.scaleX).toBe(1)
    expect(style.scaleY).toBe(1)
    expect(style.skewX).toBe(0)
    expect(style.skewY).toBe(0)
    expect(style.translation).toBeCloseTo(style.expectedTranslation, 0)
  }
  // A full-width, unscaled calorie fill preserves its 14px stripe period.
  const calories = styles.find(style => style.label === 'Calories')!
  expect(calories.background).toContain('repeating-linear-gradient')
  expect(calories.background).toContain('9px')
  expect(calories.background).toContain('14px')
})

test('a quickly reopened sheet gets the quick class', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  await page.getByTestId('fab').click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
  await page.getByRole('dialog', { name: 'Log a meal' }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByTestId('fab').click()
  await expect(page.getByRole('dialog', { name: 'Log a meal' })).toHaveClass(/is-quick/)
})

test('Coach does not scroll a reader who scrolled up', async ({ page }) => {
  await coachSeed(page)
  await openCoach(page)
  await scrollUpAndResetSpy(page)
  await page.getByRole('button', { name: 'Delete your message' }).first().click()
  await expect(page.locator('.k-coach-thread article')).toHaveCount(29)
  await afterScrollEvent(page)
  expect(await coachScrollCalls(page)).toEqual([])
})

test('Coach uses instant scrolling under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await coachSeed(page)
  await openCoach(page)
  const calls = await coachScrollCalls(page)
  expect(calls.length).toBeGreaterThan(0)
  expect(calls.every(call => call.behavior === 'auto')).toBe(true)
  await expectNewestAboveComposer(page)
})

test('Coach follows the reader’s own send after scrolling up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let held: Route | undefined
  await page.route('https://openrouter.ai/api/v1/chat/completions', route => { held = route })
  await coachSeed(page)
  await openCoach(page)
  await scrollUpAndResetSpy(page)
  await page.getByRole('textbox', { name: 'Message Coach' }).fill('Help me plan a balanced meal.')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => Boolean(held)).toBe(true)
  await expect(page.locator('.k-coach-thread article')).toHaveCount(31)
  await expect.poll(async () => (await coachScrollCalls(page)).length).toBeGreaterThan(0)
  await held!.fulfill({ json: { choices: [{ message: { content: 'Try a meal with a grain, a protein and vegetables.' } }] } })
  await expect(page.locator('.k-coach-thread article')).toHaveCount(32)
  await expectNewestAboveComposer(page)
  expect((await coachScrollCalls(page)).every(call => call.behavior === 'auto')).toBe(true)
})

test('Coach keeps following while a smooth follow scroll is in flight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let held: Route | undefined
  await page.route('https://openrouter.ai/api/v1/chat/completions', route => { held = route })
  await coachSeed(page)
  await openCoach(page)
  await scrollUpAndResetSpy(page)
  await page.getByRole('textbox', { name: 'Message Coach' }).fill('What are some balanced lunch ideas?')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => Boolean(held)).toBe(true)
  // Fulfil while the real smooth scroll has moved down but is still well above
  // the follow threshold. Its intermediate scroll events must not disarm follow.
  await expect.poll(() => page.evaluate(() => {
    const scroller = document.scrollingElement!
    const events = (window as unknown as CoachScrollSpy).__coachScrollEvents
    return events.some(event => event.top > 500 && event.distance > 80)
      && scroller.scrollTop > 500 && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 80
  })).toBe(true)
  await held!.fulfill({ json: { choices: [{ message: { content: 'A lentil bowl with rice and vegetables is one option.' } }] } })
  await expect(page.locator('.k-coach-thread article')).toHaveCount(32)
  await expect.poll(async () => (await coachScrollCalls(page)).length).toBeGreaterThanOrEqual(2)
  expect((await coachScrollCalls(page)).every(call => call.behavior === 'smooth')).toBe(true)
  await expectNewestAboveComposer(page)
})
