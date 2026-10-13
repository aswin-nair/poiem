import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, VISUAL_USER, visualSeedState } from './seed'
import { MOMO_ADVENTURES, adventureStorageKey } from '../src/lib/momoAdventures'
import { MOMO_PLAY_ACTIONS, MOMO_PLAY_WELCOME } from '../src/lib/momoPlay'

const room = (page: Page) => page.locator('.k-momo-playroom')
const book = (page: Page) => page.locator('.k-adventures')
const shelf = (page: Page) => page.getByRole('region', { name: 'Sticker shelf', exact: true })
const key = adventureStorageKey(VISUAL_USER.sub)

test('sticker pairs can be solved, replayed and leave the collection untouched', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  const original = await collection(page)
  await book(page).locator('summary').click()
  await book(page).getByRole('button', { name: 'Sticker pairs', exact: true }).click()
  const game = page.getByRole('region', { name: 'Sticker pairs game' })
  const cards = game.locator('.k-pairs-card')
  const known = new Map<string, number[]>()
  for (let i = 0; i < 12; i += 2) {
    for (const index of [i, i + 1]) {
      await cards.nth(index).click()
      const name = (await cards.nth(index).getAttribute('aria-label'))!.replace(/^Card \d+: /, '').replace(', matched', '')
      known.set(name, [...(known.get(name) ?? []), index])
    }
    const back = game.getByRole('button', { name: 'Turn cards back' })
    if (await back.getAttribute('aria-disabled') === 'false') await back.click()
  }
  expect(known.size).toBe(6)
  for (const indices of known.values()) {
    expect(indices).toHaveLength(2)
    if ((await cards.nth(indices[0]).getAttribute('aria-label'))!.includes(', matched')) continue
    await cards.nth(indices[0]).click()
    await cards.nth(indices[1]).click()
  }
  await expect(game.locator('.is-matched')).toHaveCount(12)
  await expect(game.getByRole('status')).toContainText('All pairs reunited')
  expect(await collection(page)).toBe(original)
  await game.getByRole('button', { name: 'Play again' }).click()
  await expect(game.locator('.is-revealed')).toHaveCount(0)
  await expect(game.locator('.k-pairs-score')).toHaveText('0/6 pairs · 0 turns')
})

test('sticker pairs fit a narrow phone and keep keyboard focus on the card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await applyVisualSeed(page)
  await page.goto('/')
  await book(page).locator('summary').click()
  await book(page).getByRole('button', { name: 'Sticker pairs', exact: true }).click()
  const game = page.getByRole('region', { name: 'Sticker pairs game' })
  const card = game.locator('.k-pairs-card').first()
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(card).toBeFocused()
  await expect(card).toHaveClass(/is-revealed/)
  await page.keyboard.press('Enter')
  await expect(game.locator('.k-pairs-score')).toHaveText('0/6 pairs · 0 turns')
  await controlsFit(game, 320)
  expect(await card.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await game.screenshot({ path: test.info().outputPath('sticker-pairs-phone.png'), animations: 'disabled',
    style: '.bottom-nav-wrap { visibility: hidden !important; }' })
})

async function seedStickers(page: Page, complete = false) {
  const choices = complete
    ? Object.fromEntries(MOMO_ADVENTURES.map(adventure => [adventure.id, adventure.options[0].id]))
    : { color: 'bright', texture: 'crunchy' }
  await page.addInitScript(({ storageKey, choices }) => {
    if (sessionStorage.getItem('playful-seeded')) return
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, choices, pinned: 'color' }))
    sessionStorage.setItem('playful-seeded', 'yes')
  }, { storageKey: key, choices })
}

async function collection(page: Page) {
  return page.evaluate(storageKey => localStorage.getItem(storageKey), key)
}

async function controlsFit(container: Locator, width: number) {
  for (const control of await container.getByRole('button').all()) {
    if (!await control.isVisible()) continue
    const bounds = (await control.boundingBox())!
    expect(bounds.width).toBeGreaterThanOrEqual(44)
    expect(bounds.height).toBeGreaterThanOrEqual(44)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
})

test('playroom is optional, rotates local jokes and leaves discoveries and meals alone', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  const original = await collection(page)
  const meals = await page.locator('.k-meals').innerText()
  const toggle = room(page).getByRole('button', { name: 'Play with Momo', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(room(page).getByRole('button', { name: 'High-five', exact: true })).toBeHidden()
  await toggle.click()
  await expect(room(page).getByRole('status')).toHaveText(MOMO_PLAY_WELCOME)
  for (const action of MOMO_PLAY_ACTIONS) {
    for (const beat of action.beats) {
      await room(page).getByRole('button', { name: action.label, exact: true }).click()
      await expect(room(page).getByRole('status')).toHaveText(beat.line)
    }
  }
  expect(await collection(page)).toEqual(original)
  expect(await page.locator('.k-meals').innerText()).toEqual(meals)
  await room(page).getByRole('button', { name: 'Close playtime' }).click()
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(room(page).getByRole('status')).toHaveText(MOMO_PLAY_WELCOME)
  expect(await room(page).locator('.k-momo-play-actor').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('keyboard users open, play and return to the toggle', async ({ page }) => {
  await applyVisualSeed(page)
  await page.goto('/')
  const toggle = room(page).getByRole('button', { name: 'Play with Momo', exact: true })
  await toggle.focus()
  await page.keyboard.press('Enter')
  for (const action of MOMO_PLAY_ACTIONS) {
    await page.keyboard.press('Tab')
    await expect(room(page).getByRole('button', { name: action.label, exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(room(page).getByRole('status')).toHaveText(action.beats[0].line)
  }
  await page.keyboard.press('Tab')
  await expect(room(page).getByRole('button', { name: 'Close playtime' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(toggle).toBeFocused()
})

test('lively play and shelf reactions move only artwork and finish', async ({ page }) => {
  const state = visualSeedState()
  state.gamification.mascotActivity = 'lively'
  state.profile.mascotReducedMotion = false
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await applyVisualSeed(page, state)
  await seedStickers(page)
  await page.addInitScript(() => document.addEventListener('animationstart', event => {
    if ((event.target as Element).closest('.k-momo-playroom, .k-sticker-play')) {
      document.documentElement.dataset.playfulAnimations = `${document.documentElement.dataset.playfulAnimations ?? ''} ${event.animationName}`
    }
  }))
  await page.goto('/')
  await room(page).getByRole('button', { name: 'Play with Momo', exact: true }).click()
  for (const action of MOMO_PLAY_ACTIONS) {
    const button = room(page).getByRole('button', { name: action.label, exact: true })
    await button.click()
    const bounds = await button.boundingBox()
    await expect(room(page).getByRole('status')).toHaveText(action.beats[0].line)
    expect(await button.boundingBox()).toEqual(bounds)
    await expect.poll(() => room(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  }
  await expect(page.locator('html')).toHaveAttribute('data-playful-animations', /k-momo-play-five/)
  await expect(page.locator('html')).toHaveAttribute('data-playful-animations', /k-momo-play-face/)
  await expect(page.locator('html')).toHaveAttribute('data-playful-animations', /k-momo-play-dance/)
  const original = await collection(page)
  const wiggle = shelf(page).getByRole('button', { name: 'Give my sticker a wiggle' })
  await wiggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-playful-animations', /k-adventure-stamp/)
  await expect(shelf(page).locator('.k-sticker-play-line')).not.toBeEmpty()
  const line = await shelf(page).locator('.k-sticker-play-line').innerText()
  await expect.poll(() => shelf(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await wiggle.click()
  await expect(shelf(page).locator('.k-sticker-play-line')).not.toHaveText(line)
  expect(await collection(page)).toEqual(original)
  await page.reload()
  await expect(shelf(page)).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-playful-animations')
})

for (const setting of ['calm', 'profile', 'system'] as const) {
  test(`${setting} preferences keep play and sticker artwork still`, async ({ page }) => {
    const state = visualSeedState()
    state.gamification.mascotActivity = setting === 'calm' ? 'calm' : 'lively'
    state.profile.mascotReducedMotion = setting === 'profile'
    await page.emulateMedia({ reducedMotion: setting === 'system' ? 'reduce' : 'no-preference' })
    await applyVisualSeed(page, state)
    await seedStickers(page)
    await page.goto('/')
    await room(page).getByRole('button', { name: 'Play with Momo', exact: true }).click()
    for (const action of MOMO_PLAY_ACTIONS) {
      await room(page).getByRole('button', { name: action.label, exact: true }).click()
      await expect(room(page).getByRole('status')).toHaveText(action.beats[0].line)
      expect(await room(page).locator('.k-momo-play-actor').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
    }
    await shelf(page).getByRole('button', { name: 'Give my sticker a wiggle' }).click()
    expect(await shelf(page).locator('.k-sticker-play-art, .k-adventure-momo').evaluateAll(elements => elements.flatMap(element => element.getAnimations({ subtree: true })).length)).toBe(0)
  })
}

for (const setting of ['muted', 'off', 'paused'] as const) {
  test(`${setting} hides playtime while preserving the appropriate journal controls`, async ({ page }) => {
    const state = visualSeedState()
    state.gamification.mascotActivity = setting === 'off' ? 'off' : 'lively'
    state.profile.mascotMuted = setting === 'muted'
    state.profile.trackingPaused = setting === 'paused'
    await applyVisualSeed(page, state)
    await seedStickers(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play with Momo', exact: true })).toHaveCount(0)
    if (setting === 'paused') await expect(book(page)).toHaveCount(0)
    else {
      await expect(shelf(page).locator('.momo-art')).toHaveCount(0)
      await book(page).locator('summary').click()
      await expect(book(page).getByRole('button', { name: 'Pick for me', exact: true })).toBeVisible()
    }
  })
}

test('suggestions rotate uncollected adventures without awarding a sticker', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.goto('/')
  const original = await collection(page)
  await book(page).locator('summary').click()
  await book(page).getByRole('button', { name: 'Pick for me', exact: true }).click()
  const expected = MOMO_ADVENTURES.slice(2)
  const seen: string[] = []
  for (let index = 0; index < expected.length; index++) {
    const heading = book(page).getByRole('heading')
    await expect(heading).toBeFocused()
    const title = await heading.innerText()
    expect(expected.map(adventure => adventure.title)).toContain(title)
    expect(seen).not.toContain(title)
    seen.push(title)
    await expect(book(page).locator('.k-adventures-count')).toHaveText('2/6')
    expect(await collection(page)).toEqual(original)
    if (index < expected.length - 1) await book(page).getByRole('button', { name: 'Pick another', exact: true }).click()
  }
  const active = MOMO_ADVENTURES.find(adventure => adventure.title === seen.at(-1))!
  await book(page).getByRole('button', { name: active.options[0].label, exact: true }).click()
  await expect(book(page).locator('.k-adventures-count')).toHaveText('3/6')
  await expect(book(page).getByRole('heading', { name: `${active.sticker} collected!` })).toBeFocused()
})

test('a complete book still offers replay choices without duplicate stickers', async ({ page }) => {
  await applyVisualSeed(page)
  await seedStickers(page, true)
  await page.goto('/')
  const original = await collection(page)
  await book(page).locator('summary').click()
  await book(page).getByRole('button', { name: 'Pick for me', exact: true }).click()
  const title = await book(page).getByRole('heading').innerText()
  await book(page).getByRole('button', { name: 'Pick another', exact: true }).click()
  await expect(book(page).getByRole('heading')).not.toHaveText(title)
  await expect(book(page).locator('.k-adventures-count')).toHaveText('6/6')
  expect(await collection(page)).toEqual(original)
})

test('sticker play keeps keyboard focus and leaves the saved favorite intact', async ({ page }, info) => {
  await applyVisualSeed(page)
  await seedStickers(page)
  await page.setViewportSize({ width: 390, height: 900 })
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    const wiggle = shelf(page).getByRole('button', { name: 'Give my sticker a wiggle' })
    await expect(wiggle).toBeVisible()
    const original = await collection(page)
    await wiggle.focus()
    const reactions = new Set<string>()
    for (let turn = 0; turn < 3; turn++) {
      await page.keyboard.press('Enter')
      await expect(wiggle).toBeFocused()
      reactions.add(await shelf(page).locator('.k-sticker-play-line').innerText())
      expect(await collection(page)).toEqual(original)
    }
    expect(reactions.size).toBe(3)
    await shelf(page).screenshot({ path: `docs/ui-enhancements/playful-today/after-${info.project.name}-390-${colorScheme}-sticker.png`,
      animations: 'disabled', style: '.bottom-nav-wrap { visibility: hidden; }' })
  }
})

test('phone and desktop play areas fit and keep targets clear in both themes', async ({ page }, info) => {
  await applyVisualSeed(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const widths = info.project.name === 'desktop' ? [320, 390, 1440] : [page.viewportSize()!.width]
  for (const width of widths) for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/')
    const toggle = room(page).getByRole('button', { name: 'Play with Momo', exact: true })
    await expect(toggle).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const prefix = `docs/ui-enhancements/playful-today/after-${info.project.name}-${width}-${colorScheme}`
    if (info.project.name === 'desktop' && width !== 320) await page.screenshot({ path: `${prefix}-today.png`, fullPage: true, animations: 'disabled' })
    await toggle.click()
    await room(page).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const actionPosition = () => room(page).getByRole('button', { name: 'High-five', exact: true }).evaluate(element =>
      element.getBoundingClientRect().top - element.closest('.k-momo-playroom')!.getBoundingClientRect().top)
    const actionTop = await actionPosition()
    for (const action of MOMO_PLAY_ACTIONS) for (const beat of action.beats) {
      await room(page).getByRole('button', { name: action.label, exact: true }).click()
      await expect(room(page).getByRole('status')).toHaveText(beat.line)
      expect(await actionPosition()).toBe(actionTop)
    }
    await controlsFit(room(page), width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const close = room(page).getByRole('button', { name: 'Close playtime' })
    await close.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const closeBounds = (await close.boundingBox())!
    const navBounds = await page.locator('.bottom-nav').boundingBox()
    if (navBounds) expect(closeBounds.x < navBounds.x + navBounds.width && closeBounds.x + closeBounds.width > navBounds.x
      && closeBounds.y < navBounds.y + navBounds.height && closeBounds.y + closeBounds.height > navBounds.y).toBe(false)
    // Component close-ups omit fixed navigation; its clearance is checked above.
    const capture = { animations: 'disabled' as const, style: '.bottom-nav-wrap { visibility: hidden; }' }
    await room(page).screenshot({ path: `${prefix}-playroom.png`, ...capture })
    await close.click()
    await book(page).locator('summary').click()
    await controlsFit(book(page), width)
    await book(page).screenshot({ path: `${prefix}-picker.png`, ...capture })
    await book(page).getByRole('button', { name: 'Pick for me', exact: true }).click()
    await controlsFit(book(page), width)
    await book(page).screenshot({ path: `${prefix}-suggestion.png`, ...capture })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
})
