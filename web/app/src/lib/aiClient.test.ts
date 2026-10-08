import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AISettings } from './aiConfig'
import { completeChat, completeVision } from './aiClient'

const settings: AISettings = {
  provider: 'openrouter',
  apiKey: 'test-device-only-key',
  model: 'test-model',
}

function abortableFetch() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
}

describe('AI request boundaries', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lets a caller cancel analysis without losing the draft-facing message', async () => {
    vi.stubGlobal('fetch', abortableFetch())
    const controller = new AbortController()
    const request = completeChat(settings, [{ role: 'user', content: 'meal' }], 100, undefined, {
      signal: controller.signal,
    })

    controller.abort()

    await expect(request).rejects.toThrow('Analysis cancelled. Your draft is still here.')
  })

  it('bounds a stalled provider request with a useful timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', abortableFetch())
    const request = completeChat(settings, [{ role: 'user', content: 'meal' }], 100, undefined, {
      timeoutMs: 50,
    })
    const rejection = expect(request).rejects.toThrow('Analysis took too long')

    await vi.advanceTimersByTimeAsync(51)

    await rejection
  })

  it('does not copy a provider response body into a user-visible error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-provider-detail', { status: 400 })))

    const error: Error = await completeChat(settings, [{ role: 'user', content: 'meal' }]).then(
      () => new Error('Request unexpectedly succeeded.'),
      value => value instanceof Error ? value : new Error(String(value)),
    )

    expect(error.message).toBe('OpenRouter could not complete the request (400).')
    expect(error.message).not.toContain('private-provider-detail')
  })

  it('tells a rejected key apart from an empty balance and a rate limit', async () => {
    const messageFor = async (status: number) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
      return completeChat(settings, [{ role: 'user', content: 'meal' }]).then(
        () => '',
        (value: unknown) => value instanceof Error ? value.message : String(value),
      )
    }

    expect(await messageFor(401)).toBe('OpenRouter rejected your API key. Check it in You → AI settings.')
    expect(await messageFor(402)).toContain('out of credits')
    expect(await messageFor(429)).toContain('rate-limiting')
    expect(await messageFor(503)).toContain('having trouble right now')
  })

  it('blames a retired model, not the key, for a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))

    await expect(completeChat(settings, [{ role: 'user', content: 'meal' }]))
      .rejects.toThrow('OpenRouter has no such model any more. Pick a different model in You → AI settings.')
  })

  it('posts managed work in the envelope the API validates', async () => {
    // The API reads body.payload.messages. A flat { task, messages } body parses as valid
    // JSON and fails only at the server, so the nesting has to be pinned here.
    vi.stubGlobal('localStorage', {
      length: 0, clear: () => {}, getItem: () => null, key: () => null,
      removeItem: () => {}, setItem: () => {},
    } as Storage)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '{"name":"Oats"}' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const managed: AISettings = { ...settings, accessMode: 'managed', apiKey: '' }

    await completeChat(managed, [{ role: 'user', content: 'oats' }], 100, undefined, { task: 'food_text' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/ai?action=analyze')
    expect(JSON.parse(String(init.body))).toEqual({
      task: 'food_text',
      payload: { messages: [{ role: 'user', content: 'oats' }] },
    })
  })

  it('never sends a managed request to the provider directly', async () => {
    vi.stubGlobal('localStorage', {
      length: 0, clear: () => {}, getItem: () => null, key: () => null,
      removeItem: () => {}, setItem: () => {},
    } as Storage)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '{"name":"Oats"}' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const managed: AISettings = { ...settings, accessMode: 'managed', apiKey: '' }

    await completeChat(managed, [{ role: 'user', content: 'oats' }], 100, undefined, { task: 'food_text' })

    for (const [url] of fetchMock.mock.calls as [string][]) {
      expect(url).not.toContain('openrouter.ai')
      expect(url).not.toContain('generativelanguage.googleapis.com')
    }
  })

  it('reads a rejected Gemini key out of its ambiguous 400', async () => {
    const gemini: AISettings = { ...settings, provider: 'gemini', model: 'gemini-2.0-flash' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}',
      { status: 400 },
    )))

    await expect(completeChat(gemini, [{ role: 'user', content: 'meal' }]))
      .rejects.toThrow('Gemini rejected your API key. Check it in You → AI settings.')
  })

  it('sends a custom compatible request only to the configured service', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'Oats' } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const custom: AISettings = { ...settings, provider: 'custom', accessMode: 'byok', apiFormat: 'openai', endpointUrl: 'https://my-service.example/v1/chat/completions', authType: 'api-key', authHeader: 'X-Workspace-Key' }
    expect(await completeChat(custom, [{ role: 'user', content: 'meal' }])).toBe('Oats')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(custom.endpointUrl)
    expect(url).not.toContain(custom.apiKey)
    expect(init.credentials).toBe('omit')
    expect(init.redirect).toBe('error')
    expect(init.referrerPolicy).toBe('no-referrer')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Workspace-Key': custom.apiKey })
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'test-model', messages: [{ role: 'user', content: 'meal' }] })
  })

  it('omits every credential for an explicitly keyless service', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'local answer' } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const custom: AISettings = { ...settings, provider: 'custom', accessMode: 'byok', apiKey: '', endpointUrl: 'http://127.0.0.1:11434/v1/chat/completions', authType: 'none' }
    expect(await completeChat(custom, [{ role: 'user', content: 'meal' }])).toBe('local answer')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it.each(['gemini', 'anthropic'] as const)('adapts a photo and system prompt for native %s APIs', async apiFormat => {
    const response = apiFormat === 'gemini'
      ? { candidates: [{ content: { parts: [{ thought: true, text: 'private reasoning' }, { text: 'Oats' }, { text: 'and milk' }] } }] }
      : { content: [{ type: 'thinking', thinking: 'private reasoning' }, { type: 'text', text: 'Oats' }, { type: 'text', text: 'and milk' }] }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetchMock)
    const custom: AISettings = { ...settings, provider: 'custom', accessMode: 'byok', apiFormat, endpointUrl: apiFormat === 'gemini' ? 'https://gateway.example/models/{model}:generateContent' : 'https://gateway.example/v1/messages' }
    expect(await completeVision(custom, 'Read this meal', 'aGVsbG8=', 'image/png', 300, undefined, 'Nutrition helper')).toBe('Oats\nand milk')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(url).not.toContain(custom.apiKey)
    expect(init.credentials).toBe('omit')
    expect(init.redirect).toBe('error')
    if (apiFormat === 'gemini') {
      expect(url).toBe('https://gateway.example/models/test-model:generateContent')
      expect(init.headers).toMatchObject({ 'X-goog-api-key': custom.apiKey })
      expect(body.contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } })
      expect(body.systemInstruction.parts[0].text).toBe('Nutrition helper')
    } else {
      expect(init.headers).toMatchObject({ 'X-API-Key': custom.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' })
      expect(body.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' } })
      expect(body.system).toBe('Nutrition helper')
      expect(body.max_tokens).toBe(300)
    }
  })

  it('hides network diagnostics and rejects a credential URL before fetching', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('private key and endpoint diagnostics'))
    vi.stubGlobal('fetch', fetchMock)
    const custom: AISettings = { ...settings, provider: 'custom', accessMode: 'byok', endpointUrl: 'https://service.example/v1/chat/completions' }
    await expect(completeChat(custom, [{ role: 'user', content: 'meal' }])).rejects.toThrow('Could not reach your AI API.')
    fetchMock.mockClear()
    await expect(completeChat({ ...custom, endpointUrl: 'https://service.example/v1/chat/completions?key=private-key' }, [{ role: 'user', content: 'meal' }])).rejects.toThrow('Only an Azure api-version date')
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: custom.apiKey } }] })))
    await expect(completeChat(custom, [{ role: 'user', content: 'meal' }])).rejects.toThrow('unsafe response')
  })
})
