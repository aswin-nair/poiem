import { expect, test, type Page } from '@playwright/test'
import { logManualMeal, settlePageLayout, signUpAndOnboard } from './helpers'

async function fitsViewport(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  expect(metrics.content, `Horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(metrics.viewport + 1)
}

for (const viewport of [{ width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1440, height: 960 }]) {
  test(`visual surfaces at ${viewport.width}px fit and retain usable controls`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => {
      errors.push(error.message)
      console.error(`Runtime error on ${page.url()}: ${error.message}`)
    })
    await signUpAndOnboard(page)
    // Record real screens, not placeholder fixtures. Each test account is isolated.
    for (const [name, path] of [['today', '/'], ['log', '/log'], ['manual', '/log/manual'], ['describe', '/log/text'],
      ['photo', '/log/photo'], ['saved', '/discover'], ['insights', '/progress'], ['you', '/settings']]) {
      await test.step(`Open ${name} at ${viewport.width}px`, async () => {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await settlePageLayout(page)
      })
      await fitsViewport(page)
      if (name === 'today') await expect(page.getByRole('progressbar', { name: 'Calories' })).toBeVisible()
      if (name === 'log') await expect(page.getByRole('dialog', { name: 'Log a meal' })).toBeVisible()
      if (['today', 'log', 'describe', 'you'].includes(name)) await page.screenshot({ path: testInfo.outputPath(`${name}-${viewport.width}.png`), animations: 'disabled' })
    }
    await page.goto('/')
    await logManualMeal(page, { name: 'A rather long meal name with rice, vegetables, tofu and a side of soup', calories: '420' })
    await page.locator('.k-meal-row').filter({ hasText: 'A rather long meal name' }).click()
    await expect(page).toHaveURL(/\/edit\//)
    await expect(page.getByLabel('Food name')).toBeVisible()
    await settlePageLayout(page)
    await fitsViewport(page)
    const controlSizes = await page.locator('.flow-review-layout :is(input, button)').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect()
      return { label: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: box.width, height: box.height }
    }).filter(box => box.width > 0 && box.height > 0))
    expect(controlSizes.length).toBeGreaterThan(0)
    for (const box of controlSizes) {
      expect(box.height, `${box.label} height`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${box.label} width`).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: testInfo.outputPath(`edit-${viewport.width}.png`), animations: 'disabled', fullPage: true })
    expect(errors).toEqual([])
  })
}

test('keyboard button states, disabled links and modal focus work without a pointer', async ({ page }) => {
  await signUpAndOnboard(page)
  await page.goto('/dev/components')
  const button = page.getByRole('button', { name: 'Primary', exact: true })
  await button.focus()
  await page.keyboard.down('Space')
  await expect(button).toHaveClass(/is-pressed/)
  await page.keyboard.up('Space')
  await expect(page.getByRole('status').filter({ hasText: 'Button activations:' })).toHaveText('Button activations: 1')
  await expect(button).not.toHaveClass(/is-pressed/)
  await expect(button).toHaveCSS('outline-style', 'none')
  await expect(button.locator('.pressable-face')).toHaveCSS('outline-style', 'solid')
  await expect(page.getByRole('button', { name: 'Disabled action' })).toBeDisabled()
  const disabledLink = page.getByRole('link', { name: 'Disabled link' })
  await disabledLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/dev/components')
  await expect(page.getByRole('status').filter({ hasText: 'Button activations:' })).toHaveText('Button activations: 1')
  await page.goto('/')
  const dateButton = page.getByRole('button', { name: 'Choose date', exact: true })
  await dateButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Choose a date' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Choose a date' })).toHaveCount(0)
  await expect(dateButton).toBeFocused()
  await page.getByLabel('Main').getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeFocused()
  await page.getByLabel('Main').getByRole('link', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused()
})

test('reduced motion and enlarged text remain usable', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpAndOnboard(page)
  for (const path of ['/log/text', '/log/manual', '/settings']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await fitsViewport(page)
  }
  await page.goto('/dev/components')
  const button = page.getByRole('button', { name: 'Primary', exact: true })
  const transition = await button.locator('.pressable-face').evaluate(element => getComputedStyle(element).transitionDuration)
  expect(parseFloat(transition)).toBeLessThanOrEqual(.001)
})

test('Momo yields to the primary action and stays quiet while editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signUpAndOnboard(page)
  await page.getByRole('button', { name: 'Log a meal', exact: true }).click()
  await expect(page).toHaveURL('/log')
  await page.getByRole('link', { name: /Describe your meal/i }).click()
  const input = page.getByLabel('Your meal, your words')
  await input.fill('Toast')
  // A real hit test: the decorative mascot must not intercept the field.
  await expect(input).toBeFocused()
  await expect(page.locator('.mascot-host:not(.is-user-busy)')).toHaveCount(0)
})
