import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

test('the log sheet owns focus and Escape as soon as it is mounted', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await applyVisualSeed(page)
  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const status = { seen: false, focused: false, locked: false }
    Object.assign(window, { __sheetReady: status })
    const observer = new MutationObserver(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
      if (!dialog) return
      observer.disconnect()
      status.seen = true
      status.focused = dialog.contains(document.activeElement)
      status.locked = document.body.style.overflow === 'hidden'
      // Exercise the earliest DOM-visible moment. The ordinary Escape journey
      // also uses a trusted keyboard press; this guards listener registration.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
  await page.getByTestId('fab').click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __sheetReady: { seen: boolean } }).__sheetReady.seen)).toBe(true)
  expect(await page.evaluate(() => (window as typeof window & { __sheetReady: { focused: boolean } }).__sheetReady.focused)).toBe(true)
  expect(await page.evaluate(() => (window as typeof window & { __sheetReady: { locked: boolean } }).__sheetReady.locked)).toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByTestId('fab')).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})
