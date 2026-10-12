import { expect, test } from '@playwright/test'
import { applyVisualSeed } from './seed'

// A short phone: the page is taller than the screen, so a scroll on load would hide the heading.
test.use({ viewport: { width: 390, height: 640 } })

test.describe('Coach opening position', () => {
  test('an empty conversation opens at the top, not scrolled past the heading', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/coach')
    await expect(page.getByRole('heading', { name: 'AI Coach' })).toBeInViewport()
    // Give any follow-the-conversation scroll a frame to land before measuring.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0)
  })

  test('without AI it leads with setup, offers no starters, and keeps the composer', async ({ page }) => {
    await applyVisualSeed(page)
    await page.goto('/coach')
    await expect(page.getByRole('link', { name: 'Set up AI' }).or(page.getByRole('button', { name: 'Set up AI' }))).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Write it down here' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Summarize my recent logging pattern|protein-rich meal ideas|balanced next meal/ })).toHaveCount(0)
    // Local safety support answers without AI, so the composer stays.
    await expect(page.getByRole('textbox', { name: 'Message Coach' })).toHaveAttribute('placeholder', 'Ask for support…')
  })
})
