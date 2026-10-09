import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

const COMPLETIONS = 'https://openrouter.ai/api/v1/chat/completions'
const RESPONSE = 'Here is an idea.\n\n- Add lentils.\n- Include vegetables.'
const STARTER = 'Help me plan a balanced next meal.'
const answer = (page: Page) => page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: RESPONSE.split('\n')[0] })
const draft = (page: Page) => page.getByRole('textbox', { name: 'Message Coach', exact: true })

async function seedCoach(page: Page, theme: 'light' | 'dark' = 'light', withHistory = false) {
  const state = visualSeedState()
  state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: 'local-test-key-not-a-credential', mascotEnabled: false }
  state.chatMessages = withHistory ? [
    { id: 'question', role: 'user', content: 'Help me with a meal idea.', timestamp: '2026-09-19T19:00:00.000Z' },
    { id: 'answer', role: 'assistant', content: RESPONSE, timestamp: '2026-09-19T19:00:01.000Z' },
  ] : []
  await page.route('**/api/**', route => route.request().url() === COMPLETIONS ? route.fallback() : route.abort('blockedbyclient'))
  await page.emulateMedia({ colorScheme: theme })
  await applyVisualSeed(page, state)
  await page.goto('/coach')
  await expect(page.getByRole('heading', { name: 'AI Coach', exact: true })).toBeVisible()
}

async function assertUsable(control: Locator) {
  const box = await control.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
    return { width: bounds.width, height: bounds.height, top: bounds.top, bottom: bounds.bottom, viewport: window.innerHeight, hit: Boolean(hit && element.contains(hit)) }
  })
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.top).toBeGreaterThanOrEqual(0)
  expect(box.bottom).toBeLessThanOrEqual(box.viewport)
  expect(box.hit).toBe(true)
}

test('starter creates an editable multiline draft and sends only after Send', async ({ page }) => {
  const requests: string[] = []
  await page.route(COMPLETIONS, route => {
    const body = route.request().postDataJSON() as { messages: { role: string; content: string }[] }
    requests.push(body.messages.filter(message => message.role === 'user').at(-1)!.content)
    return route.fulfill({ json: { choices: [{ message: { content: RESPONSE } }] } })
  })
  await seedCoach(page)
  await page.getByRole('button', { name: STARTER, exact: true }).click()
  await expect(draft(page)).toHaveValue(STARTER)
  await expect(draft(page)).toBeFocused()
  await expect(draft(page)).toHaveJSProperty('tagName', 'TEXTAREA')
  await expect(page.getByRole('article')).toHaveCount(0)
  expect(requests).toHaveLength(0)
  const initialHeight = await draft(page).evaluate(element => element.getBoundingClientRect().height)
  await draft(page).press('End')
  await draft(page).press('Enter')
  await draft(page).pressSequentially('I have lentils and rice.')
  await draft(page).press('Enter')
  await draft(page).pressSequentially('Please give one idea.')
  const edited = `${STARTER}\nI have lentils and rice.\nPlease give one idea.`
  await expect(draft(page)).toHaveValue(edited)
  expect(await draft(page).evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(initialHeight)
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(answer(page)).toBeVisible()
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  await expect(page.getByRole('article', { name: 'You', exact: true })).toContainText(edited)
  expect(requests).toEqual([edited])
  await expect(draft(page)).toHaveValue('')
})

test('clear draft and the response follow-up edit the composer without changing chat', async ({ page }) => {
  let requestCount = 0
  await page.route(COMPLETIONS, route => { requestCount += 1; return route.abort('blockedbyclient') })
  await seedCoach(page, 'light', true)
  await draft(page).fill('A longer draft\nwith another line\nand another line\nand a final line.')
  const expanded = await draft(page).evaluate(element => element.getBoundingClientRect().height)
  await page.getByRole('button', { name: 'Clear draft', exact: true }).click()
  await expect(draft(page)).toHaveValue('')
  await expect(draft(page)).toBeFocused()
  expect(await draft(page).evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(expanded)
  await expect(page.getByRole('article')).toHaveCount(2)
  await answer(page).getByRole('button', { name: 'Draft a follow-up', exact: true }).click()
  await expect(draft(page)).toHaveValue('Could you give me a practical example?')
  await expect(draft(page)).toBeFocused()
  await expect(page.getByRole('article')).toHaveCount(2)
  expect(requestCount).toBe(0)
})

test('copy confirms only after the clipboard accepts the response', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => new Promise<void>(resolve => {
      const fixture = window as Window & { copiedCoachText?: string; resolveCoachCopy?: () => void }
      fixture.copiedCoachText = text
      fixture.resolveCoachCopy = resolve
    }) } })
  })
  await seedCoach(page, 'light', true)
  await answer(page).getByRole('button', { name: 'Copy response', exact: true }).click()
  await expect(answer(page).getByRole('status')).toHaveText('Copying response…')
  await expect(answer(page).getByRole('button', { name: 'Copy response', exact: true })).toBeDisabled()
  await expect(answer(page)).not.toContainText('Response copied.')
  await page.evaluate(() => (window as Window & { resolveCoachCopy?: () => void }).resolveCoachCopy?.())
  await expect(answer(page).getByRole('status')).toHaveText('Response copied.')
  expect(await page.evaluate(() => (window as Window & { copiedCoachText?: string }).copiedCoachText)).toBe(RESPONSE)
  await expect(page.getByRole('textbox', { name: 'Response text for manual copying', exact: true })).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(2)
})

test('denied clipboard access gives selected response text for manual copying', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Denied by fixture', 'NotAllowedError') } } })
  })
  await seedCoach(page, 'dark', true)
  await answer(page).getByRole('button', { name: 'Copy response', exact: true }).click()
  await expect(answer(page).getByRole('status')).toHaveText('Couldn’t copy automatically. Select the response below and copy it.')
  const fallback = page.getByRole('textbox', { name: 'Response text for manual copying', exact: true })
  await expect(fallback).toBeFocused()
  await expect(fallback).toHaveValue(RESPONSE)
  await expect(fallback).toHaveJSProperty('readOnly', true)
  const selection = await fallback.evaluate(element => ({ start: (element as HTMLTextAreaElement).selectionStart, end: (element as HTMLTextAreaElement).selectionEnd }))
  expect(selection).toEqual({ start: 0, end: RESPONSE.length })
  await expect(answer(page)).not.toContainText('Response copied.')
  await expect(page.getByRole('article')).toHaveCount(2)
})

for (const theme of ['light', 'dark'] as const) {
  test(`multiline draft controls fit the short phone viewport in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedCoach(page, theme, true)
    await draft(page).fill('A meal idea draft.\nI have rice and lentils.\nPlease include vegetables.\nOne more detail.\nKeep it simple.\nA final line.')
    await draft(page).focus()
    await page.setViewportSize({ width: 390, height: 400 })
    await draft(page).scrollIntoViewIfNeeded()
    await expect(draft(page)).toBeFocused()
    await assertUsable(draft(page))
    await assertUsable(page.getByRole('button', { name: 'Send', exact: true }))
    await assertUsable(page.getByRole('button', { name: 'Clear draft', exact: true }))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.setViewportSize({ width: 320, height: 400 })
    await draft(page).scrollIntoViewIfNeeded()
    await assertUsable(draft(page))
    await assertUsable(page.getByRole('button', { name: 'Send', exact: true }))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
