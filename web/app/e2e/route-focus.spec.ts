import { devices, expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, VISUAL_NOW } from './seed'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
})

async function pauseRouteFrame(page: Page) {
  // Hold the real route's animation frame until its mounted control is selected.
  // This makes the race repeatable without substituting page or router code.
  await page.clock.pauseAt(new Date(Date.parse(VISUAL_NOW) + 1000))
}

for (const width of [390, 1440]) {
  test(`pending route focus preserves a selected Manual field at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await pauseRouteFrame(page)
    await page.goto('/log/manual')
    const name = page.getByLabel('Food name')
    await name.fill('Rice and vegetables')
    await name.evaluate((element: HTMLInputElement) => {
      element.focus()
      element.setSelectionRange(5, 8)
    })
    await expect(name).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath(`selected-${width}.png`), animations: 'allow' })
    await page.clock.runFor(200)
    await page.screenshot({ path: testInfo.outputPath(`after-frame-${width}.png`), animations: 'allow' })
    await expect(name).toBeFocused()
    await expect(name).toHaveValue('Rice and vegetables')
    expect(await name.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd])).toEqual([5, 8])
    // Blurring later must not revive the abandoned route focus observer.
    await name.evaluate((element: HTMLInputElement) => {
      element.blur()
      element.parentElement!.append(document.createComment('Unrelated DOM update'))
    })
    await page.clock.runFor(200)
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  })

  test(`pending route focus preserves a selected action at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await pauseRouteFrame(page)
    await page.goto('/log/manual')
    const log = page.getByRole('button', { name: 'Log meal', exact: true })
    await log.focus()
    await expect(log).toBeFocused()
    await page.clock.runFor(200)
    await expect(log).toBeFocused()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('a direct Manual arrival without interaction focuses its heading', async ({ page }) => {
  await pauseRouteFrame(page)
  await page.goto('/log/manual')
  await expect(page.getByLabel('Food name')).toBeVisible()
  await page.clock.runFor(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
})

test('keyboard navigation moves focus from the retained tab to each destination heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused()
  const mainNav = page.getByRole('navigation', { name: 'Main', exact: true })
  await mainNav.getByRole('link', { name: 'Saved', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeFocused()
  await mainNav.getByRole('link', { name: 'Today', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused()
})

test('leaving a pending screen retires its focus request before its download finishes', async ({ page }) => {
  await page.goto('/')
  const today = page.getByRole('heading', { name: 'Today', exact: true })
  await expect(today).toBeFocused()
  let release: () => void = () => {}
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/pages/SettingsPage.tsx*', async route => {
    await held
    await route.continue()
  })
  try {
    await page.getByRole('link', { name: 'You', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Opening…' })).toBeVisible()
    await page.getByRole('link', { name: 'Today', exact: true }).click()
    await expect(today).toBeFocused()
    const downloaded = page.waitForResponse(response => response.url().includes('/src/pages/SettingsPage.tsx'))
    release()
    await downloaded
    await page.clock.runFor(200)
    await expect(today).toBeFocused()
    await expect(page).toHaveURL('/')
  } finally {
    release()
  }
})

for (const device of ['iPhone 13', 'Pixel 7']) {
  test.describe(device, () => {
    const emulation = devices[device]
    // The Chromium project supplies the browser; override only context options.
    test.use({
      viewport: emulation.viewport, userAgent: emulation.userAgent,
      deviceScaleFactor: emulation.deviceScaleFactor,
      isMobile: emulation.isMobile, hasTouch: emulation.hasTouch,
    })

    test('a selected Manual field retains focus at keyboard height while route focus is pending', async ({ page }) => {
      await pauseRouteFrame(page)
      await page.goto('/log/manual')
      const name = page.getByLabel('Food name')
      await name.fill('My lunch draft')
      await name.focus()
      await page.setViewportSize({ width: 390, height: 400 })
      await page.clock.runFor(200)
      await name.scrollIntoViewIfNeeded()
      await expect(name).toBeFocused()
      await expect(name).toHaveValue('My lunch draft')
      expect(await name.evaluate(element => {
        const box = element.getBoundingClientRect()
        return box.top >= 0 && box.bottom <= innerHeight
      })).toBe(true)
    })
  })
}
