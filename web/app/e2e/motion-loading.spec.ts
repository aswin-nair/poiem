import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed } from './seed'
import { settlePageLayout } from './helpers'

test.use({ timezoneId: 'UTC', viewport: { width: 390, height: 900 } })

// This spec uses the local dev server, whose module requests identify the
// deferred provider directly. Production footprint evidence is recorded apart.
const motionPayload = (url: string) => /\/src\/(?:components\/MotionScreen\.tsx|lib\/motionFeatures\.ts)(?:\?|$)/.test(new URL(url).pathname)

async function guest(page: Page, reducedMotion: 'reduce' | 'no-preference' = 'no-preference') {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (motionPayload(request.url())) requests.push(request.url()) })
  await page.emulateMedia({ reducedMotion })
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.addInitScript(() => {
    sessionStorage.setItem('poiem-splash-seen', '1')
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
  })
  return { errors, requests }
}

async function expectMarkerFits(tab: Locator) {
  await expect(tab).toHaveAttribute('aria-pressed', 'true')
  const marker = tab.locator('.auth-tab-marker')
  await expect(marker).toBeVisible()
  await expect.poll(async () => {
    const parent = await tab.boundingBox()
    const paint = await marker.boundingBox()
    return Boolean(parent && paint && Math.abs(parent.x - paint.x) < 1 && Math.abs(parent.y - paint.y) < 1
      && Math.abs(parent.width - paint.width) < 1 && Math.abs(parent.height - paint.height) < 1)
  }).toBe(true)
}

test('Today does not request animated-screen features even after deferred work', async ({ page }) => {
  const { errors, requests } = await guest(page)
  await applyVisualSeed(page)
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  await page.clock.runFor(12_000)
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  expect(requests).toEqual([])
  expect(errors).toEqual([])
})

test('Welcome loads the provider with its screen and keeps decorative motion controllable', async ({ page }) => {
  const { errors, requests } = await guest(page)
  await page.goto('/welcome')
  await expect(page.getByRole('heading', { name: 'A little tracking. A lot of living.', exact: true })).toBeVisible()
  expect(requests.some(url => url.includes('/components/MotionScreen.tsx'))).toBe(true)
  expect(requests.some(url => url.includes('/lib/motionFeatures.ts'))).toBe(true)
  await page.getByRole('button', { name: 'Pause decorative motion', exact: true }).click()
  await expect(page.locator('.welcome-poster')).toHaveClass(/wp-motion-paused/)
  await page.getByRole('button', { name: 'Play decorative motion', exact: true }).click()
  await expect(page.locator('.welcome-poster')).not.toHaveClass(/wp-motion-paused/)
  expect(errors).toEqual([])
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`Login preserves animated controls and the signup layout marker with ${reducedMotion}`, async ({ page }) => {
    const { errors, requests } = await guest(page, reducedMotion)
    await page.goto('/login?mode=signin')
    await expect(page.getByRole('heading', { name: 'Welcome back!', exact: true })).toBeVisible()
    expect(requests.some(url => url.includes('/lib/motionFeatures.ts'))).toBe(true)
    const tabs = page.getByRole('group', { name: 'Account access', exact: true })
    const signIn = tabs.getByRole('button', { name: 'Sign in', exact: true })
    await expectMarkerFits(signIn)
    await signIn.scrollIntoViewIfNeeded()
    const box = await signIn.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    try {
      if (reducedMotion === 'no-preference') {
        await expect.poll(() => signIn.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeLessThan(0.99)
      } else {
        const scales = await signIn.evaluate(async element => {
          const frames: number[] = []
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => requestAnimationFrame(resolve))
            frames.push(new DOMMatrixReadOnly(getComputedStyle(element).transform).a)
          }
          return frames
        })
        expect(scales.every(scale => Math.abs(scale - 1) < 0.001)).toBe(true)
      }
    } finally { await page.mouse.up() }
    const signUp = tabs.getByRole('button', { name: 'Sign up', exact: true })
    await signUp.click()
    await expect(page.getByRole('heading', { name: 'Join Poiem.', exact: true })).toBeVisible()
    await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
    await expectMarkerFits(signUp)
    await signIn.click()
    await expect(page.getByRole('heading', { name: 'Welcome back!', exact: true })).toBeVisible()
    await expectMarkerFits(signIn)
    expect(errors).toEqual([])
  })

  test(`Onboarding retains changing Momo props and setup focus with ${reducedMotion}`, async ({ page }) => {
    const { errors, requests } = await guest(page, reducedMotion)
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: 'Meet Momo.', exact: true })).toBeVisible()
    expect(requests.some(url => url.includes('/lib/motionFeatures.ts'))).toBe(true)
    if (reducedMotion === 'reduce') await expect(page.locator('.k-intro-momo')).toHaveCSS('transform', 'none')
    await page.getByRole('button', { name: 'Next introduction', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Read the steam.', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sleepy', exact: true }).click()
    await expect(page.locator('.k-intro-momo .momo-art')).toHaveAttribute('data-expression', 'sleepy')
    await page.getByRole('button', { name: 'Curious', exact: true }).click()
    await expect(page.locator('.k-intro-momo .momo-art')).toHaveAttribute('data-expression', 'curious')
    if (reducedMotion === 'reduce') {
      await expect(page.locator('.k-intro-momo')).toHaveCSS('transform', 'none')
      await expect(page.locator('.k-intro-text')).toHaveCSS('transform', 'none')
    }
    await page.getByRole('button', { name: 'Next introduction', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'His first piece.', exact: true })).toBeVisible()
    await expect(page.locator('.k-intro-momo .momo-blossom')).toBeVisible()
    await page.getByRole('button', { name: 'Get started', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'What is your date of birth?', exact: true })).toBeFocused()
    await page.getByLabel('Date of birth', { exact: true }).fill('2000-01-01')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'About you', exact: true })).toBeFocused()
    await settlePageLayout(page)
    expect(errors).toEqual([])
  })
}
