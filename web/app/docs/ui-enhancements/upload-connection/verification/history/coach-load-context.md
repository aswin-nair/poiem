# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coach-recovery.spec.ts >> Retry reuses the failed prompt and its original history without another user bubble
- Location: e2e\coach-recovery.spec.ts:31:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'AI Coach', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'AI Coach', exact: true })

```

```yaml
- main:
  - status: Opening…
```

# Test source

```ts
  1   | import { expect, test, type Page, type Route } from '@playwright/test'
  2   | import { applyVisualSeed, visualSeedState } from './seed'
  3   | 
  4   | test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })
  5   | 
  6   | const COMPLETIONS = 'https://openrouter.ai/api/v1/chat/completions'
  7   | type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string }
  8   | type ProviderRequest = { messages: ProviderMessage[] }
  9   | 
  10  | async function seedCoach(page: Page, withHistory = false, key = 'local-test-key-not-a-credential') {
  11  |   const state = visualSeedState()
  12  |   state.aiSettings = { ...state.aiSettings, accessMode: 'byok', apiKey: key, mascotEnabled: false }
  13  |   state.chatMessages = withHistory ? [
  14  |     { id: 'earlier-question', role: 'user', content: 'What are some breakfast ideas?', timestamp: '2026-09-19T19:00:00.000Z' },
  15  |     { id: 'earlier-answer', role: 'assistant', content: 'Oats with fruit are one option.', timestamp: '2026-09-19T19:00:01.000Z' },
  16  |   ] : []
  17  |   await page.route('**/api/**', route => route.request().url() === COMPLETIONS ? route.fallback() : route.abort('blockedbyclient'))
  18  |   await applyVisualSeed(page, state)
  19  |   await page.goto('/coach')
> 20  |   await expect(page.getByRole('heading', { name: 'AI Coach', exact: true })).toBeVisible()
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  21  | }
  22  | 
  23  | async function send(page: Page, prompt: string) {
  24  |   await page.getByRole('textbox', { name: 'Message Coach', exact: true }).fill(prompt)
  25  |   await page.getByRole('button', { name: 'Send', exact: true }).click()
  26  | }
  27  | 
  28  | const messagesFrom = (route: Route) => (route.request().postDataJSON() as ProviderRequest).messages
  29  | const reply = (route: Route, content: string) => route.fulfill({ json: { choices: [{ message: { content } }] } })
  30  | 
  31  | test('Retry reuses the failed prompt and its original history without another user bubble', async ({ page }) => {
  32  |   const requests: ProviderMessage[][] = []
  33  |   await page.route(COMPLETIONS, async route => {
  34  |     requests.push(messagesFrom(route))
  35  |     if (requests.length === 1) await route.fulfill({ status: 503, json: { error: { message: 'Fixture outage' } } })
  36  |     else await reply(route, requests.length === 2 ? 'A bowl with rice and lentils is one idea.' : 'A wrap with beans is another idea.')
  37  |   })
  38  |   await seedCoach(page, true)
  39  |   const failedPrompt = 'Help me plan a balanced next meal.'
  40  |   await send(page, failedPrompt)
  41  |   const failedMessage = page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: failedPrompt })
  42  |   await expect(failedMessage).toContainText('Response failed')
  43  |   await expect(failedMessage).toContainText('OpenRouter is having trouble right now (503)')
  44  |   await expect(failedMessage.getByRole('button', { name: `Retry Coach response to ${failedPrompt}`, exact: true })).toBeEnabled()
  45  | 
  46  |   // A later successful exchange must not become part of this earlier retry.
  47  |   await send(page, 'What are some lunch ideas?')
  48  |   await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'A bowl with rice and lentils is one idea.' })).toBeVisible()
  49  |   await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(3)
  50  |   await failedMessage.getByRole('button', { name: `Retry Coach response to ${failedPrompt}`, exact: true }).click()
  51  |   await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'A wrap with beans is another idea.' })).toBeVisible()
  52  |   await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(3)
  53  |   await expect(failedMessage).toHaveCount(1)
  54  |   await expect(failedMessage.getByRole('button', { name: /Retry Coach response/ })).toHaveCount(0)
  55  |   expect(requests).toHaveLength(3)
  56  |   expect(requests[2]).toEqual(requests[0])
  57  |   expect(requests[0].filter(message => message.role === 'user' && message.content === failedPrompt)).toHaveLength(1)
  58  |   expect(requests[0].map(message => message.content).slice(1)).toEqual([
  59  |     'What are some breakfast ideas?', 'Oats with fruit are one option.', failedPrompt,
  60  |   ])
  61  | })
  62  | 
  63  | test('Cancel keeps the original message retryable and ignores a late provider reply', async ({ page }) => {
  64  |   let held: Route | undefined
  65  |   const requests: ProviderMessage[][] = []
  66  |   await page.route(COMPLETIONS, async route => {
  67  |     requests.push(messagesFrom(route))
  68  |     if (requests.length === 1) held = route
  69  |     else await reply(route, 'The retried answer is here.')
  70  |   })
  71  |   await seedCoach(page)
  72  |   const prompt = 'What are some balanced dinner ideas?'
  73  |   await send(page, prompt)
  74  |   await expect.poll(() => Boolean(held)).toBe(true)
  75  |   await expect(page.getByRole('status', { name: 'Coach is responding' })).toBeVisible()
  76  |   await page.getByRole('button', { name: 'Cancel response', exact: true }).click()
  77  |   const original = page.getByRole('article', { name: 'You', exact: true })
  78  |   await expect(original).toHaveCount(1)
  79  |   await expect(original).toContainText('Response stopped')
  80  |   await expect(page.getByRole('textbox', { name: 'Message Coach', exact: true })).toBeEnabled()
  81  |   // Fulfil may reject after the browser aborts the request; either outcome must
  82  |   // leave its response out of the conversation.
  83  |   await reply(held!, 'Late cancelled answer must stay out.').catch(() => {})
  84  |   await original.getByRole('button', { name: `Retry Coach response to ${prompt}`, exact: true }).click()
  85  |   await expect(page.getByRole('article', { name: 'Coach', exact: true })).toHaveText(/The retried answer is here\./)
  86  |   await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  87  |   await expect(page.getByText('Late cancelled answer must stay out.', { exact: true })).toHaveCount(0)
  88  |   expect(requests).toHaveLength(2)
  89  |   expect(requests[1]).toEqual(requests[0])
  90  | })
  91  | 
  92  | test('Retry excludes conversation messages deleted after the original failure', async ({ page }) => {
  93  |   const requests: ProviderMessage[][] = []
  94  |   await page.route(COMPLETIONS, async route => {
  95  |     requests.push(messagesFrom(route))
  96  |     if (requests.length === 1) await route.fulfill({ status: 503, json: { error: { message: 'Fixture outage' } } })
  97  |     else await reply(route, 'The retry respects your remaining conversation.')
  98  |   })
  99  |   await seedCoach(page, true)
  100 |   const prompt = 'Help me plan a balanced meal.'
  101 |   await send(page, prompt)
  102 |   const failedMessage = page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: prompt })
  103 |   await expect(failedMessage).toContainText('Response failed')
  104 |   await page.getByRole('article', { name: 'You', exact: true }).filter({ hasText: 'What are some breakfast ideas?' }).getByRole('button', { name: 'Delete your message', exact: true }).click()
  105 |   await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  106 |   await failedMessage.getByRole('button', { name: `Retry Coach response to ${prompt}`, exact: true }).click()
  107 |   await expect(page.getByRole('article', { name: 'Coach', exact: true }).filter({ hasText: 'The retry respects your remaining conversation.' })).toBeVisible()
  108 |   expect(requests).toHaveLength(2)
  109 |   expect(requests[0].some(message => message.content === 'What are some breakfast ideas?')).toBe(true)
  110 |   expect(requests[1].some(message => message.content === 'What are some breakfast ideas?')).toBe(false)
  111 |   expect(requests[1].map(message => message.content).slice(1)).toEqual(['Oats with fruit are one option.', prompt])
  112 |   await expect(page.getByRole('article', { name: 'You', exact: true })).toHaveCount(1)
  113 | })
  114 | 
  115 | for (const action of ['clear', 'delete'] as const) {
  116 |   test(`${action} during a request prevents its late answer from returning`, async ({ page }) => {
  117 |     let held: Route | undefined
  118 |     let requestCount = 0
  119 |     await page.route(COMPLETIONS, async route => {
  120 |       requestCount += 1
```