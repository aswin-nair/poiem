import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, VISUAL_USER, visualSeedState } from './seed'
import { MOMO_ADVENTURES, adventureStorageKey } from '../src/lib/momoAdventures'

const book = (page: Page) => page.locator('.k-adventures')
async function openBook(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await book(page).locator('summary').click()
}
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
})

test('collect, replay, reload, finish the book, and clear with a way to cancel', async ({ page }) => {
  await applyVisualSeed(page)
  await openBook(page)
  const original = await page.locator('.k-meals').innerText()
  for (const adventure of MOMO_ADVENTURES) {
    await book(page).getByRole('button', { name: 'Challenges', exact: true }).click()
    await book(page).getByRole('button', { name: new RegExp(adventure.title) }).click()
    await book(page).getByRole('button', { name: adventure.options[0].label, exact: true }).click()
    await expect(book(page).getByRole('heading', { name: `${adventure.sticker} collected!` })).toBeFocused()
  }
  await expect(book(page).getByText('All six little discoveries, together.', { exact: false })).toBeVisible()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('6/6')
  await page.reload()
  await book(page).locator('summary').click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('6/6')
  await book(page).getByRole('button', { name: 'Color detective', exact: false }).click()
  await book(page).getByRole('button', { name: 'Something warm', exact: true }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('6/6')
  await book(page).getByRole('button', { name: 'See my sticker book' }).click()
  await book(page).getByRole('button', { name: 'Color spotter Collected', exact: false }).click()
  await expect(book(page).getByText('Your pick: Something warm')).toBeVisible()
  await book(page).getByRole('button', { name: 'See my sticker book' }).click()
  await book(page).getByRole('button', { name: 'Clear this sticker book' }).click()
  await book(page).getByRole('button', { name: 'Keep my stickers' }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('6/6')
  await book(page).getByRole('button', { name: 'Clear this sticker book' }).click()
  await book(page).getByRole('button', { name: 'Clear stickers', exact: true }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('0/6')
  expect(await page.evaluate(key => localStorage.getItem(key), adventureStorageKey(VISUAL_USER.sub))).toBeNull()
  expect(await page.locator('.k-meals').innerText()).toEqual(original)
})

test('keyboard users can open, choose, collect, return and collapse', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  const summary = book(page).locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  const challenge = book(page).getByRole('button', { name: /Color detective/ })
  await challenge.focus()
  await page.keyboard.press('Enter')
  await expect(book(page).getByRole('heading', { name: 'Color detective' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(book(page).getByRole('button', { name: 'Something bright', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(book(page).getByRole('heading', { name: 'Color spotter collected!' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(book(page).getByRole('button', { name: 'See my sticker book' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(book(page).getByRole('heading', { name: 'Your sticker book' })).toBeFocused()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(book(page)).not.toHaveAttribute('open')
  await expect(summary).toBeFocused()
})

for (const setting of ['calm', 'profile', 'system', 'hidden'] as const) {
  test(`collection respects ${setting} mascot preferences`, async ({ page }) => {
    const state = visualSeedState()
    state.gamification.mascotActivity = setting === 'calm' ? 'calm' : 'lively'
    state.profile.mascotReducedMotion = setting === 'profile'
    state.profile.mascotMuted = setting === 'hidden'
    await page.emulateMedia({ reducedMotion: setting === 'system' ? 'reduce' : 'no-preference' })
    await applyVisualSeed(page, state)
    await openBook(page)
    await book(page).getByRole('button', { name: /Color detective/ }).click()
    await book(page).getByRole('button', { name: 'Something bright', exact: true }).click()
    await expect(book(page).getByRole('heading', { name: 'Color spotter collected!' })).toBeVisible()
    if (setting === 'hidden') {
      await expect(book(page).locator('.momo-art')).toHaveCount(0)
      await expect(book(page).getByText(/My only clue/)).toHaveCount(0)
    } else {
      expect(await book(page).locator('.k-adventure-reveal').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
    }
  })
}

test('unavailable storage keeps discoveries and saves them when storage recovers', async ({ page }) => {
  await applyVisualSeed(page)
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('poiem-little-adventures-') && document.documentElement.dataset.allowAdventureWrite !== 'yes') throw new Error('Storage blocked for verification')
      write.call(this, key, value)
    }
  })
  await openBook(page)
  await book(page).getByRole('button', { name: /Color detective/ }).click()
  await book(page).getByRole('button', { name: 'Something bright', exact: true }).click()
  await expect(book(page).getByRole('status')).toContainText('Storage is unavailable')
  await expect(book(page).locator('.k-adventures-count')).toHaveText('1/6')
  expect(await page.evaluate(key => localStorage.getItem(key), adventureStorageKey(VISUAL_USER.sub))).toBeNull()
  await book(page).getByRole('button', { name: 'Challenges', exact: true }).click()
  await book(page).getByRole('button', { name: /Texture scout/ }).click()
  await book(page).getByRole('button', { name: 'A little crunch', exact: true }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('2/6')
  await page.locator('html').evaluate(element => { element.dataset.allowAdventureWrite = 'yes' })
  await book(page).getByRole('button', { name: 'Challenges', exact: true }).click()
  await book(page).getByRole('button', { name: /Kitchen DJ/ }).click()
  await book(page).getByRole('button', { name: 'The pan sizzle', exact: true }).click()
  await expect(book(page).getByRole('status', { includeHidden: true })).toBeEmpty()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).choices, adventureStorageKey(VISUAL_USER.sub)))
    .toEqual({ color: 'bright', texture: 'crunchy', sound: 'sizzle' })
})

test('another tab adds stickers without interrupting a chosen challenge', async ({ page, context }) => {
  await applyVisualSeed(page)
  await openBook(page)
  await book(page).getByRole('button', { name: /Texture scout/ }).click()
  const other = await context.newPage()
  await applyVisualSeed(other)
  await openBook(other)
  await book(other).getByRole('button', { name: /Color detective/ }).click()
  await book(other).getByRole('button', { name: 'Something bright', exact: true }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('1/6')
  await expect(book(page).getByRole('heading', { name: 'Texture scout' })).toBeVisible()
  await page.bringToFront()
  await book(page).getByRole('button', { name: 'A little crunch', exact: true }).click()
  await expect(book(other).locator('.k-adventures-count')).toHaveText('2/6')
  await other.close()
})

test('lively mode gives a finite sticker stamp and Momo cheer', async ({ page }) => {
  const state = visualSeedState()
  state.gamification.mascotActivity = 'lively'
  state.profile.mascotReducedMotion = false
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await applyVisualSeed(page, state)
  await openBook(page)
  await book(page).getByRole('button', { name: /Color detective/ }).click()
  await page.evaluate(() => {
    document.addEventListener('animationstart', event => {
      if (event.animationName.startsWith('k-adventure-')) document.documentElement.dataset.adventureAnimations =
        `${document.documentElement.dataset.adventureAnimations ?? ''} ${event.animationName}`
    })
  })
  await book(page).getByRole('button', { name: 'Something bright', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-adventure-animations', /k-adventure-stamp/)
  await expect(page.locator('html')).toHaveAttribute('data-adventure-animations', /k-adventure-cheer/)
  await expect.poll(() => book(page).locator('.k-adventure-reveal').evaluate(element =>
    element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
})

test('phone and desktop layouts have clear targets in both themes', async ({ page }, info) => {
  await applyVisualSeed(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const widths = info.project.name === 'desktop' ? [320, 390, 1440] : [page.viewportSize()!.width]
  for (const width of widths) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(book(page).locator('summary')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const prefix = `docs/ui-enhancements/little-adventures/after-${info.project.name}-${width}-${colorScheme}`
    if (info.project.name === 'desktop' && width !== 320) await page.screenshot({ path: `${prefix}-today.png`, fullPage: true, animations: 'disabled' })
    await book(page).locator('summary').click()
    await expect(book(page).getByRole('heading', { name: 'Pick your next discovery' })).toBeVisible()
    for (const control of await book(page).getByRole('button').all()) {
      const bounds = await control.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await book(page).evaluate(element => element.scrollIntoView({ block: 'start' }))
    await book(page).screenshot({ path: `${prefix}-challenges.png`, animations: 'disabled' })
    await book(page).getByRole('button', { name: /Color detective/ }).click()
    await book(page).getByRole('button', { name: 'Something bright', exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await book(page).evaluate(element => element.scrollIntoView({ block: 'start' }))
    await book(page).screenshot({ path: `${prefix}-collected.png`, animations: 'disabled' })
    await book(page).getByRole('button', { name: 'See my sticker book' }).click()
    await book(page).evaluate(element => element.scrollIntoView({ block: 'start' }))
    await book(page).screenshot({ path: `${prefix}-album.png`, animations: 'disabled' })
  }
  expect(errors).toEqual([])
})
