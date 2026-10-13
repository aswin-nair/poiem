import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, VISUAL_USER, visualSeedState } from './seed'
import { adventureStorageKey } from '../src/lib/momoAdventures'

const book = (page: Page) => page.locator('.k-adventures')
const shelf = (page: Page) => page.getByRole('region', { name: 'Sticker shelf', exact: true })
const key = adventureStorageKey(VISUAL_USER.sub)

async function seedStickers(page: Page) {
  await page.addInitScript(storageKey => {
    if (sessionStorage.getItem('shelf-seeded')) return
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, choices: { color: 'bright', texture: 'crunchy' } }))
    sessionStorage.setItem('shelf-seeded', 'yes')
  }, key)
}

async function openAlbum(page: Page) {
  if (!await book(page).getAttribute('open').then(value => value !== null)) await book(page).locator('summary').click()
  await book(page).getByRole('button', { name: /^Sticker book \(/ }).click()
}

async function pin(page: Page, name = 'Color spotter') {
  await openAlbum(page)
  await book(page).getByRole('button', { name: new RegExp(`^${name} `) }).click()
  await book(page).getByRole('button', { name: 'Pin on Today', exact: true }).click()
  await expect(shelf(page).getByRole('heading', { name, exact: true })).toBeFocused()
  await expect(book(page)).not.toHaveAttribute('open')
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
})

test('pin, reload, switch, unpin and clear preserve the sticker book', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  await expect(shelf(page)).toHaveCount(0)
  await pin(page)
  expect(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).toEqual({
    version: 1, choices: { color: 'bright', texture: 'crunchy' }, pinned: 'color',
  })
  await page.reload()
  await expect(shelf(page).getByRole('heading', { name: 'Color spotter' })).toBeVisible()
  await expect(shelf(page).locator('.is-fresh')).toHaveCount(0)
  await shelf(page).getByRole('button', { name: 'Change sticker' }).click()
  await expect(book(page).getByRole('heading', { name: 'Your sticker book' })).toBeFocused()
  await expect(book(page).getByRole('button', { name: /Color spotter.*Pinned on Today/ })).toBeVisible()
  await pin(page, 'Crunch club')
  await shelf(page).getByRole('button', { name: 'Unpin sticker', exact: true }).click()
  await expect(shelf(page)).toHaveCount(0)
  await expect(book(page).locator('summary')).toBeFocused()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('2/6')
  await pin(page)
  await shelf(page).getByRole('button', { name: 'Change sticker' }).click()
  await book(page).getByRole('button', { name: 'Clear this sticker book' }).click()
  await book(page).getByRole('button', { name: 'Keep my stickers' }).click()
  await expect(shelf(page)).toBeVisible()
  await book(page).getByRole('button', { name: 'Clear this sticker book' }).click()
  await book(page).getByRole('button', { name: 'Clear stickers', exact: true }).click()
  await expect(shelf(page)).toHaveCount(0)
  await expect(book(page).locator('.k-adventures-count')).toHaveText('0/6')
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull()
})

test('keyboard pin and unpin return focus to visible controls', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  await book(page).locator('summary').focus()
  await page.keyboard.press('Enter')
  await book(page).getByRole('button', { name: /Color detective/ }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(book(page).getByRole('heading', { name: 'Color spotter collected!' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(book(page).getByRole('button', { name: 'See my sticker book' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(book(page).getByRole('button', { name: 'Try this one again' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(book(page).getByRole('button', { name: 'Pin on Today', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(shelf(page).getByRole('heading', { name: 'Color spotter' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(shelf(page).getByRole('button', { name: 'Change sticker' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(shelf(page).getByRole('button', { name: 'Unpin sticker', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(book(page).locator('summary')).toBeFocused()
})

test('another tab clearing the book removes its pin and restores visible focus', async ({ page, context }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  await pin(page)
  const other = await context.newPage()
  await applyVisualSeed(other)
  await other.route('**/api/**', route => route.abort('blockedbyclient'))
  await other.goto('/')
  await expect(shelf(other)).toBeVisible()
  await page.bringToFront()
  await shelf(page).getByRole('button', { name: 'Change sticker' }).focus()
  await other.evaluate(storageKey => localStorage.removeItem(storageKey), key)
  await expect(shelf(page)).toHaveCount(0)
  await expect(book(page).locator('summary')).toBeFocused()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('0/6')
  await other.close()
})

test('a blocked pin stays visible with an honest notice and saves when storage recovers', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (storageKey, value) {
      if (storageKey.startsWith('poiem-little-adventures-') && sessionStorage.getItem('shelf-seeded') && document.documentElement.dataset.allowAdventureWrite !== 'yes') throw new Error('Storage blocked for verification')
      write.call(this, storageKey, value)
    }
  })
  await page.goto('/')
  await pin(page)
  await expect(page.getByRole('status').filter({ hasText: 'Storage is unavailable' })).toBeVisible()
  expect(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!).pinned, key)).toBeUndefined()
  await page.locator('html').evaluate(element => { element.dataset.allowAdventureWrite = 'yes' })
  await shelf(page).getByRole('button', { name: 'Change sticker' }).click()
  await pin(page, 'Crunch club')
  expect(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!).pinned, key)).toBe('texture')
  await page.reload()
  await expect(shelf(page).getByRole('heading', { name: 'Crunch club' })).toBeVisible()
})

test('unpin from a keepsake retains the open book and the sticker', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  await pin(page)
  await shelf(page).getByRole('button', { name: 'Change sticker' }).click()
  await book(page).getByRole('button', { name: /Color spotter.*Pinned on Today/ }).click()
  await book(page).getByRole('button', { name: 'Unpin from Today' }).click()
  await expect(book(page)).toHaveAttribute('open')
  await expect(shelf(page)).toHaveCount(0)
  await expect(book(page).getByRole('button', { name: 'Pin on Today', exact: true })).toBeFocused()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('2/6')
})

for (const setting of ['calm', 'profile', 'system', 'muted', 'off'] as const) {
  test(`shelf respects ${setting} mascot preferences`, async ({ page }) => {
    const state = visualSeedState()
    state.gamification.mascotActivity = setting === 'calm' ? 'calm' : setting === 'off' ? 'off' : 'lively'
    state.profile.mascotReducedMotion = setting === 'profile'
    state.profile.mascotMuted = setting === 'muted'
    await page.emulateMedia({ reducedMotion: setting === 'system' ? 'reduce' : 'no-preference' })
    await applyVisualSeed(page, state)
    await seedStickers(page)
    await page.goto('/')
    await pin(page)
    if (setting === 'muted' || setting === 'off') {
      await expect(shelf(page).locator('.momo-art')).toHaveCount(0)
    } else {
      await expect(shelf(page).locator('.momo-art')).toHaveCount(1)
      expect(await shelf(page).evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
    }
  })
}

test('lively shelf celebration finishes and does not replay on reload', async ({ page }) => {
  const state = visualSeedState()
  state.gamification.mascotActivity = 'lively'
  state.profile.mascotReducedMotion = false
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await applyVisualSeed(page, state)
  await seedStickers(page)
  await page.addInitScript(() => {
    document.addEventListener('animationstart', event => {
      if ((event.target as Element).closest('.k-sticker-shelf')) document.documentElement.dataset.shelfAnimations =
        `${document.documentElement.dataset.shelfAnimations ?? ''} ${event.animationName}`
    })
  })
  await page.goto('/')
  await pin(page)
  await expect(page.locator('html')).toHaveAttribute('data-shelf-animations', /k-adventure-stamp/)
  await expect(page.locator('html')).toHaveAttribute('data-shelf-animations', /k-adventure-cheer/)
  await expect.poll(() => shelf(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await page.reload()
  await expect(shelf(page)).toBeVisible()
  await expect(shelf(page).locator('.is-fresh')).toHaveCount(0)
  expect(await shelf(page).evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-shelf-animations')
})

test('shelf has clear targets without overflow on phone and desktop in both themes', async ({ page }, info) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const widths = info.project.name === 'desktop' ? [320, 390, 1440] : [page.viewportSize()!.width]
  for (const width of widths) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    // Wait for the collection to mount before deciding whether a pin is needed.
    await expect(book(page).locator('summary')).toBeVisible()
    if (await shelf(page).count() === 0) await pin(page)
    await expect(shelf(page)).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (const control of await shelf(page).getByRole('button').all()) {
      const bounds = await control.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    }
    const actions = await shelf(page).getByRole('button').evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right }
    }))
    expect(actions[1].left - actions[0].right).toBeGreaterThanOrEqual(8)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const prefix = `docs/ui-enhancements/sticker-shelf/after-${info.project.name}-${width}-${colorScheme}`
    if (info.project.name === 'desktop') await page.screenshot({ path: `${prefix}-today.png`, fullPage: true, animations: 'disabled' })
    await shelf(page).screenshot({ path: `${prefix}-shelf.png`, animations: 'disabled' })
    await shelf(page).getByRole('button', { name: 'Change sticker' }).click()
    await expect(book(page).getByRole('heading', { name: 'Your sticker book' })).toBeFocused()
    await book(page).screenshot({ path: `${prefix}-album.png`, animations: 'disabled' })
    await book(page).locator('.k-adventure-small').last().evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const footerBounds = await book(page).locator('.k-adventure-small').last().boundingBox()
    const navBounds = await page.locator('.bottom-nav').boundingBox()
    expect(footerBounds!.y).toBeGreaterThanOrEqual(0)
    expect(footerBounds!.y + footerBounds!.height).toBeLessThanOrEqual(900)
    if (navBounds) {
      // The same navigation becomes a sidebar at desktop widths.
      const overlaps = footerBounds!.x < navBounds.x + navBounds.width
        && footerBounds!.x + footerBounds!.width > navBounds.x
        && footerBounds!.y < navBounds.y + navBounds.height
        && footerBounds!.y + footerBounds!.height > navBounds.y
      expect(overlaps).toBe(false)
    }
  }
  expect(errors).toEqual([])
})
