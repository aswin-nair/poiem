import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ reducedMotion: 'reduce' })
test.describe.configure({ timeout: 120_000 })

type Viewport = { width: number; height: number }
const VIEWPORT_GROUPS: readonly { name: string; viewports: readonly Viewport[] }[] = [
  { name: 'narrow phones', viewports: [{ width: 320, height: 844 }, { width: 360, height: 844 }] },
  { name: 'wide phones and landscape', viewports: [{ width: 390, height: 844 }, { width: 430, height: 844 }, { width: 844, height: 390 }] },
]
const THEMES = ['light', 'dark'] as const
const CATEGORIES = [
  { value: 'profile', label: 'Profile & goals', heading: 'Profile & goals' },
  { value: 'preferences', label: 'Preferences', heading: 'Everyday preferences' },
  { value: 'momo', label: 'Momo', heading: 'Your kitchen companion' },
  { value: 'ai', label: 'AI setup', heading: 'AI setup' },
  { value: 'account', label: 'Account', heading: 'Account & security' },
  { value: 'data', label: 'Your data', heading: 'Your data' },
] as const

async function seedWithoutBackend(page: Page, theme: 'light' | 'dark', withChat = false) {
  const state = visualSeedState()
  if (withChat) state.chatMessages = [
    { id: 'mobile-question', role: 'user', content: 'What are some breakfast ideas?', timestamp: '2026-09-19T19:00:00.000Z' },
    { id: 'mobile-answer', role: 'assistant', content: 'Oats with fruit are one option.', timestamp: '2026-09-19T19:00:01.000Z' },
  ]
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.emulateMedia({ colorScheme: theme })
  await applyVisualSeed(page, state)
}

async function assertFits(page: Page, label: string) {
  await page.evaluate(async () => { await document.fonts.ready })
  const dimensions = await page.evaluate(() => ({
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    viewport: window.innerWidth,
  }))
  expect(dimensions.content, `${label}: horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function assertThumbTarget(control: Locator, label: string) {
  await expect(control, label).toBeVisible()
  const box = await control.boundingBox()
  expect(box, `${label}: rendered target`).not.toBeNull()
  expect(box!.width, `${label}: target width`).toBeGreaterThanOrEqual(44)
  expect(box!.height, `${label}: target height`).toBeGreaterThanOrEqual(44)
}

async function open(page: Page, path: string, ready: Locator, label: string) {
  await page.goto(path)
  await expect(ready).toBeVisible()
  await assertFits(page, label)
}

async function walkRoutes(page: Page, viewport: Viewport, theme: 'light' | 'dark') {
  await page.setViewportSize(viewport)
  const label = `${viewport.width}×${viewport.height} ${theme}`
  await open(page, '/', page.getByRole('heading', { name: 'Today', exact: true }), `Today ${label}`)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  const meals = page.getByRole('region', { name: 'Meals', exact: true })
  const water = page.getByRole('region', { name: 'Water and notes', exact: true })
  const mealsBox = await meals.boundingBox()
  const waterBox = await water.boundingBox()
  expect(mealsBox).not.toBeNull()
  expect(waterBox).not.toBeNull()
  expect(mealsBox!.y + mealsBox!.height, `Meals precede Water ${label}`).toBeLessThanOrEqual(waterBox!.y)
  await assertThumbTarget(page.getByTestId('fab'), `Log opener ${label}`)
  await assertThumbTarget(water.getByRole('button', { name: 'Add a glass of water', exact: true }), `Water ${label}`)

  await page.getByRole('button', { name: 'Add snack', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
  await expect(sheet).toBeVisible()
  await expect(sheet.locator('.k-log-meal')).toHaveText('Snack')
  await assertFits(page, `Log sheet ${label}`)
  await assertThumbTarget(sheet.getByRole('link', { name: /Manual entry/i }), `Manual entry ${label}`)
  const recent = sheet.getByRole('article', { name: 'Overnight oats', exact: true })
  await assertThumbTarget(recent.getByRole('button', { name: /Log Overnight oats, 1 times your previous meal to Snack/ }), `Repeat Log ${label}`)
  await recent.getByRole('button', { name: /Adjust portion for Overnight oats/ }).click()
  await assertThumbTarget(recent.getByRole('button', { name: 'Increase portion for Overnight oats', exact: true }), `Repeat portion ${label}`)
  await assertFits(page, `Expanded repeat portion ${label}`)

  await open(page, '/log/text', page.getByLabel('Your meal, your words'), `Describe ${label}`)
  await expect(page.locator('.flow-setup')).toHaveAttribute('data-ai-reason', 'disabled')
  await assertThumbTarget(page.getByRole('link', { name: 'Log manually', exact: true }), `Describe recovery ${label}`)

  await open(page, '/log/photo', page.getByRole('heading', { name: 'Give your meal a close-up.', exact: true }), `Photo ${label}`)
  await expect(page.locator('.flow-setup')).toHaveAttribute('data-ai-reason', 'disabled')
  await assertThumbTarget(page.getByRole('link', { name: 'Log manually', exact: true }), `Photo recovery ${label}`)

  await open(page, '/log/manual', page.getByLabel('Food name'), `Manual ${label}`)
  await assertThumbTarget(page.getByRole('button', { name: 'Log meal', exact: true }), `Manual Log ${label}`)

  await open(page, '/discover', page.getByRole('heading', { name: 'Saved', exact: true }), `Saved ${label}`)
  const saved = page.getByRole('article', { name: 'Overnight oats', exact: true })
  await expect(saved).toContainText('1× = your saved meal')
  await assertThumbTarget(saved.getByRole('button', { name: /Log Overnight oats, 1 times your saved meal/ }), `Saved Log ${label}`)

  await open(page, '/progress', page.getByRole('heading', { name: 'Insights', exact: true }), `Insights ${label}`)
  await assertThumbTarget(page.getByRole('button', { name: '+ Log weight', exact: true }), `Log weight ${label}`)
  await expect(page.getByText('A trend appears after two weigh-ins in this range.', { exact: true })).toBeVisible()

  await open(page, '/settings', page.getByRole('heading', { name: 'You', exact: true }), `You overview ${label}`)
  const category = page.getByRole('combobox', { name: 'Category', exact: true })
  if (viewport.width < 768) {
    await expect(category).toHaveJSProperty('tagName', 'SELECT')
    await assertThumbTarget(category, `Native Category ${label}`)
    await expect(page.getByRole('navigation', { name: 'You page sections', exact: true })).toBeHidden()
  } else {
    await expect(category).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'You page sections', exact: true })).toBeVisible()
  }
  for (const destination of CATEGORIES) {
    if (viewport.width < 768) await category.selectOption(destination.value)
    else await page.getByRole('navigation', { name: 'You page sections', exact: true }).getByRole('link', { name: destination.label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/settings\\?panel=${destination.value}$`))
    await expect(page.getByRole('heading', { name: destination.heading, exact: true })).toBeVisible()
    await assertFits(page, `You ${destination.label} ${label}`)
  }

  await open(page, '/coach', page.getByRole('heading', { name: 'AI Coach', exact: true }), `Coach ${label}`)
  const composer = page.getByRole('textbox', { name: 'Message Coach', exact: true })
  await composer.fill('What are some balanced meal ideas?')
  await assertThumbTarget(page.getByRole('button', { name: 'Send', exact: true }), `Coach Send ${label}`)
  await assertFits(page, `Coach draft ${label}`)
}

for (const theme of THEMES) {
  for (const group of VIEWPORT_GROUPS) {
    test(`${group.name}: core routes and all You categories fit in ${theme}`, async ({ page }) => {
      await seedWithoutBackend(page, theme)
      for (const viewport of group.viewports) await walkRoutes(page, viewport, theme)
    })
  }

  test(`focused Manual and Coach inputs remain usable at keyboard height in ${theme}`, async ({ page }) => {
    await seedWithoutBackend(page, theme, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/log/manual')
    for (const field of [page.getByLabel('Food name'), page.getByLabel('Calories per serving')]) {
      await page.setViewportSize({ width: 390, height: 844 })
      await field.focus()
      // Software keyboards are native UI; emulate their reduced browser area.
      await page.setViewportSize({ width: 390, height: 400 })
      await field.scrollIntoViewIfNeeded()
      await expect(field).toBeFocused()
      await assertUnobscuredInViewport(field)
      await assertFits(page, `Focused Manual ${theme}`)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/coach')
    const composer = page.getByRole('textbox', { name: 'Message Coach', exact: true })
    await composer.fill('My meal ideas draft stays editable.')
    await composer.focus()
    await page.setViewportSize({ width: 390, height: 400 })
    await composer.scrollIntoViewIfNeeded()
    await expect(composer).toBeFocused()
    await expect(composer).toHaveValue('My meal ideas draft stays editable.')
    await assertUnobscuredInViewport(composer)
    await assertUnobscuredInViewport(page.getByRole('button', { name: 'Send', exact: true }))
    await assertFits(page, `Focused Coach ${theme}`)
  })
}

async function assertUnobscuredInViewport(control: Locator) {
  const geometry = await control.evaluate(element => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return {
      top: box.top, bottom: box.bottom, left: box.left, right: box.right,
      viewportHeight: window.innerHeight, viewportWidth: window.innerWidth,
      unobscured: hit === element || element.contains(hit),
    }
  })
  // Browser scrolling rounds fractional CSS coordinates to device pixels.
  expect(geometry.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.left).toBeGreaterThanOrEqual(-1)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
  expect(geometry.unobscured, 'focused control is not covered by navigation').toBe(true)
}
