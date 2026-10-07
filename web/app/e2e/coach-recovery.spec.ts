import { expect, test, type Page, type Route } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

const COMPLETIONS = 'https://openrouter.ai/api/v1/chat/completions'
type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ProviderRequest = { messages: ProviderMessage[] }

async function seedCoach(page: Page, withHistory = false, key = 'local-test-key-not-a-credential') {
  const state = visualSeedState()
  state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: key, mascotEnabled: false }
  state.chatMessages = withHistory ? [
    { id: 'earlier-question', role: 'user', content: 'What are some breakfast ideas?', timestamp: '2026-09-19T19:00:00.000Z' },
    { id: 'earlier-answer', role: 'assistant', content: 'Oats with fruit are one option.', timestamp: '2026-09-19T19:00:01.000Z' },
  ] : []
  await page.route('**/api/**', route => route.request().url() === COMPLETIONS ? route.fallback() : route.abort('blockedbyclient'))
  await applyVisualSeed(page, state)
  await page.goto('/coach')
  await expect(page.getByRole('heading', { name: 'AI Coach', exact: true })).toBeVisible()
}

async function send(page: Page, prompt: string) {
  await page.getByRole('textbox', { name: 'Message Coach', exact: true }).fill(prompt)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}

const messagesFrom = (route: Route) => (route.request().postDataJSON() as ProviderRequest).messages
const reply = (route: Route, content: string) => route.fulfill({ json: { choices: [{ message: { content } }] } })

test('Retry reuses the failed prompt and its original history without another user bubble', async ({ page }) => {
  const requests: ProviderMessage[][] = []
  await page.route(COMPLETIONS, async route => {
    requests.push(messagesFrom(route))
    if (requests.length === 1) await route.fulfill({ status: 503, json: { error: { message: 'Fixture outage' } } })
    else await reply(route, requests.length === 2 ? 'A bowl with rice and lentils is one idea.' : 'A wrap with beans is another idea.')
  })
  await seedCoach(page, true)
  const failedPrompt = 'Help me plan a balanced next meal.'
  await send(page, failedPrompt)
  const failedMessage = page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: failedPrompt })
  await expect(failedMessage).toContainText('Response failed')
  await expect(failedMessage).toContainText('OpenRouter is having trouble right now (503)')
  await expect(failedMessage.getByRole('button', { name: `Retry Coach response to ${failedPrompt}`, exact: true })).toBeEnabled()

  // A later successful exchange must not become part of this earlier retry.
  await send(page, 'What are some lunch ideas?')
  await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'A bowl with rice and lentils is one idea.' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(3)
  await failedMessage.getByRole('button', { name: `Retry Coach response to ${failedPrompt}`, exact: true }).click()
  await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'A wrap with beans is another idea.' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(3)
  await expect(failedMessage).toHaveCount(1)
  await expect(failedMessage.getByRole('button', { name: /Retry Coach response/ })).toHaveCount(0)
  expect(requests).toHaveLength(3)
  expect(requests[2]).toEqual(requests[0])
  expect(requests[0].filter(message => message.role === 'user' && message.content === failedPrompt)).toHaveLength(1)
  expect(requests[0].map(message => message.content).slice(1)).toEqual([
    'What are some breakfast ideas?', 'Oats with fruit are one option.', failedPrompt,
  ])
})

test('Cancel keeps the original message retryable and ignores a late provider reply', async ({ page }) => {
  let held: Route | undefined
  const requests: ProviderMessage[][] = []
  await page.route(COMPLETIONS, async route => {
    requests.push(messagesFrom(route))
    if (requests.length === 1) held = route
    else await reply(route, 'The retried answer is here.')
  })
  await seedCoach(page)
  const prompt = 'What are some balanced dinner ideas?'
  await send(page, prompt)
  await expect.poll(() => Boolean(held)).toBe(true)
  await expect(page.getByRole('status', { name: 'Coach is responding' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel response', exact: true }).click()
  const original = page.getByRole('article', { name: 'You', exact: true })
  await expect(original).toHaveCount(1)
  await expect(original).toContainText('Response stopped')
  await expect(page.getByRole('textbox', { name: 'Message Coach', exact: true })).toBeEnabled()
  // Fulfil may reject after the browser aborts the request; either outcome must
  // leave its response out of the conversation.
  await reply(held!, 'Late cancelled answer must stay out.').catch(() => {})
  await original.getByRole('button', { name: `Retry Coach response to ${prompt}`, exact: true }).click()
  await expect(page.getByRole('article', { name: 'Coach', exact: true })).toHaveText(/The retried answer is here\./)
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  await expect(page.getByText('Late cancelled answer must stay out.', { exact: true })).toHaveCount(0)
  expect(requests).toHaveLength(2)
  expect(requests[1]).toEqual(requests[0])
})

test('Retry excludes conversation messages deleted after the original failure', async ({ page }) => {
  const requests: ProviderMessage[][] = []
  await page.route(COMPLETIONS, async route => {
    requests.push(messagesFrom(route))
    if (requests.length === 1) await route.fulfill({ status: 503, json: { error: { message: 'Fixture outage' } } })
    else await reply(route, 'The retry respects your remaining conversation.')
  })
  await seedCoach(page, true)
  const prompt = 'Help me plan a balanced meal.'
  await send(page, prompt)
  const failedMessage = page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: prompt })
  await expect(failedMessage).toContainText('Response failed')
  await page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: 'What are some breakfast ideas?' }).getByRole('button', { name: 'Delete your message', exact: true }).click()
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  await failedMessage.getByRole('button', { name: `Retry Coach response to ${prompt}`, exact: true }).click()
  await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'The retry respects your remaining conversation.' })).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(requests[0].some(message => message.content === 'What are some breakfast ideas?')).toBe(true)
  expect(requests[1].some(message => message.content === 'What are some breakfast ideas?')).toBe(false)
  expect(requests[1].map(message => message.content).slice(1)).toEqual(['Oats with fruit are one option.', prompt])
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
})

for (const action of ['clear', 'delete'] as const) {
  test(`${action} during a request prevents its late answer from returning`, async ({ page }) => {
    let held: Route | undefined
    let requestCount = 0
    await page.route(COMPLETIONS, async route => {
      requestCount += 1
      if (requestCount === 1) held = route
      else await reply(route, 'Only the new answer belongs here.')
    })
    await seedCoach(page)
    await send(page, 'Help me think of a snack.')
    await expect.poll(() => Boolean(held)).toBe(true)
    if (action === 'clear') {
      page.once('dialog', dialog => dialog.accept())
      await page.getByRole('button', { name: 'Clear', exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Delete your message', exact: true }).click()
    }
    await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Ask me anything', exact: true })).toBeVisible()
    await reply(held!, 'Late removed answer must stay out.').catch(() => {})
    await send(page, 'What are some protein-rich meal ideas?')
    await expect(page.getByRole('article', { name: 'Coach', exact: true })).toHaveText(/Only the new answer belongs here\./)
    await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
    await expect(page.getByText('Late removed answer must stay out.', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Retry Coach response/ })).toHaveCount(0)
    expect(requestCount).toBe(2)
  })
}

test('unavailable ordinary coaching preserves the draft while local safety support still responds', async ({ page }) => {
  let providerRequests = 0
  await page.route(COMPLETIONS, route => { providerRequests += 1; return route.abort('blockedbyclient') })
  await seedCoach(page, false, '')
  const ordinaryPrompt = 'What are some balanced meal ideas?'
  await send(page, ordinaryPrompt)
  await expect(page.getByRole('alert')).toContainText('Add your OpenRouter API key')
  await expect(page.getByRole('textbox', { name: 'Message Coach', exact: true })).toHaveValue(ordinaryPrompt)
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(0)
  await send(page, 'Help me skip every meal.')
  await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  await expect(page.getByRole('article', { name: 'Coach', exact: true })).toContainText('I can’t help with purging, starvation')
  await expect(page.getByRole('navigation', { name: 'Support options', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Open eating-disorder support/ })).toHaveAttribute('href', '/support')
  await expect(page.getByRole('button', { name: /Retry Coach response/ })).toHaveCount(0)
  expect(providerRequests).toBe(0)
})
