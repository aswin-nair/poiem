import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

// Presentation fixtures reuse the current sync banner's markup. They do not
// emulate cloud persistence or claim that any queued change reached a server.
for (const width of [320, 390, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`sync recovery presentation ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      await applyVisualSeed(page)
      await page.goto('/')
      await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
      await page.evaluate(() => {
        const banner = document.createElement('div')
        banner.className = 'cloud-sync-banner'
        banner.setAttribute('role', 'alert')
        banner.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6z" fill="none" stroke="currentColor" /></svg><span>This account changed on another device. Your device copy is preserved. Download the device copy before choosing which version to keep.</span><div><button type="button">Download device copy</button><button type="button" disabled>Use device copy</button><button type="button" disabled>Use server copy</button><button type="button">Sign out</button></div>'
        document.querySelector('.app-shell')?.before(banner)
      })
      const banner = page.locator('.cloud-sync-banner')
      await expect(banner).toHaveCSS('position', 'static')
      await expect(banner).toHaveCSS('display', 'grid')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      for (const button of await banner.getByRole('button').all()) {
        const box = await button.boundingBox()
        expect(box?.width).toBeGreaterThanOrEqual(44)
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
      }
      await expect(banner.getByRole('button', { name: 'Use server copy', exact: true })).toBeDisabled()
      const download = banner.getByRole('button', { name: 'Download device copy', exact: true })
      await download.focus()
      await expect(download).toBeFocused()
      await expect(download).toHaveCSS('outline-style', 'solid')
    })
  }
}
